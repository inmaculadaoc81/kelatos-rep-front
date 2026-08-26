/**
 * Reproduce apiObtenerPresupuestosEnviados() — presupuestos que ya se
 * enviaron al cliente (se excluyen los "borrador", nunca enviados), con
 * cliente/equipo unidos desde la reparación correspondiente. Vista de solo
 * lectura, sin ninguna acción propia (gestionar/responder un presupuesto se
 * hace desde el detalle de la reparación, no desde aquí — igual que en el
 * original); a diferencia del original sí incluye el estado de respuesta
 * (aceptado/rechazado/sin respuesta) porque el listado dejó de limitarse a
 * "enviado" únicamente.
 */

export type EstadoPresupuesto = "enviado" | "aceptado" | "rechazado" | "anulado" | "sin_respuesta" | "borrador";

export interface PresupuestoEnviado {
  presupuestoId: string;
  resguardo: string;
  version: number;
  fechaEnvio: string | null;
  clienteNombre: string;
  equipo: string;
  /** Sin IVA, tal como se guarda — el listado aplica ×1.21 solo para mostrar, igual que el original. */
  total: number;
  numeroPresupuesto: string;
  urlPdf: string;
  estado: EstadoPresupuesto;
  motivoRechazo: string;
  fechaRespuesta: string | null;
}

interface FilaPresupuestoSql {
  presupuesto_id: string;
  resguardo: string;
  version: string | number | null;
  fecha_envio: string | null;
  total: string | number | null;
  numero_presupuesto: string | null;
  url_pdf_presupuesto: string | null;
  estado: string | null;
  motivo_rechazo: string | null;
  fecha_respuesta: string | null;
}

interface FilaReparacionSql {
  resguardo: string;
  cliente_nombre: string | null;
  equipo_modelo: string | null;
}

function numero(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function mapearPresupuestoEnviado(
  row: FilaPresupuestoSql,
  reparacion: FilaReparacionSql | undefined
): PresupuestoEnviado {
  return {
    presupuestoId: row.presupuesto_id || "",
    resguardo: row.resguardo || "",
    version: numero(row.version) || 1,
    fechaEnvio: row.fecha_envio || null,
    clienteNombre: reparacion?.cliente_nombre || "",
    equipo: reparacion?.equipo_modelo || "",
    total: numero(row.total),
    numeroPresupuesto: row.numero_presupuesto || "",
    urlPdf: row.url_pdf_presupuesto || "",
    // El backend preserva a propósito dos convenciones de mayúsculas
    // distintas en la misma columna (flujo Dashboard en minúscula vs.
    // webhook n8n capitalizado, p.ej. "aceptado" y "Aceptado" conviven en
    // producción) — aquí solo se normaliza para que el listado no muestre
    // el mismo estado como dos valores de filtro distintos.
    estado: (row.estado?.toLowerCase() as EstadoPresupuesto) || "enviado",
    motivoRechazo: row.motivo_rechazo || "",
    fechaRespuesta: row.fecha_respuesta || null,
  };
}
