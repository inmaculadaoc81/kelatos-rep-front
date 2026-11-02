import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { puedeGestionarContenido } from "@/lib/contenido-acceso";

export async function GET() {
  const session = await auth();
  if (!puedeGestionarContenido(session)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  try {
    const data = await kelatosApiGet("/v1/contenido/drive/carpetas");
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
