import { NextResponse } from "next/server";
import { accesoMails } from "@/lib/mails-auth";
import { emitirTokenImagenMail } from "@/lib/mails-image-token";

/** Token de corta duración para /api/mails/imagen — ver mails-image-token.ts. */
export async function GET() {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  const { token, exp } = emitirTokenImagenMail();
  return NextResponse.json({ ok: true, token, exp });
}
