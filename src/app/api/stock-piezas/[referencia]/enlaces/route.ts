import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";

interface FilaEnlaceSql {
  id: number;
  referencia: string;
  proveedor: string | null;
  costo: string | number | null;
  enlace: string;
  fecha_creacion: string | null;
  usuario: string | null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ referencia: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { referencia } = await params;
  try {
    const resultado = await kelatosApiGet<{ ok: boolean; enlaces: FilaEnlaceSql[] }>(
      `/v1/stock-piezas/${encodeURIComponent(referencia)}/enlaces`
    );
    return NextResponse.json({ ok: true, enlaces: resultado.enlaces });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ referencia: string }> }) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { referencia } = await params;
  const { proveedor, costo, enlace } = (await req.json()) as { proveedor?: string; costo?: number | null; enlace: string };
  if (!enlace?.trim()) return NextResponse.json({ ok: false, error: "El enlace de compra es obligatorio" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; enlace: FilaEnlaceSql }>(
      `/v1/stock-piezas/${encodeURIComponent(referencia)}/enlaces`,
      { proveedor: proveedor?.trim() || "", costo: costo ?? null, enlace: enlace.trim(), usuario }
    );
    return NextResponse.json({ ok: true, enlace: resultado.enlace });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
