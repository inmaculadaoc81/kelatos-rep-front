import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

/** Comprueba un número de resguardo para el asistente de voz: si existe (con cliente y equipo) y, si no, cuáles se le parecen. */
export async function GET(_req: Request, { params }: { params: Promise<{ n: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { n } = await params;
  if (!/^\d{3,8}$/.test(n)) return NextResponse.json({ ok: false, error: "Número de resguardo no válido" }, { status: 400 });
  try {
    return NextResponse.json(await kelatosApiGet<object>(`/v1/asistente-voz/resguardo/${n}`));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
