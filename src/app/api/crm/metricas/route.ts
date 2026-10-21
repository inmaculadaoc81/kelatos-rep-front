import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { puedeVerCrm, type MetricasCrm } from "@/lib/crm";

/** GET /api/crm/metricas?dias=7|30|90|365 — KPIs y desgloses del embudo (leads creados en ese periodo). */
export async function GET(req: Request) {
  const session = await auth();
  if (!puedeVerCrm(session?.user)) return NextResponse.json({ ok: false, error: "Sin acceso al CRM" }, { status: 403 });
  const dias = new URL(req.url).searchParams.get("dias") ?? "30";
  try {
    const data = await kelatosApiGet<{ ok: boolean } & MetricasCrm>("/v1/crm/metricas", { dias });
    const { ok, ...resto } = data;
    void ok;
    return NextResponse.json({ ok: true, ...resto });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
