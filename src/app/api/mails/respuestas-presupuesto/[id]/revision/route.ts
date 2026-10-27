import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { accesoMails } from "@/lib/mails-auth";

/** Valora si la decisión de la automatización fue correcta o incorrecta (revision null la quita). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  if (a.accesoCompleto) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const { id } = await ctx.params;
  if (!/^\d{1,15}$/.test(id)) return NextResponse.json({ ok: false, error: "id no válido" }, { status: 400 });
  try {
    const b = (await req.json()) as { revision?: unknown; nota?: unknown };
    const revision = b.revision === "correcta" || b.revision === "incorrecta" ? b.revision : null;
    await kelatosApiPost(`/v1/mails/respuestas-presupuesto/${id}/revision`, { revision, nota: b.nota, usuario: a.email });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
