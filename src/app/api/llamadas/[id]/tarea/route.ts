import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { esSuperadmin } from "@/lib/superadmin";

/** Crea una tarea (módulo Tareas) a partir de un acuerdo de la llamada — solo superadmins. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!esSuperadmin(email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as { titulo?: string; plazo?: string | null; asignadoA?: string | null };
  try {
    return NextResponse.json(await kelatosApiPost(`/v1/llamadas/${encodeURIComponent(id)}/tarea`, { titulo: b.titulo, plazo: b.plazo, asignadoA: b.asignadoA, usuario: email }));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
