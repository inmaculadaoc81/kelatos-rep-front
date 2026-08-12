import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

interface FacturaAsignada {
  resguardo: string;
  numeroFactura: string;
  urlFactura: string;
}

interface RespuestaSincronizarGmail {
  ok: boolean;
  asignadas: number;
  omitidas: number;
  sinMatch: number;
  facturasAsignadas: FacturaAsignada[];
}

/**
 * Reproduce apiSincronizarFacturas() — botón "Sync Facturas" del
 * Historial. Requiere que el backend tenga GOOGLE_GMAIL_REFRESH_TOKEN
 * configurado (scope gmail.readonly) — sin él, kelatos-api responde con
 * un error genérico que este endpoint reenvía tal cual al frontend.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    const resultado = await kelatosApiPost<RespuestaSincronizarGmail>("/v1/facturas/sincronizar-gmail", {});
    return NextResponse.json({
      ok: true,
      asignadas: resultado.asignadas,
      omitidas: resultado.omitidas,
      sinMatch: resultado.sinMatch,
      facturasAsignadas: resultado.facturasAsignadas,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
