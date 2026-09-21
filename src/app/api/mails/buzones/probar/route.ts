import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { accesoMails, soloSuperadmin } from "@/lib/mails-auth";
import type { ResultadoPrueba } from "@/lib/mails";

/** Prueba la conexión IMAP y SMTP con los datos del formulario (o de un buzón guardado). */
export async function POST(req: Request) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  const prohibido = soloSuperadmin(a);
  if (prohibido) return prohibido;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const data = await kelatosApiPost<{ ok: boolean; resultado: ResultadoPrueba }>("/v1/mails/buzones/probar", { ...body, usuario: a.email });
    return NextResponse.json({ ok: true, resultado: data.resultado });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
