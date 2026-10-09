import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { obtenerTodasLasFacturas } from "@/lib/obtener-facturas";
import { vendidoConTarjetaPorDia, TarjetasImporteApi } from "@/lib/tarjetas";

/**
 * Datos de la vista "Tarjetas": lo que calcula el sistema por día (tarjeta +
 * tarjeta virtual, sumadas) + lo que el personal ha anotado a mano que
 * confirma el banco (kelatos_app.tarjetas_importes). Visible para cualquier
 * empleado con sesión, igual que TPV — no restringido a superadmin.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    const [facturas, importesResp] = await Promise.all([
      obtenerTodasLasFacturas(),
      kelatosApiGet<{ ok: boolean; importes: TarjetasImporteApi[] }>("/v1/lecturas/tarjetas-importes"),
    ]);
    const segunSistema = vendidoConTarjetaPorDia(facturas);
    return NextResponse.json({ ok: true, segunSistema, importes: importesResp.importes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
