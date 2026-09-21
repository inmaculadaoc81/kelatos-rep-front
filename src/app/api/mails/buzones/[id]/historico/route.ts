import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { accesoMails, soloSuperadmin } from "@/lib/mails-auth";

/** Amplía el histórico de un buzón: adelanta "sincronizar desde" y lo vuelve a recorrer. Solo superadmin. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  const prohibido = soloSuperadmin(a);
  if (prohibido) return prohibido;
  try {
    const { id } = await params;
    const b = (await req.json()) as { desde?: unknown };
    const data = await kelatosApiPost<{ ok: boolean; desde: string }>(`/v1/mails/buzones/${encodeURIComponent(id)}/historico`, { desde: b.desde, usuario: a.email });
    return NextResponse.json({ ok: true, desde: data.desde });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
