import { NextResponse } from "next/server";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { accesoMails, soloSuperadmin } from "@/lib/mails-auth";
import type { LeadDetalle } from "@/lib/mails";

/** Ficha de un lead: sus datos, sus cifras y todo el histórico de correos con él. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  try {
    const { id } = await params;
    const data = await kelatosApiGet<{ ok: boolean } & LeadDetalle>(`/v1/mails/leads/${encodeURIComponent(id)}`);
    return NextResponse.json({ ok: true, lead: data.lead, mensajes: data.mensajes, invalidas: data.invalidas });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

/** Cambia estado, paso o datos de contacto de un lead. Solo superadmin. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  const prohibido = soloSuperadmin(a);
  if (prohibido) return prohibido;
  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    await kelatosApiPost(`/v1/mails/leads/${encodeURIComponent(id)}`, { ...body, usuario: a.email }, "PATCH");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
