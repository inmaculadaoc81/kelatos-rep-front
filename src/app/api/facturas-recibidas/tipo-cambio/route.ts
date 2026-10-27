import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

export const dynamic = "force-dynamic";

export interface TipoCambioBce {
  moneda: string;
  fechaSolicitada: string;
  /** Fecha de la cotización usada (el último día hábil anterior si la fecha pedida fue festivo o fin de semana). */
  fechaTipo: string;
  /** Unidades de la moneda por 1 euro. */
  tipo: number;
  fuente: string;
}

/** Proxy de GET /v1/facturas-recibidas/tipo-cambio — tipo de referencia del BCE (el del conversor del Banco de España) de una moneda en una fecha. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const u = new URL(req.url);
  try {
    const r = await kelatosApiGet<TipoCambioBce & { ok: boolean }>("/v1/facturas-recibidas/tipo-cambio", {
      moneda: u.searchParams.get("moneda") || "",
      fecha: u.searchParams.get("fecha") || "",
    });
    return NextResponse.json({ ok: true, cambio: { moneda: r.moneda, fechaSolicitada: r.fechaSolicitada, fechaTipo: r.fechaTipo, tipo: r.tipo, fuente: r.fuente } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No se pudo consultar el tipo de cambio" }, { status: 502 });
  }
}
