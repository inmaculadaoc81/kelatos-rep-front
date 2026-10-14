import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

export const dynamic = "force-dynamic";

/** Texto acumulado y estado de una respuesta del asistente (ver POST /api/asistente). */
export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { jobId } = await params;
  if (!/^[A-Za-z0-9-]{8,64}$/.test(jobId)) return NextResponse.json({ ok: false, error: "Identificador no válido" }, { status: 400 });

  try {
    const d = await kelatosApiGet<{ ok: boolean; estado: "procesando" | "listo" | "error"; texto: string; error: string | null }>(
      `/v1/asistente/chat/${encodeURIComponent(jobId)}`
    );
    return NextResponse.json({ ok: true, estado: d.estado, texto: d.texto ?? "", error: d.error });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No se pudo consultar la respuesta" }, { status: 502 });
  }
}
