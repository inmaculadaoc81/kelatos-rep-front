import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { puedeVerCrm } from "@/lib/crm";
import { tienePermiso } from "@/lib/permisos";

type Params = { params: Promise<{ id: string }> };

/** Cambia el estado y/o las notas de un diagnóstico; la identidad sale de la sesión. */
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!(await tienePermiso(session?.user?.email, "crm.ver", puedeVerCrm(session?.user)))) return NextResponse.json({ ok: false, error: "Sin acceso al CRM" }, { status: 403 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { estado?: string; notas?: string };
  try {
    return NextResponse.json(await kelatosApiPost(`/v1/n8nlabs/diagnosticos/${encodeURIComponent(id)}`, { estado: body.estado, notas: body.notas, usuario: session?.user?.email }, "PATCH"));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 400 });
  }
}
