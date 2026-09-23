import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";

/** Carpetas de Drive ("Stock" y "Compras de servicio") de la importación automática. */
export async function GET() {
  try {
    const data = await kelatosApiGet<{ ok: boolean; carpetas: { stock: { url: string }; servicio: { url: string } } }>("/v1/facturas-recibidas/carpetas-drive");
    return NextResponse.json({ ok: true, carpetas: data.carpetas });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
