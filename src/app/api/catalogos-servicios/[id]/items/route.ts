import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapearItemServicio } from "@/lib/catalogos-servicios";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  try {
    const resultado = await kelatosApiGet<{ ok: boolean; items: Parameters<typeof mapearItemServicio>[0][] }>(
      `/v1/catalogos-servicios/${encodeURIComponent(id)}/items`
    );
    return NextResponse.json({ ok: true, items: resultado.items.map(mapearItemServicio) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const datos = (await req.json()) as {
    nombre: string; descripcion?: string; precio?: number | string; categoria?: string; imagenUrl?: string; activo?: boolean;
  };
  if (!datos.nombre?.trim()) return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; item: Parameters<typeof mapearItemServicio>[0] }>(
      `/v1/catalogos-servicios/${encodeURIComponent(id)}/items`,
      { ...datos, nombre: datos.nombre.trim(), usuario }
    );
    return NextResponse.json({ ok: true, item: mapearItemServicio(resultado.item) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
