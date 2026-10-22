import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { puedeVerCrm, type CanalesCrm } from "@/lib/crm";

/** GET /api/crm/canales — cifras por canal (WhatsApp, llamadas, web) para el panel y los KPIs de cada vista. */
export async function GET() {
  const session = await auth();
  if (!puedeVerCrm(session?.user)) return NextResponse.json({ ok: false, error: "Sin acceso al CRM" }, { status: 403 });
  try {
    const data = await kelatosApiGet<{ ok: boolean } & CanalesCrm>("/v1/crm/canales");
    return NextResponse.json({ ok: true, canales: data.canales, porDia: data.porDia });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
