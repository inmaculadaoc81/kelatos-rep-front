import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { puedeVerCrm, type Lead } from "@/lib/crm";

/** GET /api/crm/leads — lista con filtros (q, etapa, origen, responsable, vencidas). POST — crea un lead. */
export async function GET(req: Request) {
  const session = await auth();
  if (!puedeVerCrm(session?.user)) return NextResponse.json({ ok: false, error: "Sin acceso al CRM" }, { status: 403 });
  const sp = new URL(req.url).searchParams;
  const params: Record<string, string> = {};
  for (const k of ["q", "etapa", "origen", "responsable", "vencidas", "inactivos", "bandeja", "categoria"]) {
    const v = sp.get(k);
    if (v) params[k] = v;
  }
  try {
    const data = await kelatosApiGet<{ ok: boolean; leads: Lead[] }>("/v1/crm/leads", params);
    return NextResponse.json({ ok: true, leads: data.leads });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!puedeVerCrm(session?.user)) return NextResponse.json({ ok: false, error: "Sin acceso al CRM" }, { status: 403 });
  const cuerpo = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const data = await kelatosApiPost<{ ok: boolean; id: number }>("/v1/crm/leads", { ...cuerpo, usuario: session?.user?.email });
    return NextResponse.json({ ok: true, id: data.id });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 409 });
  }
}
