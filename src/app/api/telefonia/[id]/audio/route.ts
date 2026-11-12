import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/** El navegador sube la grabación (mezcla + cada voz) al terminar la llamada. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  const cuerpo = await req.json().catch(() => null);
  if (!cuerpo) return NextResponse.json({ ok: false, error: "Cuerpo inválido" }, { status: 400 });
  try {
    return NextResponse.json(await kelatosApiPost(`/v1/llamadas/${encodeURIComponent(id)}/audio`, cuerpo));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
