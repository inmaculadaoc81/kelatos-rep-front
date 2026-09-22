import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { accesoMails } from "@/lib/mails-auth";
import type { DireccionInvalida } from "@/lib/mails";

const PARAMETROS = ["q", "estado", "origen", "limit", "offset"];

/** Lista paginada de direcciones inválidas (rebotadas o marcadas a mano). */
export async function GET(req: Request) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  try {
    const p = new URL(req.url).searchParams;
    const params: Record<string, string> = {};
    for (const k of PARAMETROS) {
      const v = p.get(k);
      if (v) params[k] = v;
    }
    const data = await kelatosApiGet<{ ok: boolean; total: number; activas: number; manuales: number; direcciones: DireccionInvalida[] }>(
      "/v1/mails/direcciones",
      params
    );
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
