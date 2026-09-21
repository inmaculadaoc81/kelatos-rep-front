import { NextResponse } from "next/server";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { accesoMails, soloSuperadmin } from "@/lib/mails-auth";
import type { Buzon } from "@/lib/mails";

/** Lista de buzones (sin contraseñas: el backend nunca las devuelve). */
export async function GET() {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  try {
    const data = await kelatosApiGet<{ ok: boolean; buzones: Buzon[] }>("/v1/mails/buzones");
    return NextResponse.json({ ok: true, buzones: data.buzones, puedeGestionar: a.superadmin });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

/** Da de alta un buzón (solo superadmin). */
export async function POST(req: Request) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  const prohibido = soloSuperadmin(a);
  if (prohibido) return prohibido;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const data = await kelatosApiPost<{ ok: boolean; id: number }>("/v1/mails/buzones", { ...body, usuario: a.email });
    return NextResponse.json({ ok: true, id: data.id });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
