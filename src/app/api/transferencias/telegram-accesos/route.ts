import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { puedeGestionarAccesosTelegram } from "@/lib/superadmin";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";

/** Lista de accesos de Telegram (quién sube comprobantes y con qué rol). Solo kelatosclaude2. */
export async function GET() {
  const session = await auth();
  if (!puedeGestionarAccesosTelegram(session?.user?.email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  try {
    return NextResponse.json(await kelatosApiGet("/v1/transferencias/telegram-accesos"));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

/** Añade un acceso o cambia el rol, nombre o estado de uno existente. */
export async function POST(req: Request) {
  const session = await auth();
  if (!puedeGestionarAccesosTelegram(session?.user?.email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    return NextResponse.json(await kelatosApiPost("/v1/transferencias/telegram-accesos", { ...body, usuario: session?.user?.email }));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 400 });
  }
}
