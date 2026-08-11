import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import type { WebhookEvento } from "@/lib/webhook-eventos";

/** GET — lista de eventos del webhook de presupuestos, para el panel de notificaciones. */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const url = new URL(request.url);
  const leida = url.searchParams.get("leida") ?? undefined;
  const porPagina = url.searchParams.get("porPagina") ?? undefined;

  try {
    const data = await kelatosApiGet<{ ok: boolean; eventos: WebhookEvento[]; no_leidas: number }>(
      "/v1/lecturas/webhook-eventos",
      { leida, porPagina }
    );
    return NextResponse.json({ ok: true, eventos: data.eventos, noLeidas: data.no_leidas });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
