import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapearProductoWeb } from "@/lib/webs-kelatos";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  try {
    const resultado = await kelatosApiGet<{ ok: boolean; productos: Parameters<typeof mapearProductoWeb>[0][] }>(
      `/v1/sitios-web/${encodeURIComponent(id)}/productos`
    );
    return NextResponse.json({ ok: true, productos: resultado.productos.map(mapearProductoWeb) });
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
    nombre: string; descripcion?: string; precio?: number | string; stock?: number;
    categoria?: string; imagenUrl?: string; activo?: boolean;
  };
  if (!datos.nombre?.trim()) return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; producto: Parameters<typeof mapearProductoWeb>[0] }>(
      `/v1/sitios-web/${encodeURIComponent(id)}/productos`,
      { ...datos, nombre: datos.nombre.trim(), usuario }
    );
    return NextResponse.json({ ok: true, producto: mapearProductoWeb(resultado.producto) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
