import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";

/** Una línea de pedido leída del pantallazo (p. ej. plataforma de ASWO),
    ya clasificada en "tienda" (pieza para Stock de Piezas) o "cliente"
    (pieza para la reparación del nombre detectado en "Texto del pedido") y,
    si es "tienda", emparejada por nombre contra el catálogo de Stock de
    Piezas — igual que ArticuloFacturaEmparejado en facturas-recibidas/ocr. */
export interface LineaPedidoProveedorLeida {
  nombre: string;
  cantidad: number;
  precioUnitario: number | null;
  /** Texto crudo leído bajo "Texto del pedido" — se muestra en la revisión
      para que el empleado vea por qué se clasificó así. */
  textoPedido: string;
  destino: "tienda" | "cliente";
  /** Solo relevante cuando destino === "tienda". */
  referenciaSugerida: string | null;
  nombrePiezaSugerida: string | null;
  categoriaSugerida: string | null;
  precioClienteSugerido: number | null;
}

/** Proxy de POST /v1/compras/pedido-proveedor/ocr — lectura automática de
    un pantallazo de pedido hecho en la web de un proveedor. No persiste
    nada, solo devuelve las líneas leídas para que el empleado las revise y
    confirme antes de registrar ningún pedido de verdad. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { base64?: string; mimeType?: string; nombreProveedor?: string };
  if (!body.base64 || !body.mimeType) return NextResponse.json({ ok: false, error: "Faltan datos del archivo" }, { status: 400 });

  try {
    const data = await kelatosApiPost<{
      ok: boolean;
      numeroPedidoGlobal: string | null;
      lineas: LineaPedidoProveedorLeida[];
      proveedorIdSugerido: string | null;
      proveedorCreado?: boolean;
      textoOcr: string;
    }>("/v1/compras/pedido-proveedor/ocr", {
      base64: body.base64,
      mimeType: body.mimeType,
      nombreProveedor: body.nombreProveedor || undefined,
    });
    return NextResponse.json({
      ok: true,
      numeroPedidoGlobal: data.numeroPedidoGlobal,
      lineas: data.lineas || [],
      proveedorIdSugerido: data.proveedorIdSugerido,
      proveedorCreado: !!data.proveedorCreado,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No se pudo leer el pedido" }, { status: 502 });
  }
}
