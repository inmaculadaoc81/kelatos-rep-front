import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

/** Descarga un adjunto (foto o PDF) de una solicitud. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; aid: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const { id, aid } = await params;
  try {
    const a = await kelatosApiGet<{ ok: boolean; nombre: string; tipo: string; base64: string }>(`/v1/reciclaje/solicitudes/${encodeURIComponent(id)}/adjuntos/${encodeURIComponent(aid)}`);
    const cuerpo = Buffer.from(a.base64, "base64");
    return new NextResponse(cuerpo, {
      headers: {
        "Content-Type": a.tipo === "application/pdf" ? "application/pdf" : "image/jpeg",
        "Content-Disposition": `inline; filename="${a.nombre.replace(/[^\w.\- ]/g, "_")}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
