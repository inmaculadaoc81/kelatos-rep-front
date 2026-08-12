import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/** Proxy de POST /v1/reparaciones/:resguardo/pedidos (registrarPedidoPieza del original). */
export interface PiezaPedidoForm {
  piezaId?: string;
  pedidoId?: string;
  descripcion: string;
  proveedor: string;
  enlace: string;
  numeroPedido: string;
  fechaEstimada: string;
}

export interface DatosRegistrarPedido {
  compradoPor: string;
  fechaPedido: string;
  piezas: PiezaPedidoForm[];
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

  if (!datos.compradoPor?.trim()) return NextResponse.json({ ok: false, error: "El responsable de compra es obligatorio" }, { status: 400 });
  if (!datos.fechaPedido) return NextResponse.json({ ok: false, error: "La fecha de pedido es obligatoria" }, { status: 400 });
  if (!datos.piezas?.length) return NextResponse.json({ ok: false, error: "Añade al menos una pieza" }, { status: 400 });

  for (let i = 0; i < datos.piezas.length; i++) {
    const p = datos.piezas[i];
    if (!p.descripcion?.trim()) return NextResponse.json({ ok: false, error: `Pieza ${i + 1}: falta descripción` }, { status: 400 });
    if (!p.proveedor?.trim()) return NextResponse.json({ ok: false, error: `Pieza ${i + 1}: falta proveedor` }, { status: 400 });
    if (!p.enlace?.trim()) return NextResponse.json({ ok: false, error: `Pieza ${i + 1}: falta enlace` }, { status: 400 });
    if (!p.numeroPedido?.trim()) return NextResponse.json({ ok: false, error: `Pieza ${i + 1}: falta número de pedido` }, { status: 400 });
    if (!p.fechaEstimada) return NextResponse.json({ ok: false, error: `Pieza ${i + 1}: falta fecha estimada` }, { status: 400 });
  }

  try {
    const resultado = await kelatosApiPost<RespuestaPedidos>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/pedidos`,
      {
        requestId: crypto.randomUUID(),
        usuario,
        compradoPor: datos.compradoPor.trim(),
        fechaPedido: datos.fechaPedido,
        piezas: datos.piezas.map((p) => ({
          piezaId: p.piezaId || "",
          pedidoId: p.pedidoId || "",
          descripcion: p.descripcion.trim(),
          proveedor: p.proveedor.trim(),
          enlace: p.enlace.trim(),
          numeroPedido: p.numeroPedido.trim(),
          fechaEstimada: p.fechaEstimada,
        })),
      }
    );

    return NextResponse.json({ ok: true, reparacion: resultado.reparacion, pedidoIds: resultado.pedidoIds });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
