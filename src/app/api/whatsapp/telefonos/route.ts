import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { accesoMails } from "@/lib/mails-auth";

export const dynamic = "force-dynamic";

/** Teléfonos (últimos 9 dígitos) que tienen WhatsApp en Chatwoot: para el filtro «WhatsApp» de Reparaciones. Mismo acceso que Gestión MAILS. */
export async function GET() {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  try {
    const data = await kelatosApiGet<{ ok: boolean; configurado: boolean; telefonos: string[] }>("/v1/whatsapp/telefonos");
    return NextResponse.json({ ok: true, configurado: data.configurado, telefonos: data.telefonos });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
