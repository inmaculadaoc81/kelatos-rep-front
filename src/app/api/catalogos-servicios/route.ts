import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapearCatalogoServicios } from "@/lib/catalogos-servicios";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    const resultado = await kelatosApiGet<{ ok: boolean; catalogos: Parameters<typeof mapearCatalogoServicios>[0][] }>("/v1/catalogos-servicios");
    return NextResponse.json({ ok: true, catalogos: resultado.catalogos.map(mapearCatalogoServicios) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { nombre } = (await req.json()) as { nombre: string };
  if (!nombre?.trim()) return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; catalogo: Parameters<typeof mapearCatalogoServicios>[0] }>(
      "/v1/catalogos-servicios",
      { nombre: nombre.trim(), usuario }
    );
    return NextResponse.json({ ok: true, catalogo: mapearCatalogoServicios(resultado.catalogo) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
