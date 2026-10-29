/**
 * Facturas Recibidas — registro de facturas de proveedores (AliExpress,
 * eBay, Amazon, etc.) para control contable/fiscal real. Backend:
 * kelatos-rep-back/src/facturasRecibidasServicio.js (migraciones 112/113).
 * Campos y obligatoriedad reproducen la hoja de especificación del
 * usuario — ver el comentario al inicio de la migración 113.
 */

export type TipoDocumentoFactura = "completa" | "simplificada" | "rectificativa" | "aduanero";
export type CategoriaFactura = "repuestos" | "mercancias" | "suministros" | "servicios" | "otro";
export type AlmacenFactura = "servicio" | "stock";
export type EstadoPagoFactura = "pendiente" | "parcial" | "pagada";
export type EstadoRevisionFactura = "pendiente" | "validada";
/** De dónde viene la compra: decide qué datos se piden y se validan. */
export type TipoOperacionFactura = "nacional" | "intracomunitaria" | "importacion" | "servicio_extracomunitario";
/** Si la cuota de IVA está justificada y se puede deducir (un recibo puede mencionar IVA sin documentación que lo acredite). */
export type EstadoIvaFactura = "pendiente_justificar" | "deducible" | "parcial" | "no_deducible" | "sin_cuota";

export const TIPOS_OPERACION: { id: TipoOperacionFactura; nombre: string; descripcion: string }[] = [
  { id: "nacional", nombre: "Compra nacional", descripcion: "Proveedor en España, con IVA español en la factura." },
  { id: "intracomunitaria", nombre: "Compra intracomunitaria", descripcion: "Proveedor de otro país de la UE: la factura no lleva IVA (se autorrepercute) y hace falta su NIF-IVA." },
  { id: "importacion", nombre: "Importación de mercancía desde fuera de la UE", descripcion: "Mercancía de un proveedor de fuera de la UE (p. ej. AliExpress desde China): el IVA se acredita con el documento aduanero (DUA) o el justificante de importación." },
  { id: "servicio_extracomunitario", nombre: "Servicio de un proveedor de fuera de la UE", descripcion: "Servicios o software de EE. UU., Reino Unido, etc. (p. ej. Retell, OpenAI): la factura no lleva IVA español y se autorrepercute el 21 % (inversión del sujeto pasivo). Si no está en euros, se convierte." },
];
export const ETIQUETA_TIPO_OPERACION: Record<TipoOperacionFactura, string> = {
  nacional: "Nacional", intracomunitaria: "Intracomunitaria", importacion: "Importación", servicio_extracomunitario: "Servicio fuera de la UE",
};

