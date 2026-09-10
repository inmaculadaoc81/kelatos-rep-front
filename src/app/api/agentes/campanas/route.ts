import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapearCampaign } from "@/lib/campanas";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  try {
    const r = await kelatosApiGet<{ ok: boolean; campaigns: Record<string, unknown>[] }>("/v1/campaigns", { limit: 100 });
    return NextResponse.json({ ok: true, campaigns: r.campaigns.map(mapearCampaign) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  try {
    const body = await req.json();
    const r = await kelatosApiPost<{ ok: boolean; campaign: Record<string, unknown> }>("/v1/campaigns", {
      ...body,
      usuario: session.user.email,
    });
    return NextResponse.json({ ok: true, campaign: mapearCampaign(r.campaign) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 502 });
  }
}
