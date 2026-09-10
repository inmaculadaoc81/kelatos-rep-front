import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { mapearEvento } from "@/lib/campanas";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  try {
    const r = await kelatosApiGet<{ ok: boolean; events: Record<string, unknown>[] }>(
      `/v1/campaigns/${encodeURIComponent(id)}/events`,
      { limit: 400 },
    );
    return NextResponse.json({ ok: true, events: r.events.map(mapearEvento) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 502 });
  }
}
