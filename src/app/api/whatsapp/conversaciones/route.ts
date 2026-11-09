import { NextRequest, NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { accesoMails } from "@/lib/mails-auth";
import type { ConversacionWa } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/** Lista de conversaciones de WhatsApp (Chatwoot). Mismo acceso que Gestión MAILS: administradores, superadmins y cuentas de acceso completo. */
export async function GET(request: NextRequest) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  const sp = new URL(request.url).searchParams;
  try {
    const data = await kelatosApiGet<{ ok: boolean; configurado: boolean; conversaciones: ConversacionWa[]; total: number }>("/v1/whatsapp/conversaciones", {
      estado: sp.get("estado") ?? "open",
      pagina: sp.get("pagina") ?? "1",
      q: sp.get("q") ?? undefined,
      bandeja: sp.get("bandeja") ?? undefined,
      asignacion: sp.get("asignacion") ?? undefined,
      etiqueta: sp.get("etiqueta") ?? undefined,
      usuario: a.email,
    });
    return NextResponse.json({ ok: true, configurado: data.configurado, conversaciones: data.conversaciones, total: data.total });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
