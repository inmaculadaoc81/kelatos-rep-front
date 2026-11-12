import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { esSuperadmin } from "@/lib/superadmin";
import type { ListadoLlamadas } from "@/lib/llamadas";

const PARAMETROS = ["q", "usuario", "origen", "direccion", "estado", "desde", "hasta", "conTranscripcion", "duracionMin", "duracionMax", "limit", "offset"];

/** Listado de llamadas — solo superadmins (repetido aquí y en src/proxy.ts). */
export async function GET(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!esSuperadmin(email)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }
  try {
    const p = new URL(req.url).searchParams;
    const params: Record<string, string> = {};
    for (const k of PARAMETROS) {
      const v = p.get(k);
      if (v) params[k] = v;
    }
    const data = await kelatosApiGet<ListadoLlamadas>("/v1/llamadas", params);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
