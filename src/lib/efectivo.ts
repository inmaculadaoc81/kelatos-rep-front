/**
 * Vista "Efectivo" (Facturación). Libro de caja de efectivo derivado de los
 * documentos ya existentes — no se duplica ningún cobro en otra tabla:
 *  - cobro: factura/ticket Cobrado con forma de pago Efectivo → suma.
 *  - devolución: rectificativa de un documento pagado en efectivo → resta
 *    (siempre en negativo, aunque el total venga guardado en positivo).
 *  - retirada: salida de caja registrada por un superadmin
 *    (kelatos_app.efectivo_retiradas) → resta.
 * Petición del usuario, 2026-09-21.
 */
import { FacturaCliente, ETIQUETA_TIPO_FACTURA, estadoFacturaDerivado, montoConIva } from "@/lib/facturas-cliente";

/** La caja de efectivo empieza a contarse este día (AAAA-MM-DD, hora de
    Madrid): lo cobrado antes no entra en el saldo salvo que se elija
    "Todo el historial" en la vista. Petición del usuario, 2026-09-21. */
export const EFECTIVO_INICIO_CONTEO = "2026-09-21";

/** cobro/devolución salen de facturas y tickets; retirada e ingreso los
    registra a mano un superadmin (ingreso = efectivo que ya había, sin documento). */
export type TipoMovimientoEfectivo = "cobro" | "devolucion" | "retirada" | "ingreso";

export interface MovimientoEfectivo {
  id: string;
  fecha: string | null;
  tipo: TipoMovimientoEfectivo;
  /** De dónde viene el dinero: Reparación / Alquiler / Venta de piezas /
      Factura manual / Ticket manual (vacío en retiradas). */
  origen: string;
  /** Tipo de documento (Ticket, Reparación, Rectificativa…) o el motivo de
      la retirada. */
  concepto: string;
  /** Resguardo / ID de alquiler / pedido al que pertenece (vacío en
      retiradas y en documentos manuales sin reparación asociada). */
  referencia: string;
  numero: string;
  cliente: string;
  /** Con signo: positivo entra en caja, negativo sale. */
  importe: number;
  /** Rectificativa histórica sin importe guardado (ciclos anteriores a la
      migración 029): consta la devolución pero no se puede restar nada. */
  sinImporte?: boolean;
  /** Solo retiradas. */
  retiradaId?: number;
  usuario?: string;
  anulada?: boolean;
  anuladaMotivo?: string;
}

export interface RetiradaEfectivoApi {
  id: number | string;
  fecha_hora: string;
  importe: number;
  /** Ausente en registros anteriores a la migración 102 (= "retirada"). */
  tipo?: "retirada" | "ingreso";
  motivo: string | null;
  usuario: string;
  anulada_en: string | null;
  anulada_por: string | null;
  anulada_motivo: string | null;
}

/** "efectivo" / "Efectivo" / " EFECTIVO " — los distintos formularios lo
    guardan con mayúsculas distintas. Un pago combinado ("BBVA · tarjeta
    bancaria") nunca es efectivo. */
export function esFormaPagoEfectivo(formaPago: string | null | undefined): boolean {
  return (formaPago || "").trim().toLowerCase() === "efectivo";
}

function origenDe(f: FacturaCliente): string {
  if (f.esAlquiler || f.tipo === "alquiler" || f.tipo === "recogida") return "Alquiler";
  if (f.esVenta) return "Venta de piezas";
  if (f.esTicketManual) return "Ticket manual";
  if (f.esManual || f.tipo === "manual") return "Factura manual";
  return "Reparación";
}

