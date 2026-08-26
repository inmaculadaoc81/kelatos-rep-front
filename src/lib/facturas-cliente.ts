/**
 * "Facturas de Clientes" (Index.html: apiObtenerFacturasClientes) reúne en
 * una sola lista las facturas de TRES orígenes distintos — reparaciones,
 * alquileres y facturas manuales — con hasta 11 "pasadas" distintas sobre
 * esos orígenes (una reparación puede tener a la vez factura de reparación,
 * de revisión, de mensajería, de anticipo, rectificativas y corregidas; un
 * alquiler puede tener inicial/rectificativa/corregida/recogida/anterior).
 * Este módulo replica esa misma lógica fila a fila a partir de las lecturas
 * SQL ya existentes (GET /v1/lecturas/reparaciones-facturadas,
 * GET /v1/alquileres, GET /v1/facturas_manuales).
 */

export type TipoFactura =
  | "reparacion"
  | "revision"
  | "mensajeria"
  | "anticipo"
  | "rectificativa"
  | "corregida"
  | "alquiler"
  | "recogida"
  | "manual"
  | "venta"
  | "ticket";

export const ETIQUETA_TIPO_FACTURA: Record<TipoFactura, string> = {
  reparacion: "Reparación",
  revision: "Revisión Pagada",
  mensajeria: "Mensajería",
  anticipo: "Anticipo",
  rectificativa: "Rectificativa",
  corregida: "Corregida",
  alquiler: "Alquiler",
  recogida: "Recogida",
  manual: "Manual",
  venta: "Venta",
  ticket: "Ticket",
};

