import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiPost } from "@/lib/kelatos-api";

// Editar nombre/email/dni y activar/desactivar — mismo motivo que el
// POST de creación: restringido a superadmin, no a cualquier manager.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!esSuperadmin(session?.user?.email)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  try {
    const data = await kelatosApiPost(`/v1/asistencia/admin/empleados/${id}`, body, "PATCH");
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