function conceptoDe(f: FacturaCliente): string {
  if (f.tipo === "rectificativa" || f.tipo === "corregida") {
    const original =
      f.tipoOriginal === "ticket" || f.tipoOriginal === "ticket_revision" || f.tipoOriginal === "venta_ticket" ? "ticket" : "factura";
    return `${ETIQUETA_TIPO_FACTURA[f.tipo]} de ${original}`;
  }
  const etiqueta = ETIQUETA_TIPO_FACTURA[f.tipo] || f.tipo;
  return f.esTicket && f.tipo === "revision" ? "Ticket de revisión" : etiqueta;
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Documentos en efectivo → movimientos con signo. */
export function movimientosDeFacturas(facturas: FacturaCliente[]): MovimientoEfectivo[] {
  const out: MovimientoEfectivo[] = [];
  for (const f of facturas) {
    if (!esFormaPagoEfectivo(f.formaPago)) continue;

    const esRectificativa = f.tipo === "rectificativa";
    // Un documento Pendiente/Anulado aún no ha movido dinero; una
    // rectificativa sí, siempre (es la devolución del cobro original).
    if (!esRectificativa && estadoFacturaDerivado(f) !== "Cobrada") continue;

    const importeAbs = redondear(Math.abs(montoConIva(f)));
    out.push({
      id: `doc:${f.numero}`,
      fecha: f.fecha,
      tipo: esRectificativa ? "devolucion" : "cobro",
      origen: origenDe(f),
      concepto: conceptoDe(f),
      referencia: f.resguardo,
      numero: f.numero,
      cliente: f.cliente,
      importe: esRectificativa ? -importeAbs : importeAbs,
      sinImporte: esRectificativa && importeAbs === 0 ? true : undefined,
    });
  }
  return out;
}

export function movimientosDeRetiradas(retiradas: RetiradaEfectivoApi[]): MovimientoEfectivo[] {
  return retiradas.map((r) => {
    const esIngreso = r.tipo === "ingreso";
    return {
    id: `ret:${r.id}`,
    fecha: r.fecha_hora,
    tipo: (esIngreso ? "ingreso" : "retirada") as TipoMovimientoEfectivo,
    origen: "",
    concepto: (r.motivo || "").trim() || (esIngreso ? "Ingreso de efectivo" : "Retirada de efectivo"),
    referencia: "",
    numero: "",
    cliente: "",
    importe: esIngreso ? redondear(Number(r.importe) || 0) : -redondear(Number(r.importe) || 0),
    retiradaId: Number(r.id),
    usuario: r.usuario,
    anulada: !!r.anulada_en,
    anuladaMotivo: r.anulada_motivo || undefined,
    };
  });
}

export interface MovimientoConSaldo extends MovimientoEfectivo {
  /** Saldo de caja tras este movimiento (sobre TODO el historial, no solo
      el rango filtrado). */
  saldo: number;
}

/** Ordena cronológicamente, calcula el saldo acumulado (las retiradas
    anuladas no cuentan) y devuelve la lista más reciente primero. */
export function conSaldoAcumulado(movimientos: MovimientoEfectivo[]): MovimientoConSaldo[] {
  const ascendente = [...movimientos].sort((a, b) => {
    const ta = a.fecha ? new Date(a.fecha).getTime() : 0;
    const tb = b.fecha ? new Date(b.fecha).getTime() : 0;
    return ta - tb || a.id.localeCompare(b.id);
  });
  let saldo = 0;
  const out = ascendente.map((m) => {
    if (!m.anulada) saldo = redondear(saldo + m.importe);
    return { ...m, saldo };
  });
  return out.reverse();
}

export interface ResumenEfectivo {
  cobros: number;
  /** Efectivo añadido a mano (p. ej. el que ya había en el local). */
  ingresos: number;
  devoluciones: number;
  retiradas: number;
  neto: number;
}

/** Totales de una lista de movimientos (devoluciones/retiradas en positivo,
    para poder mostrarlas como "− X" sin doble negación). */
export function resumir(movimientos: MovimientoEfectivo[]): ResumenEfectivo {
  let cobros = 0;
  let ingresos = 0;
  let devoluciones = 0;
  let retiradas = 0;
  for (const m of movimientos) {
    if (m.anulada) continue;
    if (m.tipo === "cobro") cobros += m.importe;
    else if (m.tipo === "ingreso") ingresos += m.importe;
    else if (m.tipo === "devolucion") devoluciones += -m.importe;
    else retiradas += -m.importe;
  }
  return {
    cobros: redondear(cobros),
    ingresos: redondear(ingresos),
    devoluciones: redondear(devoluciones),
    retiradas: redondear(retiradas),
    neto: redondear(cobros + ingresos - devoluciones - retiradas),
  };
}
