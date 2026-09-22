import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { accesoMails } from "@/lib/mails-auth";

/** Sectores/categorías distintos entre los leads, para el filtro. */
export async function GET() {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  try {
    const data = await kelatosApiGet<{ ok: boolean; sectores: { sector: string; n: number }[] }>("/v1/mails/leads/sectores");
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
