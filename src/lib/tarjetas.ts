/**
 * Vista "Tarjetas" (Facturación). Hermana exacta de "Efectivo"
 * (lib/efectivo.ts) — mismo libro de movimientos derivado de los documentos
 * ya existentes (cobro/devolución), pero filtrando forma de pago tarjeta +
 * tarjeta virtual en vez de efectivo, y sin retiradas (no hay caja física
 * que vaciar). Añade, por día, una celda editable con lo que confirma el
 * banco (kelatos_app.tarjetas_importes) — sin "saldo acumulado": a
 * diferencia del efectivo, el dinero de tarjeta nunca se queda "en caja",
 * así que no tiene sentido una cifra de saldo corriente. Petición del
 * usuario, 2026-10-10.
 */
import { FacturaCliente, ETIQUETA_TIPO_FACTURA, estadoFacturaDerivado, montoConIva } from "@/lib/facturas-cliente";
import { montoPorFormaDesglose } from "@/lib/tpv";

export type TipoMovimientoTarjeta = "cobro" | "devolucion";

export interface MovimientoTarjeta {
  id: string;
  fecha: string | null;
  tipo: TipoMovimientoTarjeta;
  origen: string;
  concepto: string;
  referencia: string;
  numero: string;
  cliente: string;
  /** Con signo: positivo es un cobro, negativo una devolución. */
  importe: number;
  sinImporte?: boolean;
}

export interface TarjetasImporteApi {
  id: number | string;
  fecha: string;
  importe_banco: number;
  notas: string;
  usuario: string;
  creado_en: string;
  actualizado_en: string;
  actualizado_por: string | null;
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
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

/** Parte en tarjeta (física + virtual sumadas) de una factura "Multiforma". */
function montoTarjetaDesglose(desglose: FacturaCliente["formaPagoDesglose"]): number {
  return redondear(montoPorFormaDesglose(desglose, "tarjeta") + montoPorFormaDesglose(desglose, "tarjeta_virtual"));
}

/** Documentos pagados con tarjeta (física o virtual) → movimientos con
    signo — misma lógica que movimientosDeFacturas() en lib/efectivo.ts. */
export function movimientosDeTarjetas(facturas: FacturaCliente[]): MovimientoTarjeta[] {
  const out: MovimientoTarjeta[] = [];
  for (const f of facturas) {
    const metodo = (f.formaPago || "").trim().toLowerCase();
    const esMultiforma = metodo === "multiforma";
    const montoTarjetaMulti = esMultiforma ? montoTarjetaDesglose(f.formaPagoDesglose) : 0;
    const esTarjetaDirecta = metodo === "tarjeta" || metodo === "tarjeta_virtual";
    if (!esTarjetaDirecta && !(esMultiforma && montoTarjetaMulti > 0)) continue;

    const esDevolucionManualNegativa = f.tipo === "manual" && f.total < 0;
    const esRectificativa = f.tipo === "rectificativa" || esDevolucionManualNegativa;
    if (!esRectificativa && estadoFacturaDerivado(f) !== "Cobrada") continue;

    const importeAbs = redondear(esMultiforma ? montoTarjetaMulti : Math.abs(montoConIva(f)));
    out.push({
      id: `doc:${f.numero}`,
      fecha: f.fecha,
      tipo: esRectificativa ? "devolucion" : "cobro",
      origen: origenDe(f),
      concepto: esMultiforma ? `${conceptoDe(f)} (parte en tarjeta)` : conceptoDe(f),
      referencia: f.resguardo,
      numero: f.numero,
      cliente: f.cliente,
      importe: esRectificativa ? -importeAbs : importeAbs,
      sinImporte: esRectificativa && importeAbs === 0 ? true : undefined,
    });
  }
  return out;
}

export interface ResumenTarjetas {
  cobros: number;
  devoluciones: number;
  neto: number;
}

/** Totales de una lista de movimientos (devoluciones en positivo, para
    poder mostrarlas como "− X" sin doble negación) — mismo criterio que
    resumir() en lib/efectivo.ts. */
export function resumir(movimientos: MovimientoTarjeta[]): ResumenTarjetas {
  let cobros = 0;
  let devoluciones = 0;
  for (const m of movimientos) {
    if (m.tipo === "cobro") cobros += m.importe;
    else devoluciones += -m.importe;
  }
  return { cobros: redondear(cobros), devoluciones: redondear(devoluciones), neto: redondear(cobros - devoluciones) };
}
