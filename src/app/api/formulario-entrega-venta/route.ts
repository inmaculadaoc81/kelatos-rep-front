import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { validarTokenEntregaVenta } from "@/lib/token-entrega-venta";

interface FilaVentaSql {
  venta_id: string;
  estado: string;
  cliente_nombre: string | null;
}
interface FilaItemVentaSql {
  descripcion: string | null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ventaId = searchParams.get("ventaId") || "";
  const token = searchParams.get("token") || "";

  const validacion = validarTokenEntregaVenta(ventaId, token);
  if (!validacion.valido) {
    return NextResponse.json({ ok: false, error: validacion.error }, { status: 403 });
  }

  try {
    const data = await kelatosApiGet<{ ok: boolean; venta: FilaVentaSql; items: FilaItemVentaSql[] }>(
      `/v1/lecturas/ventas/${encodeURIComponent(ventaId)}`
    );
    return NextResponse.json({
      ok: true,
      ventaId,
      nombre: data.venta.cliente_nombre || "",
      estado: data.venta.estado || "",
      items: (data.items || []).map((i) => i.descripcion).filter(Boolean),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const { ventaId, token, dni, firmaBase64 } = (await req.json()) as {
    ventaId: string; token: string; dni: string; firmaBase64?: string;
  };

  const validacion = validarTokenEntregaVenta(ventaId, token);
  if (!validacion.valido) {
    return NextResponse.json({ ok: false, error: validacion.error }, { status: 403 });
  }
  if (!dni?.trim()) return NextResponse.json({ ok: false, error: "El DNI/NIE/Pasaporte es obligatorio" }, { status: 400 });
  if (!firmaBase64 || firmaBase64.length <= 100) {
    return NextResponse.json({ ok: false, error: "La firma es obligatoria" }, { status: 400 });
  }

  try {
    const archivo = await kelatosApiPost<{ ok: boolean; firmaUrl: string }>(
      `/v1/ventas/${encodeURIComponent(ventaId)}/firma-entrega`,
      { firmaBase64 }
    );
    if (!archivo.firmaUrl) {
      return NextResponse.json({ ok: false, error: "No se pudo guardar la firma" }, { status: 502 });
    }

    const resultado = await kelatosApiPost<{ ok: boolean; venta: Record<string, unknown>; yaEntregado: boolean }>(
      `/v1/ventas/${encodeURIComponent(ventaId)}/entrega-publica`,
      {
        requestId: crypto.randomUUID(),
        usuario: "formulario-publico",
        dni: dni.trim(),
        firmaUrl: archivo.firmaUrl,
      }
    );

    return NextResponse.json({ ok: true, yaEntregado: resultado.yaEntregado });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
