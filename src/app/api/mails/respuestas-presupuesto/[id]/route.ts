import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { accesoMails } from "@/lib/mails-auth";

/** Detalle de una respuesta analizada: texto del cliente, lectura de la IA, presupuesto original y decisión. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  if (a.accesoCompleto) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const { id } = await ctx.params;
  if (!/^\d{1,15}$/.test(id)) return NextResponse.json({ ok: false, error: "id no válido" }, { status: 400 });
  try {
    const data = await kelatosApiGet<unknown>(`/v1/mails/respuestas-presupuesto/${id}`);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
