import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { esSuperadmin } from "@/lib/superadmin";

/** Marca una valoración como atendida (o la reabre). Solo administradores. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!email || (session?.user?.role !== "admin" && !esSuperadmin(email))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const b = (await req.json()) as { atendido?: unknown; nota?: unknown };
    await kelatosApiPost(`/v1/encuestas-formularios/${encodeURIComponent(id)}`, { atendido: b.atendido, nota: b.nota, usuario: email }, "PATCH");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
