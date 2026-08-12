/**
 * Tipos compartidos del saga de facturación (preparar → iniciar →
 * generar-pdf → confirmar/fallar en el backend). El requestId lo genera y
 * conserva SIEMPRE el cliente (nunca el servidor en cada llamada) — la
 * numeración fiscal es irreversible y "iniciar" llamado dos veces con
 * requestIds distintos generaría dos números para la misma operación; con
 * el mismo requestId, un reintento tras un fallo de red es seguro gracias
 * a la idempotencia que ya implementa el backend.
 */
export type TipoFactura =
  | "normal"
  | "revision"
  | "mensajeria"
  | "anticipo"
  | "rectificativa"
  | "rectificativa_revision"
  | "corregida"
  | "corregida_revision";

export interface ClienteFactura {
  nombre: string;
  direccion: string;
  dni: string;
  telefono: string;
  codigo?: string;
  email?: string;
}

export interface LineaFactura {
  referencia?: string;
  descripcion: string;
  cantidad: number;
  precio: number;
  descuento?: number;
}

export interface DatosFactura {
  /** Obligatorio en normal/revision/corregida; no aplica a rectificativa. */
  cliente?: ClienteFactura;
  /** Obligatorio en normal/revision; no aplica a rectificativa/corregida. */
  formaPago?: string;
  banco?: string;
  lineas: LineaFactura[];
  fianza?: number;
  fianzaDescripcion?: string;
  rectificaDe?: string;
  estadoFactura?: string;
  tipoDocumento?: string;
  /** Solo tipo "normal": permite guardar sin fecha_factura (aún no se cobra). */
  esBorrador?: boolean;
  /** Solo tipo "revision": si true, clienteOverride pisa el cliente_factura_revision ya guardado. */
  clienteOverrideProvisto?: boolean;
  /** Solo tipo "rectificativa"/"rectificativa_revision": motivo obligatorio de la devolución. */
  motivo?: string;
  /** Solo tipo "rectificativa"/"rectificativa_revision": número de la factura que se rectifica. */
  numeroOriginal?: string;
  /** Solo tipo "corregida"/"corregida_revision": número de la factura original que se corrige. */
  numeroFacturaOriginal?: string;
}

export interface ResultadoFactura {
  numeroFactura: string;
  url: string;
  total: number;
  baseImponible: number;
  reparacion: Record<string, unknown>;
}
