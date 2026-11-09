import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { accesoMails } from "@/lib/mails-auth";
import type { CatalogoWa } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/** Bandejas, agentes, etiquetas y respuestas predefinidas de Chatwoot (para los filtros y las acciones). */
export async function GET() {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  try {
    const data = await kelatosApiGet<{ ok: boolean } & CatalogoWa>("/v1/whatsapp/catalogo");
    const yo = data.agentes.find((x) => x.email === a.email.toLowerCase()) ?? null;
    return NextResponse.json({ ok: true, configurado: data.configurado, bandejas: data.bandejas, agentes: data.agentes, etiquetas: data.etiquetas, respuestas: data.respuestas, yoAgenteId: yo?.id ?? null });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
