import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { mapearImportacion, type FilaImportacionSql } from "@/lib/importaciones";

/** Sube el documento aduanero (PDF/imagen) a Drive; el frontend lo manda en base64. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json()) as { base64?: string; mimeType?: string; nombre?: string };
  if (!body.base64 || !body.mimeType) return NextResponse.json({ ok: false, error: "Faltan datos del archivo" }, { status: 400 });
  try {
    const data = await kelatosApiPost<{ ok: boolean; importacion: FilaImportacionSql }>(`/v1/importaciones/${encodeURIComponent(id)}/archivo`, body);
    return NextResponse.json({ ok: true, importacion: mapearImportacion(data.importacion) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
