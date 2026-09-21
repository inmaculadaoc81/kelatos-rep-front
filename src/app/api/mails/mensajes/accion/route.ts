import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { accesoMails } from "@/lib/mails-auth";

/** Leído/no leído, destacar, archivar, papelera y restaurar. Son cambios locales del app: el buzón real no se toca. */
export async function POST(req: Request) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  try {
    const b = (await req.json()) as { ids?: unknown; accion?: unknown; conHilo?: unknown };
    const data = await kelatosApiPost<{ ok: boolean; afectados: number }>("/v1/mails/mensajes/accion", { ids: b.ids, accion: b.accion, conHilo: b.conHilo === true });
    return NextResponse.json({ ok: true, afectados: data.afectados });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
