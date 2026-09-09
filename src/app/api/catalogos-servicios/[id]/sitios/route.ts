import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapearSitioCatalogo } from "@/lib/catalogos-servicios";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  try {
    const resultado = await kelatosApiGet<{ ok: boolean; sitios: Parameters<typeof mapearSitioCatalogo>[0][] }>(
      `/v1/catalogos-servicios/${encodeURIComponent(id)}/sitios`
    );
    return NextResponse.json({ ok: true, sitios: resultado.sitios.map(mapearSitioCatalogo) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const { sitioIds } = (await req.json()) as { sitioIds: number[] };
  if (!Array.isArray(sitioIds) || !sitioIds.length) {
    return NextResponse.json({ ok: false, error: "No se indicó ninguna web" }, { status: 400 });
  }

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; sitios: Parameters<typeof mapearSitioCatalogo>[0][] }>(
      `/v1/catalogos-servicios/${encodeURIComponent(id)}/sitios`,
      { sitioIds }
    );
    return NextResponse.json({ ok: true, sitios: resultado.sitios.map(mapearSitioCatalogo) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
