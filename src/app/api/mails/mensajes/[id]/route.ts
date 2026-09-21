import { NextResponse } from "next/server";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { accesoMails } from "@/lib/mails-auth";
import type { MensajeDetalle } from "@/lib/mails";

/** Mensaje completo (con cuerpo). Al abrirlo se marca como leído en el app:
    solo aquí, nunca en el servidor de correo. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  try {
    const { id } = await params;
    const data = await kelatosApiGet<{ ok: boolean; mensaje: MensajeDetalle }>(`/v1/mails/mensajes/${encodeURIComponent(id)}`);
    if (!data.mensaje.leido) {
      kelatosApiPost(`/v1/mails/mensajes/${encodeURIComponent(id)}/leido`, {}).catch(() => {});
    }
    return NextResponse.json({ ok: true, mensaje: data.mensaje });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
