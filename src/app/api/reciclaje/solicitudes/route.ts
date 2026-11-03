import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

/** Solicitudes de reciclaje que llegan por el formulario de la web de PuntoRecicla. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const estado = new URL(req.url).searchParams.get("estado") ?? undefined;
  try {
    return NextResponse.json(await kelatosApiGet("/v1/reciclaje/solicitudes", { estado }));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
