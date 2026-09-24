/**
 * Importaciones / DUA — declaraciones de aduana con IVA a la importación y
 * aranceles. Backend: importacionesServicio.js (migración 122). Tabla propia,
 * separada del Libro de Compras; alimentará la vista "Gastos / Compras".
 */

export type FormaLiquidacion = "pago_aduana" | "diferido";
export type EstadoPagoImportacion = "pendiente" | "pagada";
export type EstadoRevisionImportacion = "pendiente" | "validada";

export const ETIQUETA_LIQUIDACION: Record<FormaLiquidacion, string> = {
  pago_aduana: "Pago en aduana (IVA e importe liquidados en el DUA)",
  diferido: "IVA diferido (se liquida en la declaración de IVA)",
};

export interface Importacion {
  id: number;
  numeroRegistro: string;
  numeroDua: string;
  fechaAceptacion: string;
  fechaLevante: string | null;
  aduana: string;
  regimen: string;
  paisOrigen: string;
  incoterm: string;
  exportadorNombre: string;
  exportadorPais: string;
  facturaComercial: string;
  agenteAduanas: string;
  agenteNif: string;
  moneda: string;
  tipoCambio: number | null;
  valorOrigen: number | null;
  valorAduanaEur: number;
  derechosArancelarios: number;
  otrosGastos: number;
  baseImponibleIva: number;
  tipoIva: number;
  cuotaIvaImportacion: number;
  totalTributos: number;
  formaLiquidacion: FormaLiquidacion;
  estadoPago: EstadoPagoImportacion;
  fechaPago: string | null;
  referenciaBancaria: string;
  estadoRevision: EstadoRevisionImportacion;
  observacionesInternas: string;
  ejercicioFiscal: number;
  driveFileId: string | null;
  usuarioRegistro: string;
  creadoEn: string;
}

export interface FilaImportacionSql {
  id: number | string;
  numero_registro: string;
  numero_dua: string;
  fecha_aceptacion: string;
  fecha_levante: string | null;
  aduana: string | null;
  regimen: string | null;
  pais_origen: string | null;
  incoterm: string | null;
  exportador_nombre: string;
  exportador_pais: string | null;
  factura_comercial: string | null;
  agente_aduanas: string | null;
  agente_nif: string | null;
  moneda: string;
  tipo_cambio: string | number | null;
  valor_origen: string | number | null;
  valor_aduana_eur: string | number;
  derechos_arancelarios: string | number;
  otros_gastos: string | number;
  base_imponible_iva: string | number;
  tipo_iva: string | number;
  cuota_iva_importacion: string | number;
  total_tributos: string | number;
  forma_liquidacion: string;
  estado_pago: string;
  fecha_pago: string | null;
  referencia_bancaria: string | null;
  estado_revision: string;
  observaciones_internas: string | null;
  ejercicio_fiscal: number;
  drive_file_id: string | null;
  usuario_registro: string;
  creado_en: string;
}

function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}
function numOrNull(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

export function mapearImportacion(f: FilaImportacionSql): Importacion {
  return {
    id: Number(f.id),
    numeroRegistro: f.numero_registro,
    numeroDua: f.numero_dua,
    fechaAceptacion: f.fecha_aceptacion,
    fechaLevante: f.fecha_levante,
    aduana: f.aduana || "",
    regimen: f.regimen || "",
    paisOrigen: f.pais_origen || "",
    incoterm: f.incoterm || "",
    exportadorNombre: f.exportador_nombre,
    exportadorPais: f.exportador_pais || "",
    facturaComercial: f.factura_comercial || "",
    agenteAduanas: f.agente_aduanas || "",
    agenteNif: f.agente_nif || "",
    moneda: f.moneda || "EUR",
    tipoCambio: numOrNull(f.tipo_cambio),
    valorOrigen: numOrNull(f.valor_origen),
    valorAduanaEur: num(f.valor_aduana_eur),
    derechosArancelarios: num(f.derechos_arancelarios),
    otrosGastos: num(f.otros_gastos),
    baseImponibleIva: num(f.base_imponible_iva),
    tipoIva: num(f.tipo_iva),
    cuotaIvaImportacion: num(f.cuota_iva_importacion),
    totalTributos: num(f.total_tributos),
    formaLiquidacion: (f.forma_liquidacion as FormaLiquidacion) || "pago_aduana",
    estadoPago: (f.estado_pago as EstadoPagoImportacion) || "pendiente",
    fechaPago: f.fecha_pago,
    referenciaBancaria: f.referencia_bancaria || "",
    estadoRevision: (f.estado_revision as EstadoRevisionImportacion) || "pendiente",
    observacionesInternas: f.observaciones_internas || "",
    ejercicioFiscal: f.ejercicio_fiscal,
    driveFileId: f.drive_file_id,
    usuarioRegistro: f.usuario_registro,
    creadoEn: f.creado_en,
  };
}
