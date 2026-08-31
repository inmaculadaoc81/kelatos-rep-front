import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiPost } from "@/lib/kelatos-api";

// Igual que crear/editar empleados: restringido a superadmin, no a
// cualquier manager — establecer contraseñas es un cambio de acceso real.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!esSuperadmin(session?.user?.email)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  try {
    const data = await kelatosApiPost(`/v1/asistencia/admin/empleados/${id}/password`, body, "POST");
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
