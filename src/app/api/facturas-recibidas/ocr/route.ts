import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";
import type { TipoDocumentoFactura } from "@/lib/facturas-recibidas";

export interface FacturaOcrExtraido {
  proveedorNombre: string | null;
  proveedorDniCif: string | null;
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
}

/** Un artículo detectado en la factura (p. ej. "CARGADOR ORIGINAL DYSON
    26V", cantidad 3), ya emparejado por nombre contra el catálogo de
    Stock de Piezas — referenciaSugerida es null si no se encontró una
    pieza existente que coincida (el usuario puede darla de alta nueva). */
export interface ArticuloFacturaEmparejado {
  nombre: string;
  cantidad: number;
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
    const data = await kelatosApiPost<{
      ok: boolean;
      extraido: FacturaOcrExtraido | null;
      proveedorIdSugerido: string | null;
      proveedorCreado?: boolean;
      textoOcr: string;
      articulosEmparejados?: ArticuloFacturaEmparejado[];
    }>("/v1/facturas-recibidas/ocr", body);
    return NextResponse.json({
      ok: true,
      extraido: data.extraido,
      proveedorIdSugerido: data.proveedorIdSugerido,
      proveedorCreado: !!data.proveedorCreado,
      textoOcr: data.textoOcr,
      articulosEmparejados: data.articulosEmparejados || [],
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No se pudo leer la factura" }, { status: 502 });
  }
}
