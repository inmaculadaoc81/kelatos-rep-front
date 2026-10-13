import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { esCuentaEmpleadosRestringida } from "@/lib/superadmin";

/** Una línea de pedido leída del pantallazo (p. ej. plataforma de ASWO),
    ya clasificada en "tienda" (pieza para Stock de Piezas) o "cliente"
    (pieza para la reparación del nombre detectado en "Texto del pedido") y,
    si es "tienda", emparejada por nombre contra el catálogo de Stock de
    Piezas — igual que ArticuloFacturaEmparejado en facturas-recibidas/ocr. */
export interface LineaPedidoProveedorLeida {
  nombre: string;
  /** Código/ID del artículo visto junto al nombre en el pantallazo (si lo
      hay) — se usa para reconocer una pieza ya existente con más
      fiabilidad que comparando solo nombres. */
  codigoProveedor: string | null;
  /** Código corto que aparece junto/debajo al nombre del artículo en el
      pantallazo (p. ej. "#R696190" en ASWO) — distinto del código de
      fabricante, otra seña exacta para el emparejamiento. */
  idPedidoProveedor: string | null;
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

const MAX_ARCHIVOS_PEDIDO = 4;
const TIPOS_PEDIDO_VALIDOS = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"]);

/** Proxy de POST /v1/compras/pedido-proveedor/ocr — lectura automática de
    un pantallazo de pedido hecho en la web de un proveedor. No persiste
    nada, solo devuelve las líneas leídas para que el empleado las revise y
    confirme antes de registrar ningún pedido de verdad. */
export async function POST(req: Request) {
  const session = await auth();
  if (esCuentaEmpleadosRestringida(session?.user?.email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as {
    base64?: string;
    mimeType?: string;
    nombreProveedor?: string;
    /** Formato nuevo: de 1 a 4 archivos (imágenes y/o PDF) en un solo análisis. */
    archivos?: { base64?: string; mimeType?: string }[];
  };
  // Compatibilidad: un solo archivo con el formato antiguo se trata como lista de 1.
  const archivos = (Array.isArray(body.archivos) ? body.archivos : body.base64 ? [{ base64: body.base64, mimeType: body.mimeType }] : [])
    .filter((a): a is { base64: string; mimeType: string } => !!a && typeof a.base64 === "string" && !!a.base64 && typeof a.mimeType === "string" && !!a.mimeType);
  if (archivos.length === 0) return NextResponse.json({ ok: false, error: "Faltan datos del archivo" }, { status: 400 });
  if (archivos.length > MAX_ARCHIVOS_PEDIDO) return NextResponse.json({ ok: false, error: `Máximo ${MAX_ARCHIVOS_PEDIDO} archivos por análisis` }, { status: 400 });
  if (archivos.some((a) => !TIPOS_PEDIDO_VALIDOS.has(a.mimeType))) return NextResponse.json({ ok: false, error: "Solo se admiten imágenes (JPG, PNG, WEBP) o PDF" }, { status: 400 });

  try {
    // La IA es lenta y el proxy corta a los 60 s: el análisis corre en segundo plano en el servidor y
    // aquí solo se devuelve el identificador; el resultado se consulta en GET /ocr/[jobId].
    const data = await kelatosApiPost<{ ok: boolean; jobId: string }>("/v1/compras/pedido-proveedor/ocr", {
      archivos,
      nombreProveedor: body.nombreProveedor || undefined,
      async: true,
    });
    return NextResponse.json({ ok: true, jobId: data.jobId });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No se pudo leer el pedido" }, { status: 502 });
  }
}
