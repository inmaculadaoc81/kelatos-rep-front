import { NextResponse } from "next/server";
import { auth, esDominioKelatos } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiPost } from "@/lib/kelatos-api";

function esManager(email: string | null | undefined, role: string | undefined) {
  return !!email && esDominioKelatos(email) && (role === "admin" || esSuperadmin(email));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!esManager(session?.user?.email, session?.user?.role)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  try {
    return NextResponse.json(await kelatosApiPost(`/v1/asistencia/admin/empleados/${id}/calendario`, body, "PATCH"));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
