import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { accesoMails } from "@/lib/mails-auth";
import type { MensajeHilo } from "@/lib/mails";

/** Todos los mensajes de la conversación de un mensaje (con su cuerpo). No marca nada como leído. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  try {
    const { id } = await params;
    const data = await kelatosApiGet<{ ok: boolean; mensajes: MensajeHilo[] }>(`/v1/mails/mensajes/${encodeURIComponent(id)}/hilo`);
    return NextResponse.json({ ok: true, mensajes: data.mensajes });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
