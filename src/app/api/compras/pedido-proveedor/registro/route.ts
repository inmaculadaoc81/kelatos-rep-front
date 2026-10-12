import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/** Línea de resumen de lo que se aplicó al pulsar "Registrar pedidos" en
    el diálogo de pantallazo — deliberadamente breve (nombre, cantidad,
    destino) para el botón "Historial". */
export interface LineaRegistroPedidoProveedor {
  nombre: string;
  cantidad: number;
  destino: "tienda" | "cliente";
  destinoDetalle: string;
  ok: boolean;
}

/** Proxy de POST /v1/compras/pedido-proveedor/registro — deja constancia
    de una pasada de "Registrar pedidos" ya completada (nunca bloquea ni
    valida, se llama después de que los pedidos reales ya se crearon). */
export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email || "";

  const body = (await req.json().catch(() => ({}))) as {
    proveedorNombre?: string;
    numeroPedidoGlobal?: string | null;
    pedidosStock?: number;
    pedidosResguardo?: number;
    lineasFallidas?: number;
    resumen?: LineaRegistroPedidoProveedor[];
  };

  try {
    await kelatosApiPost("/v1/compras/pedido-proveedor/registro", {
      usuario,
      proveedorNombre: body.proveedorNombre || "",
      numeroPedidoGlobal: body.numeroPedidoGlobal || null,
      pedidosStock: body.pedidosStock || 0,
      pedidosResguardo: body.pedidosResguardo || 0,
      lineasFallidas: body.lineasFallidas || 0,
      resumen: body.resumen || [],
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    // No es crítico — si falla el registro del historial no debe parecer
    // que falló el propio "Registrar pedidos" (que ya se completó antes).
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
