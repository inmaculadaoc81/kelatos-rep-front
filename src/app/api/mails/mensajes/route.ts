import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { accesoMails } from "@/lib/mails-auth";
import type { ContadoresMensajes, MensajeLista } from "@/lib/mails";

const PARAMETROS = ["buzon", "direccion", "rebote", "sinLeer", "q", "cliente", "limit", "offset"];

/** Lista paginada de mensajes (sin cuerpo) + contadores. Filtra el servidor. */
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
    const data = await kelatosApiGet<{ ok: boolean; total: number; contadores: ContadoresMensajes; mensajes: MensajeLista[] }>("/v1/mails/mensajes", params);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
