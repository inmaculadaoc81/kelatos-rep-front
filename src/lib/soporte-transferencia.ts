/**
 * Soporte de una transferencia al crear una venta de piezas o un alquiler: o se sube el comprobante del cliente (pasa por el
 * mismo OCR y conciliación que las reparaciones) o se asocia una transferencia que ya está en el dashboard. Se vincula DESPUÉS
 * de crear el documento, cuando ya existe su identificador.
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

/** Vincula el soporte al documento ya creado. Devuelve un aviso si algo falló (el documento ya está creado, no se revierte), o null. */
export async function vincularSoporteTransferencia(tipo: "venta" | "alquiler", id: string, soporte: SoporteTransferencia): Promise<string | null> {
  try {
    if (soporte.archivo) {
      const res = await fetch(`/api/comprobantes-transferencia/${tipo}/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64: await leerComoBase64(soporte.archivo), mime: soporte.archivo.type || "image/jpeg" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
    } else if (soporte.movimientoId) {
      const res = await fetch(`/api/comprobantes-transferencia/${tipo}/${encodeURIComponent(id)}/asociar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movimientoId: soporte.movimientoId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
    }
    return null;
  } catch (e) {
    return `No se pudo vincular el soporte de la transferencia: ${e instanceof Error ? e.message : "error desconocido"}. Añádelo desde el detalle.`;
  }
}
