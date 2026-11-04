/**
 * Transferencia de una venta de piezas o un alquiler: `movimientoId` es el nº de una transferencia confirmada por el banco (obligatorio para emitir el
 * documento; se vincula en el servidor) y `archivo` es el comprobante opcional del cliente, que se sube DESPUÉS de crear el documento.
 */
export interface SoporteTransferencia {
  archivo: File | null;
  movimientoId: number | null;
}

export const SOPORTE_TRANSFERENCIA_VACIO: SoporteTransferencia = { archivo: null, movimientoId: null };

export interface TransferenciaCandidata {
  id: number;
  estado: "Pendiente" | "Conciliada";
  monto: number | null;
  fecha_valor: string | null;
  banco: string | null;
  remitente: string | null;
  concepto: string | null;
  origen: string;
}

function leerComoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result).split(",")[1] || "");
    lector.onerror = () => reject(new Error("No se pudo leer el archivo"));
    lector.readAsDataURL(file);
  });
}

/** Sube el comprobante del cliente (opcional) al documento ya creado. La transferencia confirmada se vincula en el servidor. Devuelve un aviso si falla, o null. */
export async function vincularSoporteTransferencia(tipo: "venta" | "alquiler", id: string, soporte: SoporteTransferencia): Promise<string | null> {
  if (!soporte.archivo) return null;
  try {
    const res = await fetch(`/api/comprobantes-transferencia/${tipo}/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64: await leerComoBase64(soporte.archivo), mime: soporte.archivo.type || "image/jpeg" }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Error desconocido");
    return null;
  } catch (e) {
    return `No se pudo subir el comprobante del cliente: ${e instanceof Error ? e.message : "error desconocido"}. Añádelo desde el detalle.`;
  }
}
