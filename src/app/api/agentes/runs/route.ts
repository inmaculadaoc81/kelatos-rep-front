import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapearAgentRun } from "@/lib/agentes";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  try {
    const resultado = await kelatosApiGet<{ ok: boolean; runs: Parameters<typeof mapearAgentRun>[0][] }>("/v1/agentes/runs", {
      agentType: searchParams.get("agentType") || undefined,
      status: searchParams.get("status") || undefined,
      limit: searchParams.get("limit") || undefined,
    });
    return NextResponse.json({ ok: true, runs: resultado.runs.map(mapearAgentRun) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { agentType, goal, input } = (await req.json()) as { agentType: string; goal: string; input?: Record<string, unknown> };
  if (!agentType?.trim()) return NextResponse.json({ ok: false, error: "agentType es obligatorio" }, { status: 400 });
  if (!goal?.trim()) return NextResponse.json({ ok: false, error: "goal es obligatorio" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; runId: number; status: string }>("/v1/agentes/runs", {
      agentType: agentType.trim(),
      goal: goal.trim(),
      input: input || {},
      usuario,
    });
    return NextResponse.json({ ok: true, runId: resultado.runId, status: resultado.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
