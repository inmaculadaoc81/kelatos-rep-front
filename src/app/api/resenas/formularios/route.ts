import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { esSuperadmin } from "@/lib/superadmin";
import type { ReporteValoraciones } from "@/lib/resenas";

const PARAMETROS = ["q", "atendido", "limit", "offset"];

/** Valoraciones recibidas por el formulario público — solo administradores. */
export async function GET(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!email || (session?.user?.role !== "admin" && !esSuperadmin(email))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }
  try {
    const p = new URL(req.url).searchParams;
    const params: Record<string, string> = {};
    for (const k of PARAMETROS) {
      const v = p.get(k);
      if (v) params[k] = v;
    }
    const data = await kelatosApiGet<ReporteValoraciones>("/v1/encuestas-formularios", params);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
