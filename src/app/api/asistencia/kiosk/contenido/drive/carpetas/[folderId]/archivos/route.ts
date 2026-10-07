import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { puedeVerContenido } from "@/lib/contenido-acceso";

export async function GET(_req: Request, { params }: { params: Promise<{ folderId: string }> }) {
  const session = await auth();
  if (!puedeVerContenido(session)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const { folderId } = await params;
  try {
    const data = await kelatosApiGet(`/v1/contenido/drive/carpetas/${encodeURIComponent(folderId)}/archivos`);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
