import { NextRequest, NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { accesoMails } from "@/lib/mails-auth";
import type { ConversacionWa } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/** Conversaciones de WhatsApp de un cliente a partir de su teléfono (pestaña «WhatsApp» del detalle de una reparación). Mismo acceso que Gestión MAILS. */
export async function GET(request: NextRequest) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  const telefono = new URL(request.url).searchParams.get("telefono") ?? "";
  try {
    const data = await kelatosApiGet<{ ok: boolean; configurado: boolean; conversaciones: ConversacionWa[] }>("/v1/whatsapp/por-telefono", { telefono });
    return NextResponse.json({ ok: true, configurado: data.configurado, conversaciones: data.conversaciones });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
