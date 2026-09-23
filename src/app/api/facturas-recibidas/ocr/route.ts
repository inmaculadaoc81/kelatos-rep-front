import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";

export interface FacturaOcrExtraido {
  proveedorNombre: string | null;
  proveedorDniCif: string | null;
  numeroFacturaProveedor: string | null;
  serieProveedor: string | null;
  fechaExpedicion: string | null;
  baseImponible: number | null;
  tipoIva: number | null;
  cuotaIvaSoportado: number | null;
  importeTotal: number | null;
  moneda: string;
  descripcion: string | null;
}

/** Proxy de POST /v1/facturas-recibidas/ocr — lectura automática de una
    factura (imagen o PDF) vía tesseract + la IA de texto del usuario. No
    persiste nada, solo devuelve los campos leídos para precargar el
    formulario de alta. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { base64?: string; mimeType?: string };
  if (!body.base64 || !body.mimeType) return NextResponse.json({ ok: false, error: "Faltan datos del archivo" }, { status: 400 });

  try {
    const data = await kelatosApiPost<{ ok: boolean; extraido: FacturaOcrExtraido | null; proveedorIdSugerido: string | null; textoOcr: string }>(
      "/v1/facturas-recibidas/ocr",
      body
    );
    return NextResponse.json({ ok: true, extraido: data.extraido, proveedorIdSugerido: data.proveedorIdSugerido, textoOcr: data.textoOcr });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No se pudo leer la factura" }, { status: 502 });
  }
}
