/**
 * Reproduce apiObtenerPresupuestosEnviados() — presupuestos en estado
 * "enviado" (esperando respuesta del cliente), con cliente/equipo unidos
 * desde la reparación correspondiente. Vista de solo lectura, sin ninguna
 * acción propia (gestionar/responder un presupuesto se hace desde el
 * detalle de la reparación, no desde aquí — igual que en el original).
 */

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
}

interface FilaPresupuestoSql {
  presupuesto_id: string;
  resguardo: string;
  version: string | number | null;
  fecha_envio: string | null;
  total: string | number | null;
  numero_presupuesto: string | null;
  url_pdf_presupuesto: string | null;
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
  };
}
