import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { accesoMails, buzonesPropios } from "@/lib/mails-auth";
import { CONTADORES_VACIOS, type ContadoresMensajes, type MensajeLista } from "@/lib/mails";

const PARAMETROS = ["vista", "buzon", "sinLeer", "agrupar", "q", "cliente", "lead", "email", "limit", "offset"];

/** Lista paginada de mensajes (sin cuerpo) + contadores. Filtra el servidor.
    Una cuenta accesoCompleto nunca puede pedir "todos los buzones" ni el
    buzón de otra cuenta: el parámetro `buzon` que mande el cliente se
    ignora y se fuerza al suyo propio (petición del usuario, 2026-09-30). */
export async function GET(req: Request) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  try {
    const propios = await buzonesPropios(a);
    if (propios && propios.length === 0) {
      return NextResponse.json({ ok: true, total: 0, contadores: CONTADORES_VACIOS, mensajes: [] });
    }
    const p = new URL(req.url).searchParams;
    const params: Record<string, string> = {};
    for (const k of PARAMETROS) {
      const v = p.get(k);
      if (v) params[k] = v;
    }
    if (propios) params.buzon = String(propios[0]);
    const data = await kelatosApiGet<{ ok: boolean; total: number; contadores: ContadoresMensajes; mensajes: MensajeLista[] }>("/v1/mails/mensajes", params);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
