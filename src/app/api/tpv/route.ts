import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { obtenerTodasLasFacturas } from "@/lib/obtener-facturas";
import { segunSistemaPorDia, movimientosDeTpv, TpvImporteApi, TpvFotoApi } from "@/lib/tpv";

/**
 * Datos de la vista "TPV": lo que calcula el sistema por día+método (de
 * TODAS las facturas/tickets, no solo efectivo) + lo que el personal ha
 * declarado a mano (kelatos_app.tpv_importes) + las fotos de cierre
 * subidas (kelatos_app.tpv_fotos, solo metadatos). Visible para cualquier
 * empleado con sesión — a diferencia de "Efectivo" no hay acciones
 * restringidas a superadmin: quien cierra la tienda ese día es quien
 * rellena el parte.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    const [facturas, importesResp, fotosResp] = await Promise.all([
      obtenerTodasLasFacturas(),
      kelatosApiGet<{ ok: boolean; importes: TpvImporteApi[] }>("/v1/lecturas/tpv-importes"),
      kelatosApiGet<{ ok: boolean; fotos: TpvFotoApi[] }>("/v1/lecturas/tpv-fotos"),
    ]);
    const segunSistema = segunSistemaPorDia(facturas);
    const movimientos = movimientosDeTpv(facturas);
    return NextResponse.json({ ok: true, segunSistema, movimientos, importes: importesResp.importes, fotos: fotosResp.fotos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
