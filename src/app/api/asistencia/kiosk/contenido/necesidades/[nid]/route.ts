import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { puedeVerContenido } from "@/lib/contenido-acceso";

export async function DELETE(_req: Request, { params }: { params: Promise<{ nid: string }> }) {
  const session = await auth();
  if (!puedeVerContenido(session)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const { nid } = await params;
  try {
    return NextResponse.json(await kelatosApiPost(`/v1/contenido/necesidades/${encodeURIComponent(nid)}`, undefined, "DELETE"));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 400 });
  }
}
