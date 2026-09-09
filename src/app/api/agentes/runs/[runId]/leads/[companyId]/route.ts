import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

export async function PATCH(req: Request, { params }: { params: Promise<{ runId: string; companyId: string }> }) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { runId, companyId } = await params;
  const { status } = (await req.json()) as { status: "approved" | "rejected" };
  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ ok: false, error: "status debe ser approved o rejected" }, { status: 400 });
  }

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; mensaje: { id: number; status: string } }>(
      `/v1/agentes/runs/${encodeURIComponent(runId)}/leads/${encodeURIComponent(companyId)}`,
      { status, usuario },
      "PATCH"
    );
    return NextResponse.json({ ok: true, mensaje: resultado.mensaje });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
