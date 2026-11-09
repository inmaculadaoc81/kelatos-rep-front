import { NextRequest, NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { accesoMails } from "@/lib/mails-auth";

export const dynamic = "force-dynamic";

/** Contadores de conversaciones abiertas: todas, sin asignar, asignadas y las del usuario. */
export async function GET(request: NextRequest) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  try {
    const data = await kelatosApiGet<{ ok: boolean; todas: number; sinAsignar: number; asignadas: number; mias: number | null }>("/v1/whatsapp/contadores", {
      bandeja: new URL(request.url).searchParams.get("bandeja") ?? undefined,
      usuario: a.email,
    });
    return NextResponse.json({ ok: true, todas: data.todas, sinAsignar: data.sinAsignar, asignadas: data.asignadas, mias: data.mias });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
