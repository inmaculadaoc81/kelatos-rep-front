import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { accesoMails, soloSuperadmin } from "@/lib/mails-auth";

/** Descarga ahora los mensajes nuevos de un buzón (solo lectura en el servidor de correo). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  const prohibido = soloSuperadmin(a);
  if (prohibido) return prohibido;
  try {
    const { id } = await params;
    const data = await kelatosApiPost<{ ok: boolean; nuevos: number; error: string | null; yaEnCurso?: boolean }>(
      `/v1/mails/buzones/${encodeURIComponent(id)}/sincronizar`,
      { usuario: a.email }
    );
    return NextResponse.json({ ok: true, nuevos: data.nuevos, error: data.error, yaEnCurso: !!data.yaEnCurso });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
