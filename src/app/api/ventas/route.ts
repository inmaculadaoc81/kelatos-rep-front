import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapearVenta, DatosNuevaVenta } from "@/lib/ventas";

interface RespuestaLecturaVentas {
  ok: boolean;
  ventas: Parameters<typeof mapearVenta>[0][];
  itemsPorVenta: Record<string, Parameters<typeof mapearVenta>[1]>;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado") || undefined;
  const busqueda = searchParams.get("busqueda") || undefined;

  try {
    const data = await kelatosApiGet<RespuestaLecturaVentas>("/v1/lecturas/ventas", { estado, busqueda, limit: 500 });
    const ventas = data.ventas.map((v) => mapearVenta(v, data.itemsPorVenta[v.venta_id] || []));
    return NextResponse.json({ ok: true, ventas });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const datos = (await req.json()) as DatosNuevaVenta;
  if (!datos.esGarantia && !datos.numeroFactura?.trim()) {
    return NextResponse.json({ ok: false, error: "El número de factura es obligatorio" }, { status: 400 });
  }
  if (datos.items.length === 0) return NextResponse.json({ ok: false, error: "Añade al menos un item" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; venta_id: string; venta: Parameters<typeof mapearVenta>[0]; items: Parameters<typeof mapearVenta>[1] }>(
      "/v1/ventas",
      {
        requestId: crypto.randomUUID(),
        usuario,
        es_garantia: datos.esGarantia,
        cliente_nombre: datos.clienteNombre.trim(),
        cliente_telefono: datos.clienteTelefono.trim(),
        cliente_email: datos.clienteEmail.trim(),
        numero_factura: datos.numeroFactura.trim(),
        metodo_pago: datos.metodoPago.trim(),
        observaciones: datos.observaciones.trim(),
        items: datos.items.map((i) => ({
          descripcion: i.descripcion.trim(),
          costo: i.costo,
          precio: i.precio,
          proveedor_id: i.proveedorId,
          enlace: i.enlace.trim(),
          notas: i.notas.trim(),
        })),
      }
    );

    return NextResponse.json({ ok: true, venta: mapearVenta(resultado.venta, resultado.items) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
