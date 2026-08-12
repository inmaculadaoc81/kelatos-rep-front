import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { validarTokenRecogida } from "@/lib/token-recogida";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const resguardo = searchParams.get("resguardo") || "";
  const token = searchParams.get("token") || "";

  const validacion = validarTokenRecogida(resguardo, token);
  if (!validacion.valido) {
    return NextResponse.json({ ok: false, error: validacion.error }, { status: 403 });
  }

  try {
    const data = await kelatosApiGet<{ ok: boolean; row: Record<string, unknown> }>(`/v1/reparaciones/${encodeURIComponent(resguardo)}`);
    const row = data.row;
    return NextResponse.json({
      ok: true,
      resguardo,
      equipo: row.equipo_modelo || "",
      nombre: row.cliente_nombre || "",
      estadoEntrega: row.estado_entrega || "PENDIENTE",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const { resguardo, token, nombre, firmaBase64 } = (await req.json()) as {
    resguardo: string; token: string; nombre: string; firmaBase64?: string;
  };

  const validacion = validarTokenRecogida(resguardo, token);
  if (!validacion.valido) {
    return NextResponse.json({ ok: false, error: validacion.error }, { status: 403 });
  }
  if (!nombre?.trim()) return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });
  if (!firmaBase64 || firmaBase64.length <= 100) {
    return NextResponse.json({ ok: false, error: "La firma es obligatoria" }, { status: 400 });
  }

  try {
    // Sube la firma a la misma carpeta de Drive que usa el formulario de
    // recepción (fotos/firmas de clientes) — devuelve el fileId real, no
    // un marcador, para que firma_recogida_url apunte a un archivo real.
    const archivos = await kelatosApiPost<{ ok: boolean; firmaUrl: string }>(
      `/v1/formulario/${encodeURIComponent(resguardo)}/archivos`,
      { firmaBase64 }
    );
    if (!archivos.firmaUrl) {
      return NextResponse.json({ ok: false, error: "No se pudo guardar la firma" }, { status: 502 });
    }

    const resultado = await kelatosApiPost<{ ok: boolean; reparacion: Record<string, unknown>; yaEntregado: boolean }>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/recogida-publica`,
      {
        requestId: crypto.randomUUID(),
        usuario: "formulario-publico",
        firmaUrl: archivos.firmaUrl,
        fecha: new Date().toISOString().slice(0, 10),
      }
    );

    return NextResponse.json({ ok: true, yaEntregado: resultado.yaEntregado });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
