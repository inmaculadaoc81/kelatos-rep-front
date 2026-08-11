import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { tipoPermiteMarcarCobrada, type TipoFactura } from "@/lib/facturas-cliente";

/**
 * Reproduce _fcMarcarCobrada() del original — el único cambio de estado que
 * se puede hacer desde la lista de Facturas de Clientes (el resto de
 * acciones del modal original: rectificativa/corregida/devolución/email
 * quedan fuera de esta réplica). Usa el PATCH genérico /v1/:table/:id ya
 * existente en el backend — no hace falta ninguna ruta nueva.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const resguardo = typeof body?.resguardo === "string" ? body.resguardo : "";
    const tipo = typeof body?.tipo === "string" ? (body.tipo as TipoFactura) : undefined;
    if (!resguardo || !tipo || !tipoPermiteMarcarCobrada(tipo)) {
      return NextResponse.json({ ok: false, error: "Petición inválida" }, { status: 400 });
    }

    if (tipo === "reparacion" || tipo === "revision") {
      const campo = tipo === "reparacion" ? "estado_factura" : "estado_factura_revision";
      await kelatosApiPost(`/v1/reparaciones/${encodeURIComponent(resguardo)}`, { [campo]: "Cobrada" }, "PATCH");
    } else {
      const campo = tipo === "alquiler" ? "estado_factura" : "estado_factura_recogida";
      await kelatosApiPost(`/v1/alquileres/${encodeURIComponent(resguardo)}`, { [campo]: "Cobrada" }, "PATCH");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
