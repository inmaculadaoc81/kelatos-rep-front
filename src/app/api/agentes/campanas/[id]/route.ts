import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { mapearCampaign } from "@/lib/campanas";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  try {
    const r = await kelatosApiGet<{ ok: boolean; campaign: Record<string, unknown>; progress: Record<string, number> }>(
      `/v1/campaigns/${encodeURIComponent(id)}`,
    );
    return NextResponse.json({ ok: true, campaign: mapearCampaign(r.campaign), progress: r.progress ?? {} });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 502 });
  }
}
