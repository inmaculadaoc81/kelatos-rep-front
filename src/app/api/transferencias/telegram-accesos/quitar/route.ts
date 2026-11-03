import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { puedeGestionarAccesosTelegram } from "@/lib/superadmin";
import { kelatosApiPost } from "@/lib/kelatos-api";

export async function POST(req: Request) {
  const session = await auth();
  if (!puedeGestionarAccesosTelegram(session?.user?.email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    return NextResponse.json(await kelatosApiPost("/v1/transferencias/telegram-accesos/quitar", { telegram_id: body.telegram_id, usuario: session?.user?.email }));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 400 });
  }
}
