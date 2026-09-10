import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import type { CampaignBudget } from "@/lib/campanas";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  try {
    const r = await kelatosApiGet<{ ok: boolean } & Record<string, unknown>>(
      `/v1/campaigns/${encodeURIComponent(id)}/budget`,
    );
    const budget: CampaignBudget = {
      maxCostUsd: Number(r.maxCostUsd ?? 0),
      costUsd: Number(r.costUsd ?? 0),
      remainingUsd: Number(r.remainingUsd ?? 0),
      byResource: (r.byResource as CampaignBudget["byResource"]) ?? [],
    };
    return NextResponse.json({ ok: true, budget });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 502 });
  }
}
