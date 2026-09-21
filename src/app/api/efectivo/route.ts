import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { obtenerTodasLasFacturas } from "@/lib/obtener-facturas";
import { movimientosDeFacturas, movimientosDeRetiradas, RetiradaEfectivoApi } from "@/lib/efectivo";

/**
 * Movimientos de la vista "Efectivo": cobros/devoluciones derivados de las
 * facturas y tickets con forma de pago Efectivo + retiradas de caja
 * registradas por un superadmin. `puedeRetirar` decide en el cliente si se
 * enseña el botón; la comprobación real está en las rutas POST y en el
 * backend.
 */
export async function GET() {
  try {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase() || "";
    const [facturas, retiradas] = await Promise.all([
      obtenerTodasLasFacturas(),
      kelatosApiGet<{ ok: boolean; retiradas: RetiradaEfectivoApi[] }>("/v1/lecturas/efectivo-retiradas"),
    ]);
    const movimientos = [...movimientosDeFacturas(facturas), ...movimientosDeRetiradas(retiradas.retiradas)];
    return NextResponse.json({ ok: true, movimientos, puedeRetirar: esSuperadmin(email) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
