import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { obtenerTodasLasFacturas } from "@/lib/obtener-facturas";
import { movimientosDeTarjetas, TarjetasImporteApi } from "@/lib/tarjetas";

/**
 * Datos de la vista "Tarjetas": el libro de movimientos (cobros/devoluciones
 * pagados con tarjeta, derivado de facturas/tickets — igual que
 * GET /api/efectivo) + lo que el personal ha anotado a mano que confirma el
 * banco por día (kelatos_app.tarjetas_importes). Visible para cualquier
 * empleado con sesión.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    const [facturas, importesResp] = await Promise.all([
      obtenerTodasLasFacturas(),
      kelatosApiGet<{ ok: boolean; importes: TarjetasImporteApi[] }>("/v1/lecturas/tarjetas-importes"),
    ]);
    const movimientos = movimientosDeTarjetas(facturas);
    return NextResponse.json({ ok: true, movimientos, importesBanco: importesResp.importes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
