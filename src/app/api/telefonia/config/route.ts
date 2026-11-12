import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

/** ¿Está activada la telefonía del dashboard? (la pantalla decide si enseña el teléfono o el enlace «tel:»). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, activo: false }, { status: 401 });
  try {
    const d = await kelatosApiGet<{ activo: boolean; numero: string | null }>("/v1/llamadas/config");
    return NextResponse.json({ ok: true, activo: !!d.activo, numero: d.numero });
  } catch {
    return NextResponse.json({ ok: true, activo: false, numero: null });
  }
}
