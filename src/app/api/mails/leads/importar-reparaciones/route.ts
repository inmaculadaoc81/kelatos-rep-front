import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { accesoMails, soloSuperadmin } from "@/lib/mails-auth";
import type { ResultadoImportacion } from "@/lib/mails";

/** Importa como leads (en "No contactar", solo la lista, sin disparar ningún
    envío) a los clientes de Reparaciones que aceptaron la casilla de
    marketing del formulario público. Solo superadmin. */
export async function POST(req: Request) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  const prohibido = soloSuperadmin(a);
  if (prohibido) return prohibido;
  try {
    const b = (await req.json().catch(() => ({}))) as { actualizar?: unknown };
    const data = await kelatosApiPost<{ ok: boolean } & ResultadoImportacion>("/v1/mails/leads/importar-reparaciones", {
      actualizar: b.actualizar === true,
      usuario: a.email,
    });
    return NextResponse.json({ ok: true, creados: data.creados, actualizados: data.actualizados, omitidos: data.omitidos, sin_datos: data.sin_datos, sin_email: data.sin_email });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
