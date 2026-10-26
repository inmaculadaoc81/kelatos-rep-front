import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/** Añade una o varias fotos de recogida a una reparación ya entregada (se guardan en Drive y se suman a las que ya hay). */
export async function POST(req: Request, { params }: { params: Promise<{ resguardo: string }> }) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;
  const body = (await req.json().catch(() => ({}))) as { fotos?: { base64?: string; mime?: string }[] };
  const fotos = Array.isArray(body.fotos) ? body.fotos.filter((f) => typeof f?.base64 === "string" && f.base64.length > 100).slice(0, 10) : [];
  if (fotos.length === 0) return NextResponse.json({ ok: false, error: "Añade al menos una foto" }, { status: 400 });

  try {
    const r = await kelatosApiPost<{ ok: boolean; fotosRecogida: string[]; anadidas: number }>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/fotos-recogida`,
      { usuario, fotos }
    );
    return NextResponse.json(r);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 400 });
  }
}
