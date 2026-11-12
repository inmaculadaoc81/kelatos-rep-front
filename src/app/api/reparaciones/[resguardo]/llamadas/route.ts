import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

/** Registro de llamadas de una reparación (fecha, hora, quién, duración, estado). Cualquier usuario con sesión; sin transcripción ni audio. */
export async function GET(_req: Request, { params }: { params: Promise<{ resguardo: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { resguardo } = await params;
  try {
    const d = await kelatosApiGet<{ llamadas: unknown[] }>(`/v1/llamadas/por-resguardo/${encodeURIComponent(resguardo)}`);
    return NextResponse.json({ ok: true, llamadas: d.llamadas });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
