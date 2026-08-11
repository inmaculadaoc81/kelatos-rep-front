import { NextResponse } from "next/server";
import { obtenerTodasLasFacturas } from "@/lib/obtener-facturas";

export async function GET() {
  try {
    const facturas = await obtenerTodasLasFacturas();
    return NextResponse.json({ ok: true, facturas });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
