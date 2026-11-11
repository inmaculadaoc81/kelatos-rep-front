import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { esSuperadmin } from "@/lib/superadmin";
import type { DetalleLlamada } from "@/lib/llamadas";

/** Detalle de una llamada con su transcripción — solo administradores. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!email || (session?.user?.role !== "admin" && !esSuperadmin(email))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  try {
    const data = await kelatosApiGet<{ ok: boolean; llamada: DetalleLlamada }>(`/v1/llamadas/${encodeURIComponent(id)}`, {});
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
