import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/** Proxy de POST /v1/reparaciones/:resguardo/pedidos (registrarPedidoPieza del original). */
export interface DatosRegistrarPedido {
  descripcion: string;
  proveedor: string;
  enlace: string;
  numeroPedido: string;
  fechaEstimada: string;
}

interface RespuestaPedidos {
  ok: boolean;
  reparacion: Record<string, unknown> | null;
  pedidoIds: string[];
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ resguardo: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;
  const datos = (await req.json()) as DatosRegistrarPedido;

  if (!datos.descripcion?.trim()) {
    return NextResponse.json({ ok: false, error: "La descripción de la pieza es obligatoria" }, { status: 400 });
  }

  try {
    const resultado = await kelatosApiPost<RespuestaPedidos>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/pedidos`,
      {
        requestId: crypto.randomUUID(),
        usuario,
        descripcion: datos.descripcion.trim(),
        proveedor: datos.proveedor.trim() || undefined,
        enlace: datos.enlace.trim() || undefined,
        numeroPedido: datos.numeroPedido.trim() || undefined,
        fechaEstimada: datos.fechaEstimada || undefined,
      }
    );

    return NextResponse.json({ ok: true, reparacion: resultado.reparacion, pedidoIds: resultado.pedidoIds });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
