import { NextResponse } from "next/server";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { accesoMails, soloSuperadmin } from "@/lib/mails-auth";
import type { TiposCorreoRespuesta } from "@/lib/mails-tipos";

/** Catálogo de tipos de correo con contadores de envío. */
export async function GET() {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  try {
    const data = await kelatosApiGet<TiposCorreoRespuesta>("/v1/mails/tipos");
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

/** Da de alta un tipo de correo (p. ej. una campaña de marketing). Solo superadmin. */
export async function POST(req: Request) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  const prohibido = soloSuperadmin(a);
  if (prohibido) return prohibido;
  try {
    const b = (await req.json()) as Record<string, unknown>;
    const data = await kelatosApiPost<{ ok: boolean; tipo: string }>("/v1/mails/tipos", {
      nombre: b.nombre, categoria: b.categoria, descripcion: b.descripcion, tipo: b.tipo, usuario: a.email,
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
