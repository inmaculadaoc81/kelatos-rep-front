import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { puedeGestionarContenido } from "@/lib/contenido-acceso";

export async function GET(req: Request) {
  const session = await auth();
  if (!puedeGestionarContenido(session)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  try {
    return NextResponse.json(await kelatosApiGet("/v1/contenido/coincidencias", {
      enlace: searchParams.get("enlace") ?? undefined,
      excluir: searchParams.get("excluir") ?? undefined,
    }));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
