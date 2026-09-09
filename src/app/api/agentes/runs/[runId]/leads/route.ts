import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { mapearAgentLead } from "@/lib/agentes";

export async function GET(_req: Request, { params }: { params: Promise<{ runId: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { runId } = await params;
  try {
    const resultado = await kelatosApiGet<{ ok: boolean; leads: Parameters<typeof mapearAgentLead>[0][] }>(
      `/v1/agentes/runs/${encodeURIComponent(runId)}/leads`
    );
    return NextResponse.json({ ok: true, leads: resultado.leads.map(mapearAgentLead) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
