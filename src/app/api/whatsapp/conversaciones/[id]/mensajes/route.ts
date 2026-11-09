import { NextRequest, NextResponse } from "next/server";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { accesoMails } from "@/lib/mails-auth";
import type { ConversacionWa, MensajeWa } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/** Hilo de una conversación de WhatsApp. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  const { id } = await params;
  if (!/^\d{1,12}$/.test(id)) return NextResponse.json({ ok: false, error: "Conversación no válida" }, { status: 400 });
  try {
    const data = await kelatosApiGet<{ ok: boolean; mensajes: MensajeWa[]; conversacion: ConversacionWa | null; hayMas: boolean }>(`/v1/whatsapp/conversaciones/${id}/mensajes`, {
      antes: new URL(request.url).searchParams.get("antes") ?? undefined,
    });
    return NextResponse.json({ ok: true, mensajes: data.mensajes, conversacion: data.conversacion, hayMas: data.hayMas });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

/** Responde por WhatsApp (a través de Chatwoot). El usuario que envía queda anotado en el historial interno. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  const { id } = await params;
  if (!/^\d{1,12}$/.test(id)) return NextResponse.json({ ok: false, error: "Conversación no válida" }, { status: 400 });
  try {
    const b = (await request.json()) as { texto?: unknown };
    const texto = typeof b.texto === "string" ? b.texto : "";
    const data = await kelatosApiPost<{ ok: boolean; mensaje: MensajeWa }>(`/v1/whatsapp/conversaciones/${id}/mensajes`, { texto, usuario: a.email });
    return NextResponse.json({ ok: true, mensaje: data.mensaje });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
