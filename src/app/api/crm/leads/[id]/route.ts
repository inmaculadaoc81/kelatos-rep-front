import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { puedeVerCrm, type Actividad, type Lead } from "@/lib/crm";

/** GET /api/crm/leads/[id] — ficha + línea de tiempo. PATCH — edita datos o mueve de etapa. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!puedeVerCrm(session?.user)) return NextResponse.json({ ok: false, error: "Sin acceso al CRM" }, { status: 403 });
  const { id } = await params;
  try {
    const data = await kelatosApiGet<{ ok: boolean; lead: Lead; actividades: Actividad[] }>(`/v1/crm/leads/${encodeURIComponent(id)}`);
    return NextResponse.json({ ok: true, lead: data.lead, actividades: data.actividades });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!puedeVerCrm(session?.user)) return NextResponse.json({ ok: false, error: "Sin acceso al CRM" }, { status: 403 });
  const { id } = await params;
  const cuerpo = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    await kelatosApiPost(`/v1/crm/leads/${encodeURIComponent(id)}`, { ...cuerpo, usuario: session?.user?.email }, "PATCH");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 400 });
  }
}
