import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

export async function POST(_req: Request, { params }: { params: Promise<{ runId: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { runId } = await params;
  try {
    const resultado = await kelatosApiPost<{ ok: boolean; status: string }>(`/v1/agentes/runs/${encodeURIComponent(runId)}/cancel`, {});
    return NextResponse.json({ ok: true, status: resultado.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
