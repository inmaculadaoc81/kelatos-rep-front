import { NextResponse } from "next/server";
import { auth, esDominioKelatos } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiPost } from "@/lib/kelatos-api";

function esManager(email: string | null | undefined, role: string | undefined) {
  return !!email && esDominioKelatos(email) && (role === "admin" || esSuperadmin(email));
}

export async function PUT(req: Request, { params }: { params: Promise<{ deviceId: string }> }) {
  const session = await auth();
  if (!esManager(session?.user?.email, session?.user?.role)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }
  const { deviceId } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const data = await kelatosApiPost<Record<string, unknown>>(
      `/v1/asistencia/admin/remote-workers/${encodeURIComponent(deviceId)}/status`,
      { status: body?.status, usuario: session?.user?.email },
      "PUT",
    );
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error" }, { status: 502 });
  }
}
