import { NextRequest, NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { accesoMails } from "@/lib/mails-auth";
import type { ConversacionWa } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/** Acciones sobre una conversación: estado, asignar, tomar, etiquetas, prioridad, marcar como no leída. El usuario queda anotado en el historial interno. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  const { id } = await params;
  if (!/^\d{1,12}$/.test(id)) return NextResponse.json({ ok: false, error: "Conversación no válida" }, { status: 400 });
  try {
    const b = (await request.json()) as Record<string, unknown>;
    const data = await kelatosApiPost<{ ok: boolean; conversacion: ConversacionWa }>(`/v1/whatsapp/conversaciones/${id}/accion`, { ...b, usuario: a.email });
    return NextResponse.json({ ok: true, conversacion: data.conversacion });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