export interface FacturaCliente {
  resguardo: string;
  cliente: string;
  telefono: string;
  email: string;
  dniCif: string;
  /** Código del cliente en el directorio de kelatos_app.clientes — se
      rellena aparte (ver lookupCodigoCliente en obtener-facturas.ts), por
      DNI o teléfono, igual que _lookupCodigo() en el original: nunca viene
      ya en la fila de origen (reparación/alquiler/manual/venta). */
  codigoCliente?: string;
  equipo: string;
  /** estado_entrega de la reparación — solo relevante en tipos derivados de
      `reparaciones`; decide si "Ver" debe abrir Activas o Historial. */
  estadoEntrega: string;
  fecha: string | null;
  /** Tal como se guarda en BD: para reparación/revisión/mensajería/
      anticipo/rectificativa/corregida/manual es la base SIN IVA — usar
      `montoConIva()` para el importe real. Alquiler/recogida ya incluyen
      IVA (y fianza/envío en su caso). */
  total: number;
  formaPago: string;
  banco: string;
  /** Crudo, tal como llega de la fila de origen — usar
      `estadoFacturaDerivado()` para el badge (aplica los mismos fallbacks
      que el original). */
  estadoFactura: string;
  numero: string;
  url: string;
  tipo: TipoFactura;
  /** Solo para tipo:'rectificativa'/'corregida' — de qué factura original
      viene (reparación o revisión), para resolver a qué documento
      (numero_factura_rectificativa vs. ..._revision, etc.) corresponde
      realmente esta fila. */
  tipoOriginal?: "reparacion" | "revision";
  esAlquiler?: boolean;
  esManual?: boolean;
  /** true = este número fiscal fue real y se generó, pero quedó sustituido
      por un ciclo posterior de rectificativa/corregida (columna de un solo
      slot en reparaciones). Desde la migración 029 el total se conserva en
      factura_operaciones; para ciclos anteriores a esa fecha `total` viene
      en 0 y se muestra "—" (esa cifra ya no existe salvo en el PDF). */
  historica?: boolean;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function texto(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function urlValida(url: string): string {
  return /^https?:\/\//i.test(url) ? url : "";
}

// El original acepta cualquier valor que empiece por un dígito o "FAC-", lo
// que en producción ha dejado pasar basura real (el string "ENVIADO"/"BAJA"
// usado como marcador de estado intermedio en vez de un número, incluso una
// marca de tiempo ISO completa). Un número de factura real siempre tiene la
// forma "serie-secuencial" (1-2 dígitos de serie + guion + el correlativo),
// pero el correlativo NO siempre son 6 dígitos — hay facturas reales de 5 y
// hasta 7 (p. ej. "1-00686", "1-0004701") — así que solo se exige un mínimo
// de 4 dígitos, no exactamente 6.
const NUMERO_FACTURA_VALIDO = /^\d{1,2}-\d{4,}$/;

function numeroValido(numero: string): boolean {
  return NUMERO_FACTURA_VALIDO.test(numero);
}

/** Reproduce el intercambio numero/url de filas legacy de alquiler, donde
    a veces "numero_factura" contiene la URL y "url_factura" el número. */
function repararNumeroUrl(numero: string, url: string): { numero: string; url: string } {
  if (/^https?:\/\//i.test(numero) && NUMERO_FACTURA_VALIDO.test(url)) return { numero: url, url: numero };
  return { numero, url };
}

/** Reproduce el intercambio nombre/teléfono de filas legacy de alquiler,
    donde a veces el teléfono quedó guardado en la columna de nombre. */
function repararNombreTelefono(nombre: string, telefono: string): { nombre: string; telefono: string } {
  const pareceTelefono = (s: string) => /^[+\d\s-]{6,}$/.test(s);
  if (pareceTelefono(nombre) && telefono && !pareceTelefono(telefono)) return { nombre: telefono, telefono: nombre };
  return { nombre, telefono };
}

interface ClienteFacturaJson {
  nombre?: string | null;
  dni?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
}

/**
 * Poner otro nombre en "Cliente en la factura" al generarla (Buscar
 * cliente, o simplemente editar el campo) no cambia el cliente registrado
 * de la reparación — significa que ESA factura concreta se le cobra a otra
 * persona. cliente_factura(_revision/_mensajeria/_anticipo/_corregida)
 * guarda ese dato por factura desde que se generó (backend), pero esta
 * lista siempre mostraba el cliente registrado de la reparación sin mirar
 * esas columnas — factura tras factura, aunque cada una se hubiera cobrado
 * a alguien distinto. Solo se sobreescribe cuando el JSON trae un nombre no
 * vacío; si no, se conserva el cliente registrado (comportamiento actual).
 */
function aplicarClienteFactura(
  base: { cliente: string; telefono: string; dniCif: string },
  override: ClienteFacturaJson | string | null | undefined
): { cliente: string; telefono: string; dniCif: string } {
  // cliente_factura es jsonb (llega ya parseado como objeto), pero
  // cliente_factura_revision/_mensajeria/_corregida son columnas `text` que
  // guardan el mismo JSON como string — node-postgres no las auto-parsea.
  let o: ClienteFacturaJson | null = null;
  if (override && typeof override === "object") {
    o = override;
  } else if (typeof override === "string" && override.trim()) {
    try {
      const parsed = JSON.parse(override);
      if (parsed && typeof parsed === "object") o = parsed;
    } catch {
      o = null;
    }
  }
  const nombre = texto(o?.nombre);
  if (!nombre) return base;
  return { cliente: nombre, telefono: texto(o?.telefono) || base.telefono, dniCif: texto(o?.dni) || base.dniCif };
}

export function serieFactura(numeroFactura: string): string {
  const m = /^(\d+)-/.exec(numeroFactura || "");
  return m ? m[1] : "";
}

/** true si el total ya incluye IVA (alquiler/recogida ya lo aplican al
    guardar, junto con fianza/envío en su caso; venta también) — el resto
    de tipos guarda la base sin IVA y hay que aplicar el 21% para mostrar
    el importe real, tal como hace _fcRenderPagina() en el original. */
export function esFacturaConIvaIncluido(f: Pick<FacturaCliente, "tipo" | "esAlquiler">): boolean {
  return f.tipo === "alquiler" || f.tipo === "recogida" || f.tipo === "venta" || !!f.esAlquiler;
}

export function montoConIva(f: FacturaCliente): number {
  if (!f.total) return 0;
  return esFacturaConIvaIncluido(f) ? f.total : f.total * 1.21;
}

/** Reproduce _fcDerEstado(): una rectificativa sin estado explícito se
    considera "Devolución"; el resto cae a Cobrada/Pendiente según si hay
    forma de pago registrada. */
export function estadoFacturaDerivado(f: Pick<FacturaCliente, "tipo" | "estadoFactura" | "formaPago">): string {
  if (f.tipo === "rectificativa") return f.estadoFactura || "Devolución";
  if (f.estadoFactura) return f.estadoFactura;
  return f.formaPago && f.formaPago.trim() ? "Cobrada" : "Pendiente";
}

/** Solo reparación/revisión/alquiler/recogida se pueden marcar "Cobrada" a
    mano desde esta vista — el resto (mensajería/anticipo/rectificativa/
    corregida/manual) no tiene esa acción en el original. */
export function tipoPermiteMarcarCobrada(tipo: TipoFactura): boolean {
  return tipo === "reparacion" || tipo === "revision" || tipo === "alquiler" || tipo === "recogida";
}

const FORMA_PAGO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta bancaria",
  transferencia: "Transferencia",
  bizum: "Bizum",
  redsys: "Redsys",
};

export function formaPagoLabel(f: Pick<FacturaCliente, "formaPago">): string {
  const raw = (f.formaPago || "").toLowerCase();
  return FORMA_PAGO_LABEL[raw] || f.formaPago || "—";
}

// ── Reparaciones (pasadas 1-6 del original) ─────────────────────────────

interface FilaReparacionFacturadaSql {
  resguardo: string;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  cliente_email: string | null;
  dni_cif: string | null;
  equipo_modelo: string | null;
  estado_entrega: string | null;

  numero_factura: string | null;
  url_factura: string | null;
  total_factura: string | number | null;
  fecha_factura: string | null;
  forma_pago: string | null;
  banco: string | null;
  estado_factura: string | null;
  factura_borrador: boolean | null;
  cliente_factura: ClienteFacturaJson | string | null;

  numero_factura_revision: string | null;
  url_factura_revision: string | null;
  total_factura_revision: string | number | null;
  fecha_factura_revision: string | null;
  forma_pago_revision: string | null;
  banco_revision: string | null;
  estado_factura_revision: string | null;
  cliente_factura_revision: ClienteFacturaJson | string | null;

  numero_factura_mensajeria: string | null;
  url_factura_mensajeria: string | null;
  total_factura_mensajeria: string | number | null;
  fecha_factura_mensajeria: string | null;
  cliente_factura_mensajeria: ClienteFacturaJson | string | null;

  numero_factura_anticipo: string | null;
  url_factura_anticipo: string | null;
  anticipo_importe: string | number | null;
  estado_factura_anticipo: string | null;
  fecha_factura_anticipo: string | null;
  forma_pago_anticipo: string | null;
  cliente_factura_anticipo: ClienteFacturaJson | string | null;

  numero_factura_rectificativa: string | null;
  url_factura_rectificativa: string | null;
  total_factura_rectificativa: string | number | null;
  fecha_factura_rectificativa: string | null;
  estado_factura_rectificativa: string | null;

  numero_factura_rectificativa_revision: string | null;
  url_factura_rectificativa_revision: string | null;
  total_factura_rectificativa_revision: string | number | null;
  fecha_factura_rectificativa_revision: string | null;

  numero_factura_corregida: string | null;
  url_factura_corregida: string | null;
  total_factura_corregida: string | number | null;
  fecha_factura_corregida: string | null;

  numero_factura_corregida_revision: string | null;
  url_factura_corregida_revision: string | null;
  total_factura_corregida_revision: string | number | null;
  fecha_factura_corregida_revision: string | null;

  cliente_factura_corregida: ClienteFacturaJson | string | null;

  numero_ticket: string | null;
  url_ticket: string | null;
  fecha_ticket: string | null;
  total_ticket: string | number | null;
  estado_ticket: string | null;
}

export function expandirFacturas(row: FilaReparacionFacturadaSql): FacturaCliente[] {
  const base = {
    resguardo: texto(row.resguardo),
    cliente: texto(row.cliente_nombre),
    telefono: texto(row.cliente_telefono),
    email: texto(row.cliente_email),
    dniCif: texto(row.dni_cif),
    equipo: texto(row.equipo_modelo),
    estadoEntrega: texto(row.estado_entrega),
  };
  const facturas: FacturaCliente[] = [];

  // Pasada 1: factura de reparación (con el caso especial "mensajería sin
  // reparación" — mismo número en ambas columnas → se muestra como tipo
  // 'mensajeria' con la URL/total de esa columna).
  const numFact = texto(row.numero_factura);
  if (numFact && numeroValido(numFact) && !row.factura_borrador && row.fecha_factura) {
    let url = urlValida(texto(row.url_factura));
    let total = num(row.total_factura);
    let tipo: TipoFactura = "reparacion";
    const numMens = texto(row.numero_factura_mensajeria);
    if (numMens === numFact) {
      const urlMens = urlValida(texto(row.url_factura_mensajeria));
      const totalMens = num(row.total_factura_mensajeria);
      if (urlMens) url = urlMens;
      if (totalMens) total = totalMens;
      tipo = "mensajeria";
    }
    facturas.push({
      ...base,
      ...aplicarClienteFactura(base, tipo === "mensajeria" ? row.cliente_factura_mensajeria : row.cliente_factura),
      numero: numFact,
      url,
      total,
      fecha: row.fecha_factura,
      formaPago: texto(row.forma_pago),
      banco: texto(row.banco),
      estadoFactura: texto(row.estado_factura),
      tipo,
    });
  }

  // Pasada 2: factura de revisión.
  const numRev = texto(row.numero_factura_revision);
  if (numRev && numeroValido(numRev)) {
    facturas.push({
      ...base,
      ...aplicarClienteFactura(base, row.cliente_factura_revision),
      numero: numRev,
      url: urlValida(texto(row.url_factura_revision)),
      total: num(row.total_factura_revision),
      fecha: row.fecha_factura_revision,
      formaPago: texto(row.forma_pago_revision),
      banco: texto(row.banco_revision),
      estadoFactura: texto(row.estado_factura_revision),
      tipo: "revision",
    });
  }

  // Pasada 3: mensajería separada (evita duplicar si ya se incluyó en la 1).
  const numMens3 = texto(row.numero_factura_mensajeria);
  if (numMens3 && numeroValido(numMens3) && numMens3 !== numFact) {
    facturas.push({
      ...base,
      ...aplicarClienteFactura(base, row.cliente_factura_mensajeria),
      numero: numMens3,
      url: urlValida(texto(row.url_factura_mensajeria)),
      total: num(row.total_factura_mensajeria),
      // fecha_factura_mensajeria (migración 030): una mensajería SIN
      // factura de reparación (Presupuesto Rechazado/Reciclaje) no tenía
      // ninguna fecha propia — usaba fecha_factura, que aquí siempre es
      // NULL, y la fila quedaba invisible en cualquier filtro por fecha
      // (bug real: factura generada con PDF real, pero "desaparecida").
      fecha: row.fecha_factura_mensajeria || row.fecha_factura || null,
      formaPago: texto(row.forma_pago),
      banco: "",
      estadoFactura: "",
      tipo: "mensajeria",
    });
  }

  // Pasada 4: anticipo (base sin IVA — el frontend aplica ×1.21 igual que
  // el resto de tipos de reparaciones).
  const numAntic = texto(row.numero_factura_anticipo);
  if (numAntic && numeroValido(numAntic)) {
    facturas.push({
      ...base,
      ...aplicarClienteFactura(base, row.cliente_factura_anticipo),
      numero: numAntic,
      url: urlValida(texto(row.url_factura_anticipo)),
      total: num(row.anticipo_importe),
      // fecha_factura_anticipo/forma_pago_anticipo: el anticipo casi
      // siempre se cobra ANTES de que exista la factura de reparación
      // (fecha_factura/forma_pago), así que esas dos quedaban vacías y la
      // fila salía sin fecha ni forma de pago (bug real detectado).
      fecha: row.fecha_factura_anticipo || row.fecha_factura || null,
      formaPago: texto(row.forma_pago_anticipo) || texto(row.forma_pago),
      banco: "",
      estadoFactura: texto(row.estado_factura_anticipo),
      tipo: "anticipo",
    });
  }

  // Pasada 5: rectificativas (Serie 3) de reparación y de revisión — ambas
  // colapsan al mismo tipo 'rectificativa' en el original.
  const numRect = texto(row.numero_factura_rectificativa);
  if (numRect && numeroValido(numRect)) {
    let total = num(row.total_factura_rectificativa);
    if (!total) {
      const orig = num(row.total_factura) || num(row.total_factura_mensajeria) || num(row.total_factura_revision);
      if (orig > 0) total = -orig;
    }
    facturas.push({
      ...base,
      // Una rectificativa anula la factura original para el MISMO cliente
      // al que se le cobró (cliente_factura) — no tiene su propio campo de
      // cliente en el backend porque siempre reutiliza ese.
      ...aplicarClienteFactura(base, row.cliente_factura),
      numero: numRect,
      url: urlValida(texto(row.url_factura_rectificativa)),
      total,
      fecha: row.fecha_factura_rectificativa,
      formaPago: texto(row.forma_pago),
      banco: "",
      estadoFactura: texto(row.estado_factura_rectificativa),
      tipo: "rectificativa",
      tipoOriginal: "reparacion",
    });
  }
  const numRectRev = texto(row.numero_factura_rectificativa_revision);
  if (numRectRev && numeroValido(numRectRev)) {
    let total = num(row.total_factura_rectificativa_revision);
    if (!total) {
      const origRev = num(row.total_factura_revision);
      if (origRev > 0) total = -origRev;
    }
    facturas.push({
      ...base,
      ...aplicarClienteFactura(base, row.cliente_factura_revision),
      numero: numRectRev,
      url: urlValida(texto(row.url_factura_rectificativa_revision)),
      total,
      fecha: row.fecha_factura_rectificativa_revision,
      formaPago: texto(row.forma_pago_revision),
      banco: "",
      estadoFactura: texto(row.estado_factura_rectificativa),
      tipo: "rectificativa",
      tipoOriginal: "revision",
    });
  }

  // Pasada 6: corregidas (misma serie original, tras la rectificativa) de
  // revisión y de reparación — colapsan al mismo tipo 'corregida', con
  // tipoOriginal para distinguir el badge.
  const numCorrRev = texto(row.numero_factura_corregida_revision);
  if (numCorrRev && numeroValido(numCorrRev)) {
    facturas.push({
      ...base,
      ...aplicarClienteFactura(base, row.cliente_factura_corregida),
      numero: numCorrRev,
      url: urlValida(texto(row.url_factura_corregida_revision)),
      total: num(row.total_factura_corregida_revision),
      fecha: row.fecha_factura_corregida_revision,
      formaPago: texto(row.forma_pago_revision),
      banco: "",
      estadoFactura: "",
      tipo: "corregida",
      tipoOriginal: "revision",
    });
  }
  const numCorr = texto(row.numero_factura_corregida);
  if (numCorr && numeroValido(numCorr)) {
    facturas.push({
      ...base,
      ...aplicarClienteFactura(base, row.cliente_factura_corregida),
      numero: numCorr,
      url: urlValida(texto(row.url_factura_corregida)),
      total: num(row.total_factura_corregida),
      fecha: row.fecha_factura_corregida,
      formaPago: texto(row.forma_pago),
      banco: "",
      estadoFactura: "",
      tipo: "corregida",
      tipoOriginal: "reparacion",
    });
  }

  // Pasada 7: "Ticket Rápido" — Serie 2 (numeración propia desde 1000,
  // prefijo "2-" añadido el 2026-08-26 para encajar en el mismo formato
  // serie-correlativo que Serie 1/Serie 3, aunque una factura simplificada
  // no exige legalmente una serie). Se trata como el mismo proceso de
  // facturación desde que existe: sale en Facturas de Clientes/Reporte de
  // Facturas igual que cualquier otro tipo, con el mismo Estado
  // Cobrada/Pendiente que una factura real (antes se asumía Cobrada
  // siempre; desde que el diálogo permite elegirlo, se refleja tal cual).
  const numTicket = texto(row.numero_ticket);
  if (numTicket && numeroValido(numTicket)) {
    facturas.push({
      ...base,
      ...aplicarClienteFactura(base, row.cliente_factura),
      numero: numTicket,
      url: urlValida(texto(row.url_ticket)),
      total: num(row.total_ticket),
      fecha: row.fecha_ticket,
      formaPago: "",
      banco: "",
      estadoFactura: row.estado_ticket === "Pendiente" ? "Pendiente" : "Cobrada",
      tipo: "ticket",
    });
  }

  return facturas;
}

// ── Reparaciones: rectificativas/corregidas históricas (sustituidas) ────
// GET /v1/lecturas/reparaciones-facturas-historicas — ciclos intermedios
// de rectificar→corregir que ya no ocupan la columna vigente de
// reparaciones (ver comentario en esa ruta, server.js). El total se
// guarda en factura_operaciones.total_factura desde la migración 029 —
// para ciclos generados ANTES de esa migración, total_factura es NULL y
// se muestra "—" (esa cifra ya no existe en ningún sitio salvo el PDF).

interface FilaFacturaHistoricaSql {
  resguardo: string;
  tipo: "rectificativa" | "rectificativa_revision" | "corregida" | "corregida_revision";
  numero_factura: string;
  url_pdf: string | null;
  confirmado_en: string | null;
  total_factura: string | number | null;
  /** Foto del cliente en el momento de confirmar ESTA rectificativa/
      corregida (migración 035) — null en ciclos sustituidos antes de esa
      migración, o en cualquiera que nunca tuvo cliente distinto al del
      resguardo. Sin esto, un ciclo ya sustituido no tenía forma de saber
      a nombre de quién se emitió de verdad (bug real reportado). */
  cliente_snapshot: ClienteFacturaJson | string | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  cliente_email: string | null;
  dni_cif: string | null;
  equipo_modelo: string | null;
  estado_entrega: string | null;
  forma_pago: string | null;
  banco: string | null;
}

export function expandirFacturaHistorica(row: FilaFacturaHistoricaSql): FacturaCliente | null {
  const numero = texto(row.numero_factura);
  if (!numero || !numeroValido(numero)) return null;
  const esCorregida = row.tipo === "corregida" || row.tipo === "corregida_revision";
  const esRevision = row.tipo === "rectificativa_revision" || row.tipo === "corregida_revision";
  const base = { cliente: texto(row.cliente_nombre), telefono: texto(row.cliente_telefono), dniCif: texto(row.dni_cif) };
  const conCliente = aplicarClienteFactura(base, row.cliente_snapshot);
  return {
    resguardo: texto(row.resguardo),
    cliente: conCliente.cliente,
    telefono: conCliente.telefono,
    email: texto(row.cliente_email),
    dniCif: conCliente.dniCif,
    equipo: texto(row.equipo_modelo),
    estadoEntrega: texto(row.estado_entrega),
    fecha: row.confirmado_en,
    total: num(row.total_factura),
    formaPago: texto(row.forma_pago),
    banco: texto(row.banco),
    estadoFactura: esCorregida ? "" : "Devolución",
    numero,
    url: urlValida(texto(row.url_pdf)),
    tipo: esCorregida ? "corregida" : "rectificativa",
    tipoOriginal: esRevision ? "revision" : "reparacion",
    historica: true,
  };
}

// ── Alquileres (pasadas 7-10 del original) ──────────────────────────────

const PRECIO_RECOGIDA_CON_IVA = Math.round(12.4 * 1.21 * 100) / 100;

interface FilaAlquilerSql {
  alquiler_id: string;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  cliente_email: string | null;
  cliente_dni: string | null;
  fecha_inicio: string | null;
  total_previsto: string | number | null;
  total_cobrado: string | number | null;
  fianza_cobrada: string | number | null;
  envio_activado: string | null;
  metodo_pago: string | null;
  estado_factura: string | null;

  numero_factura: string | null;
  url_factura: string | null;

  numero_factura_rectificativa: string | null;
  url_factura_rectificativa: string | null;
  total_factura_rectificativa: string | number | null;

  /** Foto de la rectificativa vigente justo antes de generar una corregida
      (migración 039) — numero_factura_rectificativa se limpia al confirmar
      la corregida (deja de ser "la corrección activa"), así que sin esto
      esa rectificativa desaparecía por completo del listado en cuanto se
      corregía, aunque siguiera siendo un documento fiscal real y
      confirmado (bug real reportado con PDF real: factura rectificativa
      generada y confirmada, invisible en el listado tras la corregida).
      null en ciclos sustituidos antes de la migración — ese dato ya se
      perdió, no se puede reconstruir retroactivamente. */
  numero_factura_rectificativa_anterior: string | null;
  url_factura_rectificativa_anterior: string | null;
  total_factura_rectificativa_anterior: string | number | null;

  numero_factura_corregida: string | null;
  url_factura_corregida: string | null;
  total_factura_corregida: string | number | null;

  numero_factura_anterior: string | null;
  url_factura_anterior: string | null;
  total_factura_anterior: string | number | null;

  numero_factura_recogida: string | null;
  url_factura_recogida: string | null;
  estado_factura_recogida: string | null;

  numero_factura_inicial: string | null;
  url_factura_inicial: string | null;
  total_factura_inicial: string | number | null;

  cliente_factura: ClienteFacturaJson | string | null;
  /** Foto del cliente vigente cuando la factura "anterior"/"inicial"
      quedó sustituida (migración 036) — numero_factura_anterior/_inicial
      comparten fila con la factura VIGENTE, así que sin esto esas dos
      filas históricas mostraban el cliente de la corrección más reciente
      en vez del que realmente tenían (bug real reportado con PDF real).
      null en ciclos sustituidos antes de la migración — ese dato ya se
      perdió, no se puede reconstruir retroactivamente. */
  cliente_factura_anterior: ClienteFacturaJson | string | null;
  cliente_factura_inicial: ClienteFacturaJson | string | null;
}

export function expandirAlquiler(row: FilaAlquilerSql): FacturaCliente[] {
  const { nombre, telefono } = repararNombreTelefono(texto(row.cliente_nombre), texto(row.cliente_telefono));
  const clienteRegistrado = { cliente: nombre, telefono, dniCif: texto(row.cliente_dni) };
  const base = {
    resguardo: texto(row.alquiler_id),
    ...aplicarClienteFactura(clienteRegistrado, row.cliente_factura),
    email: texto(row.cliente_email),
    equipo: "",
    estadoEntrega: "",
    fecha: row.fecha_inicio,
    esAlquiler: true as const,
  };
  const facturas: FacturaCliente[] = [];

  const previsto = num(row.total_previsto);
  const fianza = num(row.fianza_cobrada);
  const envio = texto(row.envio_activado).toUpperCase() === "SI" ? PRECIO_RECOGIDA_CON_IVA : 0;

  // Pasada 7: factura principal del alquiler.
  {
    const { numero, url } = repararNumeroUrl(texto(row.numero_factura), texto(row.url_factura));
    if (numero && numeroValido(numero)) {
      const cobrado = num(row.total_cobrado);
      facturas.push({
        ...base,
        numero,
        url: urlValida(url),
        total: cobrado > 0 ? Math.round(cobrado * 100) / 100 : Math.round((previsto + fianza + envio) * 100) / 100,
        formaPago: texto(row.metodo_pago),
        banco: "",
        estadoFactura: texto(row.estado_factura),
        tipo: "alquiler",
      });
    }
  }

  // Pasada 8: rectificativa de alquiler (ajuste de duración).
  {
    const { numero, url } = repararNumeroUrl(texto(row.numero_factura_rectificativa), texto(row.url_factura_rectificativa));
    if (numero && numeroValido(numero)) {
      const totalRect = num(row.total_factura_rectificativa);
      facturas.push({
        ...base,
        numero,
        url: urlValida(url),
        total: totalRect !== 0 ? totalRect : Math.round(-(previsto + fianza) * 100) / 100,
        formaPago: texto(row.metodo_pago),
        banco: "",
        estadoFactura: "",
        tipo: "rectificativa",
      });
    }
  }

  // Pasada 8-bis: corregida de alquiler (datos legacy no promovidos aún).
  const numCorr = texto(row.numero_factura_corregida);
  if (numCorr && numeroValido(numCorr)) {
    facturas.push({
      ...base,
      numero: numCorr,
      url: urlValida(texto(row.url_factura_corregida)),
      total: num(row.total_factura_corregida),
      formaPago: texto(row.metodo_pago),
      banco: "",
      estadoFactura: texto(row.estado_factura),
      tipo: "alquiler",
    });
  }

  // Pasada 8-ter: factura activa anterior (corregida intermedia).
  const numAnt = texto(row.numero_factura_anterior);
  if (numAnt && numeroValido(numAnt)) {
    facturas.push({
      ...base,
      ...aplicarClienteFactura(clienteRegistrado, row.cliente_factura_anterior),
      numero: numAnt,
      url: urlValida(texto(row.url_factura_anterior)),
      total: num(row.total_factura_anterior),
      formaPago: texto(row.metodo_pago),
      banco: "",
      estadoFactura: texto(row.estado_factura),
      tipo: "alquiler",
    });
  }

  // Pasada 8-quater: rectificativa que quedó sustituida por una corregida
  // posterior (migración 039) — sin esto, la rectificativa desaparecía del
  // listado en cuanto se generaba la corregida, pese a seguir siendo un
  // documento fiscal real y confirmado.
  const numRectAnt = texto(row.numero_factura_rectificativa_anterior);
  if (numRectAnt && numeroValido(numRectAnt)) {
    facturas.push({
      ...base,
      numero: numRectAnt,
      url: urlValida(texto(row.url_factura_rectificativa_anterior)),
      total: num(row.total_factura_rectificativa_anterior),
      formaPago: texto(row.metodo_pago),
      banco: "",
      estadoFactura: "",
      tipo: "rectificativa",
    });
  }

  // Pasada 9: recogida a domicilio (importe fijo, siempre con IVA).
  const numRec = texto(row.numero_factura_recogida);
  if (numRec && numeroValido(numRec)) {
    facturas.push({
      ...base,
      numero: numRec,
      url: urlValida(texto(row.url_factura_recogida)),
      total: PRECIO_RECOGIDA_CON_IVA,
      formaPago: texto(row.metodo_pago),
      banco: "",
      estadoFactura: texto(row.estado_factura_recogida),
      tipo: "recogida",
    });
  }

  // Pasada 10: factura inicial (antes del ajuste/devolución).
  {
    const { numero, url } = repararNumeroUrl(texto(row.numero_factura_inicial), texto(row.url_factura_inicial));
    if (numero && numeroValido(numero)) {
      const totalInicial = num(row.total_factura_inicial);
      facturas.push({
        ...base,
        ...aplicarClienteFactura(clienteRegistrado, row.cliente_factura_inicial),
        numero,
        url: urlValida(url),
        total: totalInicial > 0 ? totalInicial : Math.round((previsto + fianza + envio) * 100) / 100,
        formaPago: texto(row.metodo_pago),
        banco: "",
        estadoFactura: "",
        tipo: "alquiler",
      });
    }
  }

  return facturas;
}

// ── Facturas manuales (pasada 11 del original) ──────────────────────────

interface FilaFacturaManualSql {
  id: string;
  numero_factura: string | null;
  fecha_factura: string | null;
  cliente_nombre: string | null;
  cliente_dni: string | null;
  cliente_telefono: string | null;
  cliente_email: string | null;
  forma_pago: string | null;
  banco: string | null;
  total_factura: string | number | null;
  url_factura: string | null;
  estado_factura: string | null;
  num_factura_rectificativa: string | null;
  url_factura_rectificativa: string | null;
  total_factura_rectificativa: string | number | null;
  fecha_factura_rectificativa: string | null;
  numero_factura_corregida: string | null;
  url_factura_corregida: string | null;
  total_factura_corregida: string | number | null;
}

/** Recorre TODAS las filas de golpe (no una por una) porque la corregida
    de una factura manual solo se muestra si esa factura no tiene ya su
    propia fila en la tabla — hace falta el índice completo de IDs para
    saberlo, igual que `_manIdsExistentes` en el original. */
export function expandirManuales(filas: FilaFacturaManualSql[]): FacturaCliente[] {
  const idsExistentes = new Set(filas.map((f) => texto(f.id)).filter(Boolean));
  const facturas: FacturaCliente[] = [];

  for (const row of filas) {
    const numM = texto(row.numero_factura);
    if (!numM) continue;
    const idM = texto(row.id);
    const resguardoM = idM || `MANUAL-${numM}`;
    const totalM = num(row.total_factura);
    const base = {
      cliente: texto(row.cliente_nombre),
      telefono: texto(row.cliente_telefono),
      email: texto(row.cliente_email),
      dniCif: texto(row.cliente_dni),
      equipo: "",
      estadoEntrega: "",
      esManual: true as const,
    };

    facturas.push({
      ...base,
      resguardo: resguardoM,
      numero: numM,
      url: urlValida(texto(row.url_factura)),
      total: totalM,
      fecha: row.fecha_factura,
      formaPago: texto(row.forma_pago),
      banco: texto(row.banco),
      estadoFactura: texto(row.estado_factura),
      tipo: "manual",
    });

    const numRectM = texto(row.num_factura_rectificativa);
    if (numRectM) {
      facturas.push({
        ...base,
        resguardo: resguardoM,
        numero: numRectM,
        url: urlValida(texto(row.url_factura_rectificativa)),
        total: num(row.total_factura_rectificativa),
        fecha: row.fecha_factura_rectificativa,
        formaPago: texto(row.forma_pago),
        banco: texto(row.banco),
        estadoFactura: "Devolución",
        tipo: "rectificativa",
      });
    }

    const numCorrM = texto(row.numero_factura_corregida);
    if (numCorrM && !idsExistentes.has(`MANUAL-${numCorrM}`)) {
      facturas.push({
        ...base,
        resguardo: `MANUAL-${numCorrM}`,
        numero: numCorrM,
        url: urlValida(texto(row.url_factura_corregida)),
        total: num(row.total_factura_corregida) || totalM,
        fecha: row.fecha_factura,
        formaPago: texto(row.forma_pago),
        banco: texto(row.banco),
        estadoFactura: "Emitida",
        tipo: "manual",
      });
    }
  }

  return facturas;
}

// ── Ventas (solo usadas por Reporte de Facturas, no por la lista de
// Facturas de Clientes — el original tampoco las incluye ahí) ──────────

interface FilaVentaSql {
  venta_id: string;
  numero_factura: string | null;
  fecha: string | null;
  fecha_entrega: string | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  cliente_email: string | null;
  monto_pagado: string | number | null;
}

export function expandirVenta(row: FilaVentaSql): FacturaCliente[] {
  const numV = texto(row.numero_factura);
  if (!numV) return [];
  return [
    {
      resguardo: texto(row.venta_id),
      numero: numV,
      url: "",
      cliente: texto(row.cliente_nombre),
      telefono: texto(row.cliente_telefono),
      email: texto(row.cliente_email),
      dniCif: "",
      equipo: "",
      estadoEntrega: "",
      fecha: row.fecha_entrega || row.fecha,
      total: num(row.monto_pagado),
      formaPago: "",
      banco: "",
      estadoFactura: "",
      tipo: "venta",
    },
  ];
}
