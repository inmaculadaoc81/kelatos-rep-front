import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { accesoMails } from "@/lib/mails-auth";

/** Grupos de envío (oleadas) que existen entre los leads, con cuántos hay en cada uno. */
export async function GET() {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  try {
    const data = await kelatosApiGet<{ ok: boolean; grupos: { grupo: string; n: number }[] }>("/v1/mails/leads/grupos");
    return NextResponse.json({ ok: true, grupos: data.grupos });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
