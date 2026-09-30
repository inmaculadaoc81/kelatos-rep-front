import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { accesoMails, buzonesPropios } from "@/lib/mails-auth";

/** Envía o responde un correo por SMTP con un buzón guardado. Superadmin, o
    una cuenta accesoCompleto pero SOLO con su propio buzón (petición del
    usuario, 2026-09-30: lo único vedado es ver/usar buzones ajenos) — el
    buzonId que mande el cliente se descarta si no es el suyo, nunca se
    confía en lo que llegue del navegador. */
export async function POST(req: Request) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  if (!a.superadmin) {
    const propios = await buzonesPropios(a);
    const b0 = (await req.clone().json().catch(() => ({}))) as Record<string, unknown>;
    if (!propios || !propios.includes(Number(b0.buzonId))) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
    }
  }
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