export const ESTADOS_IVA: { id: EstadoIvaFactura; nombre: string; descripcion: string; estilo: string }[] = [
  { id: "pendiente_justificar", nombre: "Pendiente de justificar", descripcion: "El recibo menciona IVA, pero falta documentación para identificar y acreditar la cuota. No se deduce hasta justificarlo.", estilo: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  { id: "deducible", nombre: "Deducible", descripcion: "La cuota de IVA está justificada y se deduce entera.", estilo: "bg-green-500/10 text-green-700 dark:text-green-400" },
  { id: "parcial", nombre: "Parcialmente deducible", descripcion: "Solo una parte de la cuota se puede deducir (p. ej. uso mixto). Indica la parte deducible; el resto se considera no deducible.", estilo: "bg-sky-500/10 text-sky-700 dark:text-sky-400" },
  { id: "no_deducible", nombre: "No deducible", descripcion: "El IVA soportado no se puede deducir (p. ej. gasto no afecto a la actividad).", estilo: "bg-red-500/10 text-red-700 dark:text-red-400" },
  { id: "sin_cuota", nombre: "Sin cuota de IVA acreditada", descripcion: "No hay una cuota de IVA identificable en el documento (exenta, no sujeta, intracomunitaria sin IVA…).", estilo: "bg-muted text-muted-foreground" },
];
export const ETIQUETA_ESTADO_IVA: Record<EstadoIvaFactura, string> = Object.fromEntries(ESTADOS_IVA.map((e) => [e.id, e.nombre])) as Record<EstadoIvaFactura, string>;

/** Enlace factura ↔ pedido (migración 119): una factura puede cubrir varios. */
export interface EnlaceFactura {
  id: number;
  pedidoId: string | null;
  stockPedidoId: number | null;
  metodo: "auto" | "manual";
  puntuacion: number | null;
}

/** Motivo por el que un texto no vale como nombre de una pieza nueva de Stock de Piezas (null si vale). Mismas reglas que el servidor (nombresPieza.js). */
export function motivoNombrePiezaInvalido(nombre: string, ref: { numeroFactura?: string; idPedido?: string } = {}): string | null {
  const n = (nombre || "").replace(/\s+/g, " ").trim();
  if (n.length < 5) return "el nombre es demasiado corto";
  if ((n.match(/\p{L}/gu) || []).length < 4) return "el nombre casi no tiene letras";
  if (/^(art[ií]culos?|productos?|items?|pedidos?|compras?|facturas?|concepto|varios|sin nombre|desconocid[oa]|n\/a|test|prueba)\b/i.test(n)) return "es un nombre genérico, no el nombre del producto";
  if (/\b(factura|pedido|order|invoice|albar[aá]n)\b/i.test(n) && /\d[\d-]{4,}/.test(n)) return "parece un número de factura o de pedido, no un producto";
  const bajo = n.toLowerCase();
  for (const r of [ref.numeroFactura, ref.idPedido]) {
    const x = (r || "").trim().toLowerCase();
    if (x.length >= 5 && bajo.includes(x)) return "contiene el número de factura o de pedido";
  }
  return null;
}

/** Lectura automática guardada con la factura: campos leídos, dudas de la IA y por qué el IVA quedó como quedó. */
export interface LecturaOcrGuardada {
  extraido: {
    proveedorNombre: string | null; proveedorDniCif: string | null; numeroFacturaProveedor: string | null; serieProveedor: string | null;
    tipoDocumento: TipoDocumentoFactura | null; fechaExpedicion: string | null; baseImponible: number | null; tipoIva: number | null;
    cuotaIvaSoportado: number | null; importeTotal: number | null; descripcion: string | null; advertencias: string[]; receptorCoincide?: boolean;
    receptorCifEncontrado?: boolean; receptorNombreEncontrado?: boolean;
  };
  proveedorEncontrado: boolean;
  proveedorCreado: boolean;
  ivaMotivo: string | null;
  ivaDeducidoSolo: boolean;
  leidoEn: string;
}

export interface FacturaRecibida {
  id: number;
  numeroRecepcion: string;
  numeroFacturaProveedor: string;
  serieProveedor: string;
  fechaExpedicion: string;
  fechaOperacion: string | null;
  fechaRecepcion: string;
  tipoDocumento: TipoDocumentoFactura | null;
  facturaRectificadaId: number | null;
  descripcion: string;

  proveedorId: string;
  proveedorNombre: string;
  proveedorDniCif: string;

  baseImponible: number;
  tipoIva: number | null;
  cuotaIvaSoportado: number | null;
  cuotaIvaDeducible: number;
  ivaNoDeducible: number | null;
  importeTotal: number;
  desgloseIva: { tipo: number; base: number; cuota: number }[] | null;
  retencionIrpf: number | null;
  moneda: string;
  tipoCambio: number | null;
  importeConvertidoEur: number | null;
  /** Con moneda distinta de EUR: importes originales (base e importe total ya están convertidos a euros). */
  baseMonedaOriginal: number | null;
  totalMonedaOriginal: number | null;
  operacionExenta: boolean;
  inversionSujetoPasivo: boolean;
  adquisicionIntracomunitaria: boolean;
  regimenCriterioCaja: boolean;
  tipoOperacion: TipoOperacionFactura;
  estadoIva: EstadoIvaFactura;
  /** Nº de DUA / justificante de importación (importaciones). */
  documentoAduanero: string;
  /** NIF-IVA comunitario del proveedor (compras intracomunitarias). */
  nifIvaProveedor: string;

  formaPago: string;
  fechaVencimiento: string | null;
  estadoPago: EstadoPagoFactura;
  referenciaBancaria: string;

  categoria: CategoriaFactura | null;
  almacen: AlmacenFactura | null;
  pedidoId: string | null;
  stockPedidoId: number | null;
  centroCoste: string;
  estadoRevision: EstadoRevisionFactura;
  posibleDuplicado: boolean;
  duplicadoConfirmado: boolean;
  observacionesInternas: string;
  ejercicioFiscal: number;

  driveFileId: string | null;

  /** Por qué la importación automática la dejó en revisión manual (null si no aplica). */
  revisionMotivo: string | null;
  /** Estado contable: si está validada, si ya se puede contabilizar y, si no, qué le falta. */
  contabilidad: { estado: "sin_validar" | "falta" | "lista" | "sincronizada"; faltan: string[] } | null;
  /** Lo que leyó la IA al cargar la factura (solo si se cargó con «Leer con IA»). */
  lecturaOcr: LecturaOcrGuardada | null;
  enlaces: EnlaceFactura[];

  origen: "manual" | "automatico";
  usuarioRegistro: string;
  creadoEn: string;
  actualizadoEn: string;
}

interface FilaFacturaSql {
  id: number | string;
  numero_recepcion: string;
  numero_factura_proveedor: string;
  serie_proveedor: string | null;
  fecha_expedicion: string;
  fecha_operacion: string | null;
  fecha_recepcion: string;
  tipo_documento: string | null;
  factura_rectificada_id: number | string | null;
  descripcion: string | null;
  proveedor_id: string;
  proveedor_nombre: string | null;
  proveedor_dni_cif: string | null;
  base_imponible: string | number;
  tipo_iva: string | number | null;
  cuota_iva_soportado: string | number | null;
  cuota_iva_deducible: string | number;
  iva_no_deducible: string | number | null;
  importe_total: string | number;
  desglose_iva: { tipo: number; base: number; cuota: number }[] | null;
  retencion_irpf: string | number | null;
  moneda: string;
  tipo_cambio: string | number | null;
  importe_convertido_eur: string | number | null;
  base_moneda_original?: string | number | null;
  total_moneda_original?: string | number | null;
  operacion_exenta: boolean;
  inversion_sujeto_pasivo: boolean;
  adquisicion_intracomunitaria: boolean;
  regimen_criterio_caja: boolean;
  tipo_operacion?: string | null;
  estado_iva?: string | null;
  documento_aduanero?: string | null;
  nif_iva_proveedor?: string | null;
  forma_pago: string | null;
  fecha_vencimiento: string | null;
  estado_pago: string;
  referencia_bancaria: string | null;
  categoria: string | null;
  almacen: string | null;
  pedido_id: string | null;
  stock_pedido_id: number | string | null;
  centro_coste: string | null;
  estado_revision: string;
  posible_duplicado: boolean;
  duplicado_confirmado: boolean;
  observaciones_internas: string | null;
  ejercicio_fiscal: number;
  drive_file_id: string | null;
  revision_motivo?: string | null;
  lectura_ocr?: unknown;
  contabilidad?: unknown;
  enlaces?: EnlaceFactura[] | null;
  origen: string;
  usuario_registro: string;
  creado_en: string;
  actualizado_en: string;
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

export function mapearFacturaRecibida(f: FilaFacturaSql): FacturaRecibida {
  return {
    id: Number(f.id),
    numeroRecepcion: f.numero_recepcion,
    numeroFacturaProveedor: f.numero_factura_proveedor,
    serieProveedor: f.serie_proveedor || "",
    fechaExpedicion: f.fecha_expedicion,
    fechaOperacion: f.fecha_operacion,
    fechaRecepcion: f.fecha_recepcion,
    tipoDocumento: (f.tipo_documento as TipoDocumentoFactura) || null,
    facturaRectificadaId: f.factura_rectificada_id !== null ? Number(f.factura_rectificada_id) : null,
    descripcion: f.descripcion || "",
    proveedorId: f.proveedor_id,
    proveedorNombre: f.proveedor_nombre || f.proveedor_id,
    proveedorDniCif: f.proveedor_dni_cif || "",
    baseImponible: num(f.base_imponible),
    tipoIva: numOrNull(f.tipo_iva),
    cuotaIvaSoportado: numOrNull(f.cuota_iva_soportado),
    cuotaIvaDeducible: num(f.cuota_iva_deducible),
    ivaNoDeducible: numOrNull(f.iva_no_deducible),
    importeTotal: num(f.importe_total),
    desgloseIva: f.desglose_iva,
    retencionIrpf: numOrNull(f.retencion_irpf),
    moneda: f.moneda || "EUR",
    tipoCambio: numOrNull(f.tipo_cambio),
    importeConvertidoEur: numOrNull(f.importe_convertido_eur),
    baseMonedaOriginal: numOrNull(f.base_moneda_original),
    totalMonedaOriginal: numOrNull(f.total_moneda_original),
    operacionExenta: !!f.operacion_exenta,
    inversionSujetoPasivo: !!f.inversion_sujeto_pasivo,
    adquisicionIntracomunitaria: !!f.adquisicion_intracomunitaria,
    regimenCriterioCaja: !!f.regimen_criterio_caja,
    tipoOperacion: (f.tipo_operacion as TipoOperacionFactura) || (f.adquisicion_intracomunitaria ? "intracomunitaria" : "nacional"),
    estadoIva: (f.estado_iva as EstadoIvaFactura) || "pendiente_justificar",
    documentoAduanero: f.documento_aduanero || "",
    nifIvaProveedor: f.nif_iva_proveedor || "",
    formaPago: f.forma_pago || "",
    fechaVencimiento: f.fecha_vencimiento,
    estadoPago: (f.estado_pago as EstadoPagoFactura) || "pendiente",
    referenciaBancaria: f.referencia_bancaria || "",
    categoria: (f.categoria as CategoriaFactura) || null,
    almacen: (f.almacen as AlmacenFactura) || null,
    pedidoId: f.pedido_id,
    stockPedidoId: f.stock_pedido_id !== null ? Number(f.stock_pedido_id) : null,
    centroCoste: f.centro_coste || "",
    estadoRevision: (f.estado_revision as EstadoRevisionFactura) || "pendiente",
    posibleDuplicado: !!f.posible_duplicado,
    duplicadoConfirmado: !!f.duplicado_confirmado,
    observacionesInternas: f.observaciones_internas || "",
    ejercicioFiscal: f.ejercicio_fiscal,
    driveFileId: f.drive_file_id,
    revisionMotivo: f.revision_motivo || null,
    contabilidad: (f.contabilidad as FacturaRecibida["contabilidad"]) || null,
    lecturaOcr: (f.lectura_ocr as LecturaOcrGuardada | null) || null,
    enlaces: f.enlaces || [],
    origen: (f.origen as "manual" | "automatico") || "manual",
    usuarioRegistro: f.usuario_registro,
    creadoEn: f.creado_en,
    actualizadoEn: f.actualizado_en,
  };
}

export const ETIQUETA_TIPO_DOCUMENTO: Record<TipoDocumentoFactura, string> = {
  completa: "Completa",
  simplificada: "Simplificada",
  rectificativa: "Rectificativa",
  aduanero: "Aduanero",
};

export const ETIQUETA_CATEGORIA: Record<CategoriaFactura, string> = {
  repuestos: "Repuestos",
  mercancias: "Mercancías",
  suministros: "Suministros",
  servicios: "Servicios",
  otro: "Otro",
};

export const ETIQUETA_ALMACEN: Record<AlmacenFactura, string> = {
  servicio: "Servicio",
  stock: "Stock",
};

export const COLOR_ALMACEN: Record<AlmacenFactura, string> = {
  servicio: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  stock: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

export const ETIQUETA_ESTADO_PAGO: Record<EstadoPagoFactura, string> = {
  pendiente: "Pendiente",
  parcial: "Parcial",
  pagada: "Pagada",
};

export const COLOR_ESTADO_PAGO: Record<EstadoPagoFactura, string> = {
  pendiente: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  parcial: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  pagada: "bg-green-500/10 text-green-600 dark:text-green-400",
};

export function euros(n: number): string {
  return (n || 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

/** Países de la UE distintos de España (prefijo del NIF-IVA: Grecia usa EL; XI = Irlanda del Norte, mercancías). */
const PAISES_UE: Record<string, string> = {
  AT: "Austria", BE: "Bélgica", BG: "Bulgaria", HR: "Croacia", CY: "Chipre", CZ: "Chequia", DK: "Dinamarca", EE: "Estonia", FI: "Finlandia",
  FR: "Francia", DE: "Alemania", EL: "Grecia", HU: "Hungría", IE: "Irlanda", IT: "Italia", LV: "Letonia", LT: "Lituania", LU: "Luxemburgo",
  MT: "Malta", NL: "Países Bajos", PL: "Polonia", PT: "Portugal", RO: "Rumanía", SK: "Eslovaquia", SI: "Eslovenia", SE: "Suecia", XI: "Irlanda del Norte",
};

/** ¿La factura es de un proveedor de otro país de la UE? Se decide por el prefijo del NIF-IVA leído (FR22841722127…) o, si no hay,
    por el país que la IA leyó en la dirección del proveedor. Devuelve el país y el NIF-IVA listo para validar en VIES; null si no lo es
    (España, fuera de la UE o sin datos). */
export function detectarCompraIntracomunitaria(nifLeido: string | null | undefined, paisLeido: string | null | undefined): { pais: string; nombrePais: string; nifIva: string } | null {
  const nif = (nifLeido || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const prefijo = /^([A-Z]{2})[A-Z0-9]{2,12}$/.exec(nif)?.[1];
  if (prefijo && /\d/.test(nif) && PAISES_UE[prefijo]) return { pais: prefijo, nombrePais: PAISES_UE[prefijo], nifIva: nif };
  const pais = (paisLeido || "").toUpperCase() === "GR" ? "EL" : (paisLeido || "").toUpperCase();
  if (PAISES_UE[pais]) {
    // Sin prefijo en el NIF: se propone el NIF-IVA con el código del país (se ve en el formulario y VIES lo comprueba).
    return { pais, nombrePais: PAISES_UE[pais], nifIva: nif && !/^[A-Z]{2}/.test(nif) ? `${pais}${nif}` : nif };
  }
  return null;
}

/** Proveedor de FUERA de la UE (ni España ni un país de la UE): por el país leído de su dirección o, si no hay, por una factura en moneda
    distinta del euro con un NIF que no tiene formato español. Devuelve el país (código ISO) o "" si solo se sabe que es de fuera; null si no lo es. */
export function detectarProveedorFueraUE(paisLeido: string | null | undefined, nifLeido: string | null | undefined, moneda: string | null | undefined): { pais: string } | null {
  const pais = (paisLeido || "").trim().toUpperCase();
  if (pais && pais !== "ES" && !PAISES_UE[pais === "GR" ? "EL" : pais]) return { pais };
  const nif = (nifLeido || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const esNifEspanol = /^(ES)?([ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]|\d{8}[A-Z]|[XYZ]\d{7}[A-Z])$/.test(nif);
  const m = (moneda || "").toUpperCase();
  if (!pais && m && m !== "EUR" && !esNifEspanol && !detectarCompraIntracomunitaria(nifLeido, null)) return { pais: "" };
  return null;
}
