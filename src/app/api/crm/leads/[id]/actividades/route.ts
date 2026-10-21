import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { puedeVerCrm } from "@/lib/crm";

/** POST /api/crm/leads/[id]/actividades — anota una llamada, mensaje, correo o nota en la ficha. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!puedeVerCrm(session?.user)) return NextResponse.json({ ok: false, error: "Sin acceso al CRM" }, { status: 403 });
  const { id } = await params;
  const cuerpo = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    await kelatosApiPost(`/v1/crm/leads/${encodeURIComponent(id)}/actividades`, { ...cuerpo, usuario: session?.user?.email });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 400 });
  }
}
