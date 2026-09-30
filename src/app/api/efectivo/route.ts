import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { obtenerTodasLasFacturas } from "@/lib/obtener-facturas";
import { movimientosDeFacturas, movimientosDeRetiradas, movimientosDeConteos, RetiradaEfectivoApi, ConteoEfectivoApi } from "@/lib/efectivo";

/**
 * Movimientos de la vista "Efectivo": cobros/devoluciones derivados de las
 * facturas y tickets con forma de pago Efectivo + retiradas de caja +
 * conteos físicos (verificación caja vs. sistema, no mueven dinero) —
 * ambos registrados por un superadmin. `puedeRetirar` decide en el cliente
 * si se enseñan los botones de "Retirar efectivo"/"Hacer conteo"; la
 * comprobación real está en las rutas POST y en el backend.
 */
export async function GET() {
  try {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase() || "";
    const [facturas, retiradas, conteos] = await Promise.all([
      obtenerTodasLasFacturas({ soloEfectivo: true }),
      kelatosApiGet<{ ok: boolean; retiradas: RetiradaEfectivoApi[] }>("/v1/lecturas/efectivo-retiradas"),
      kelatosApiGet<{ ok: boolean; conteos: ConteoEfectivoApi[] }>("/v1/lecturas/efectivo-conteos"),
    ]);
    const movimientos = [...movimientosDeFacturas(facturas), ...movimientosDeRetiradas(retiradas.retiradas), ...movimientosDeConteos(conteos.conteos)];
    return NextResponse.json({ ok: true, movimientos, puedeRetirar: esSuperadmin(email) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
