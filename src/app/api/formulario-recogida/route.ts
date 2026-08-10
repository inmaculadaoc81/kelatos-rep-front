import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { validarTokenRecogida } from "@/lib/token-recogida";

// La firma se captura visualmente en el formulario, pero esta migración no
// tiene integración con Google Drive (donde el original guarda la imagen)
// — firmaUrl es un campo obligatorio en el endpoint real, así que se envía
// este marcador explícito en vez de fingir una URL de archivo inexistente.
const FIRMA_URL_MARCADOR = "[Firma capturada sin adjunto — integración con Drive pendiente]";

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
  const { resguardo, token, nombre } = (await req.json()) as { resguardo: string; token: string; nombre: string };

  const validacion = validarTokenRecogida(resguardo, token);
  if (!validacion.valido) {
    return NextResponse.json({ ok: false, error: validacion.error }, { status: 403 });
  }
  if (!nombre?.trim()) return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; reparacion: Record<string, unknown>; yaEntregado: boolean }>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/recogida-publica`,
      {
        requestId: crypto.randomUUID(),
        usuario: "formulario-publico",
        firmaUrl: FIRMA_URL_MARCADOR,
        fecha: new Date().toISOString().slice(0, 10),
      }
    );

    return NextResponse.json({ ok: true, yaEntregado: resultado.yaEntregado });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
