import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { accesoMails } from "@/lib/mails-auth";

const PARAMETROS = ["clasificacion", "estado", "revision", "q", "limit", "offset"];

/** Lista de respuestas de formularios web analizados por la automatización (modo sombra), con indicadores. */
export async function GET(req: Request) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  if (a.accesoCompleto) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  try {
    const p = new URL(req.url).searchParams;
    const params: Record<string, string> = {};
    for (const k of PARAMETROS) {
      const v = p.get(k);
      if (v) params[k] = v;
    }
    const data = await kelatosApiGet<unknown>("/v1/mails/respuestas-formularios", params);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
