import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { mapearAgentRun, mapearAgentStep } from "@/lib/agentes";

export async function GET(_req: Request, { params }: { params: Promise<{ runId: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { runId } = await params;
  try {
    const resultado = await kelatosApiGet<{
      ok: boolean;
      run: Parameters<typeof mapearAgentRun>[0];
      steps: Parameters<typeof mapearAgentStep>[0][];
    }>(`/v1/agentes/runs/${encodeURIComponent(runId)}`);
    return NextResponse.json({ ok: true, run: mapearAgentRun(resultado.run), steps: resultado.steps.map(mapearAgentStep) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
