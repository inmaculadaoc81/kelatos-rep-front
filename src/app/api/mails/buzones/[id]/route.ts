import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { accesoMails, soloSuperadmin } from "@/lib/mails-auth";

/** Edita un buzón (solo superadmin). La contraseña solo se cambia si viene informada. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  const prohibido = soloSuperadmin(a);
  if (prohibido) return prohibido;
  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    await kelatosApiPost(`/v1/mails/buzones/${encodeURIComponent(id)}`, { ...body, usuario: a.email }, "PATCH");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
