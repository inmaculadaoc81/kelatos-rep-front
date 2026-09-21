import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { accesoMails, soloSuperadmin } from "@/lib/mails-auth";

/** Envía o responde un correo por SMTP con un buzón guardado. Solo superadmin. */
export async function POST(req: Request) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  const prohibido = soloSuperadmin(a);
  if (prohibido) return prohibido;
  try {
    const b = (await req.json()) as Record<string, unknown>;
    // Solo los campos que el backend espera; el usuario sale de la sesión, nunca del cuerpo.
    const data = await kelatosApiPost<{ ok: boolean; id: number | null; aceptados: string[]; rechazados: string[]; aviso: string | null }>(
      "/v1/mails/mensajes/enviar",
      {
        buzonId: b.buzonId,
        para: b.para,
        cc: b.cc,
        asunto: b.asunto,
        texto: b.texto,
        respondeA: b.respondeA,
        adjuntos: b.adjuntos,
        forzar: b.forzar === true,
        usuario: a.email,
      }
    );
    return NextResponse.json({ ok: true, id: data.id, aceptados: data.aceptados, rechazados: data.rechazados, aviso: data.aviso });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
