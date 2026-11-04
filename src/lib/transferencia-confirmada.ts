import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Una venta de piezas o un alquiler pagado por transferencia solo se puede facturar (o emitir su ticket) si se indica el número de una
 * transferencia CONFIRMADA por el banco (el justificante que sube Gisela por Telegram) y sin vincular a otro documento. Se comprueba en el servidor,
 * ANTES de reservar ningún número fiscal.
 */
export async function validarTransferenciaConfirmada(numero: unknown): Promise<string | null> {
  const id = Number(numero);
  if (!Number.isInteger(id) || id <= 0) return "Indica el número de la transferencia confirmada (el de Transferencias en el dashboard)";
  try {
    const r = await kelatosApiGet<{ ok: boolean; valida: boolean; motivo: string | null }>(`/v1/comprobantes-transferencia/validar/${id}`);
    return r.valida ? null : r.motivo || "La transferencia indicada no es válida";
  } catch (error) {
    return `No se pudo comprobar la transferencia: ${error instanceof Error ? error.message : "error desconocido"}`;
  }
}

/** Vincula la transferencia al documento ya creado. Devuelve un aviso si falla (el documento ya existe, no se revierte). */
export async function vincularTransferenciaConfirmada(tipo: "venta" | "alquiler", docId: string, numero: unknown, usuario: string): Promise<string | null> {
  try {
    await kelatosApiPost(`/v1/comprobantes-transferencia/${tipo}/${encodeURIComponent(docId)}/asociar`, { usuario, movimientoId: Number(numero) });
    return null;
  } catch (error) {
    return `El documento se creó, pero no se pudo vincular la transferencia nº ${numero}: ${error instanceof Error ? error.message : "error desconocido"}. Vincúlala desde el detalle.`;
  }
}
