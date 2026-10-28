import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";
import type { TipoDocumentoFactura } from "@/lib/facturas-recibidas";

export interface FacturaOcrExtraido {
  proveedorNombre: string | null;
  proveedorDniCif: string | null;
  /** País del proveedor (ISO 3166-1 alfa-2) leído por la IA, o null. */
  proveedorPais?: string | null;
  numeroFacturaProveedor: string | null;
  serieProveedor: string | null;
  tipoDocumento: TipoDocumentoFactura | null;
  fechaExpedicion: string | null;
  baseImponible: number | null;
  tipoIva: number | null;
  cuotaIvaSoportado: number | null;
  importeTotal: number | null;
  moneda: string;
  descripcion: string | null;
  /** Nombres de los campos de arriba que la IA (o una verificación de
      cuadre base+IVA=total) marcó como posiblemente mal leídos — el
      formulario debe mostrarlos con aviso, no como si fueran seguros. */
  advertencias: string[];
  /** ¿Aparecen en el documento los datos de Affirma (CIF o nombre)? false = la factura puede no estar a nombre de la empresa. */
  receptorCoincide?: boolean;
  /** Detalle de la comprobación: ¿aparece el CIF de Affirma? ¿y su nombre? */
  receptorCifEncontrado?: boolean;
  receptorNombreEncontrado?: boolean;
}

/** Un artículo detectado en la factura (p. ej. "CARGADOR ORIGINAL DYSON
    26V", cantidad 3), ya emparejado por nombre contra el catálogo de
    Stock de Piezas — referenciaSugerida es null si no se encontró una
    pieza existente que coincida (el usuario puede darla de alta nueva). */
export interface ArticuloFacturaEmparejado {
  nombre: string;
  cantidad: number;
  /** Señas de identidad del artículo leídas en la factura (opcionales) —
      el servidor las usa para emparejar con Stock de Piezas y se guardan al
      dar de alta una pieza nueva. */
  codigoProveedor?: string | null;
  idPedidoProveedor?: string | null;
  /** Precio de una unidad y importe de la línea, antes de impuestos y en la moneda de la factura. */
  precioUnitario?: number | null;
  importe?: number | null;
  referenciaSugerida: string | null;
  nombrePiezaSugerida: string | null;
  categoriaSugerida: string | null;
  precioClienteSugerido: number | null;
}

/** Proxy de POST /v1/facturas-recibidas/ocr — lectura automática de una
    factura (imagen o PDF) vía tesseract + la IA de texto del usuario. No
    persiste nada, solo devuelve los campos leídos para precargar el
    formulario de alta. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { base64?: string; mimeType?: string };
  if (!body.base64 || !body.mimeType) return NextResponse.json({ ok: false, error: "Faltan datos del archivo" }, { status: 400 });

  try {
    // La IA tarda más de lo que aguanta una petición (el servidor corta a ~60 s): la lectura corre en segundo plano y la pantalla
    // consulta el resultado en GET /api/facturas-recibidas/ocr/:jobId.
    const inicio = await kelatosApiPost<{ ok: boolean; jobId: string }>("/v1/facturas-recibidas/ocr", { ...body, async: true });
    return NextResponse.json({ ok: true, jobId: inicio.jobId });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No se pudo leer la factura" }, { status: 502 });
  }
}
