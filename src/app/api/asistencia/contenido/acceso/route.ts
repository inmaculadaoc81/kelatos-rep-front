import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { puedeVerContenido } from "@/lib/contenido-acceso";

export async function GET() {
  const session = await auth();
  return NextResponse.json({ ok: true, puedeContenido: puedeVerContenido(session) });
}
