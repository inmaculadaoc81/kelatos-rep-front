import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { accesoMails, soloSuperadmin } from "@/lib/mails-auth";

/** Activa o desactiva un tipo de correo. Solo superadmin. */
export async function PATCH(req: Request, { params }: { params: Promise<{ tipo: string }> }) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  const prohibido = soloSuperadmin(a);
  if (prohibido) return prohibido;
  try {
    const { tipo } = await params;
    const b = (await req.json()) as { activo?: unknown };
    await kelatosApiPost(`/v1/mails/tipos/${encodeURIComponent(tipo)}`, { activo: b.activo, usuario: a.email }, "PATCH");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
