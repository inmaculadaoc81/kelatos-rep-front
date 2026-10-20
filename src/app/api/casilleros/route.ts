import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import type { Casillero } from "@/lib/casilleros";

/** GET /api/casilleros — todos los casilleros con los equipos que hay dentro. POST — crea uno nuevo. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  try {
    const data = await kelatosApiGet<{ ok: boolean; casilleros: Casillero[] }>("/v1/casilleros");
    return NextResponse.json({ ok: true, casilleros: data.casilleros });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const cuerpo = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const data = await kelatosApiPost<{ ok: boolean; id: number }>("/v1/casilleros", cuerpo);
    return NextResponse.json({ ok: true, id: data.id });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
