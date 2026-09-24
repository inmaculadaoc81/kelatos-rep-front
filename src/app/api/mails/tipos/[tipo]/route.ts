import { NextResponse } from "next/server";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
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

/** Un tipo con su plantilla JS y datos de prueba. */
export async function GET(_req: Request, { params }: { params: Promise<{ tipo: string }> }) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  try {
    const { tipo } = await params;
    const data = await kelatosApiGet<{ ok: boolean; tipo: unknown }>(`/v1/mails/tipos/${encodeURIComponent(tipo)}`);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
