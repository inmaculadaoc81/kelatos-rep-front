/**
 * Tipos para crear/editar un presupuesto (borrador) — consumen
 * POST /v1/reparaciones/:resguardo/presupuestos y
 * PATCH /v1/presupuestos/:presupuestoId. "piezas" siempre representa la
 * lista completa y definitiva (no un parche parcial), igual que el
 * original actualizarPresupuesto().
 */

export type TipoPieza = "no" | "stock" | "pedido" | "mixto";
export type TipoLineaPieza = "stock" | "pedido";

export interface PiezaForm {
  descripcion: string;
  tipo: TipoLineaPieza;
  costo: number;
  precio: number;
  enlace: string;
  proveedorId: string;
  referenciaStock: string;
  notas: string;
}

export interface DatosPresupuestoForm {
  elaboradoPor: string;
  descripcion: string;
  notas: string;
  manoObra: number;
  diasEntrega: number;
  tipoPieza: TipoPieza;
  piezas: PiezaForm[];
}
