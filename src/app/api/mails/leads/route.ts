import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { accesoMails } from "@/lib/mails-auth";
import type { KpisLeads, LeadLista } from "@/lib/mails";

const PARAMETROS = ["estado", "q", "grupo", "paso", "orden", "limit", "offset"];

/** Lista paginada de leads con sus KPIs por estado y sus envíos/respuestas. */
export async function GET(req: Request) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  try {
    const p = new URL(req.url).searchParams;
    const params: Record<string, string> = {};
    for (const k of PARAMETROS) {
      const v = p.get(k);
      if (v) params[k] = v;
    }
    const data = await kelatosApiGet<{ ok: boolean; total: number; kpis: KpisLeads; leads: LeadLista[] }>("/v1/mails/leads", params);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
