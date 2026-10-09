/**
 * Vista "TPV" (Facturación): parte diario de lo facturado por cada método
 * de pago NO efectivo (tarjeta, tarjeta virtual, bizum, transferencia),
 * para que el personal de tienda lo cuadre contra lo que calcula el
 * sistema a partir de facturas/tickets. Hermana de "Efectivo"
 * (lib/efectivo.ts), pero aquí no se lista un libro de movimientos: se
 * agrega directamente un total por día+método a comparar. Petición del
 * usuario, 2026-10-09.
 */
import { FacturaCliente, ETIQUETA_TIPO_FACTURA, estadoFacturaDerivado, montoConIva } from "@/lib/facturas-cliente";

export const METODOS_TPV = [
  { value: "tarjeta", label: "Tarjeta bancaria" },
  { value: "tarjeta_virtual", label: "Tarjeta virtual" },
  { value: "bizum", label: "Bizum" },
  { value: "transferencia", label: "Transferencia bancaria" },
] as const;

export type MetodoTpv = (typeof METODOS_TPV)[number]["value"];

const METODOS_TPV_VALORES: readonly string[] = METODOS_TPV.map((m) => m.value);

export function etiquetaMetodoTpv(metodo: string): string {
  return METODOS_TPV.find((m) => m.value === metodo)?.label || metodo;
}

export interface TpvImporteApi {
  id: number | string;
  fecha: string;
  metodo: string;
  importe_declarado: number;
  notas: string;
  usuario: string;
  creado_en: string;
  actualizado_en: string;
  actualizado_por: string | null;
}

export interface TpvFotoApi {
  id: number | string;
  fecha: string;
  drive_file_id: string;
  nombre_original: string | null;
  subido_por: string;
  creado_en: string;
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Parte de una factura "Multiforma" en un método concreto — generaliza
    montoEfectivoDesglose() de lib/efectivo.ts a cualquier método. */
export function montoPorFormaDesglose(desglose: FacturaCliente["formaPagoDesglose"], metodo: string): number {
  if (!desglose?.length) return 0;
  return redondear(desglose.filter((d) => d.forma === metodo).reduce((acc, d) => acc + d.monto, 0));
}

const TIMEZONE = "Europe/Madrid";

export function diaMadrid(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("sv-SE", { timeZone: TIMEZONE });
}

export function hoyMadrid(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: TIMEZONE });
}

/**
 * Según el sistema, cuánto se facturó cada día por cada método TPV (neto:
 * cobros − devoluciones de rectificativas) — misma lógica de
 * movimientosDeFacturas() en lib/efectivo.ts, pero agregada por día+método
 * en vez de listada documento a documento: aquí solo hace falta el total
 * a cuadrar, no el detalle.
 */
export function segunSistemaPorDia(facturas: FacturaCliente[]): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  const suma = (dia: string, metodo: string, delta: number) => {
    if (!dia) return;
    if (!out[dia]) out[dia] = {};
    out[dia][metodo] = redondear((out[dia][metodo] || 0) + delta);
  };

  for (const f of facturas) {
    const dia = diaMadrid(f.fecha);
    if (!dia) continue;

    const esMultiforma = (f.formaPago || "").trim().toLowerCase() === "multiforma";
    // Misma excepción que lib/efectivo.ts: una "Nueva Factura Manual" con
    // total negativo es una devolución creada a mano, aunque no tenga
    // num_factura_rectificativa.
    const esDevolucionManualNegativa = f.tipo === "manual" && f.total < 0;
    const esRectificativa = f.tipo === "rectificativa" || esDevolucionManualNegativa;
    if (!esRectificativa && estadoFacturaDerivado(f) !== "Cobrada") continue;

    if (esMultiforma) {
      if (!f.formaPagoDesglose?.length) continue;
      for (const metodo of METODOS_TPV_VALORES) {
        const monto = montoPorFormaDesglose(f.formaPagoDesglose, metodo);
        if (monto > 0) suma(dia, metodo, esRectificativa ? -monto : monto);
      }
      continue;
    }

    const metodo = (f.formaPago || "").trim().toLowerCase();
    if (!METODOS_TPV_VALORES.includes(metodo)) continue;
    const importe = redondear(Math.abs(montoConIva(f)));
    suma(dia, metodo, esRectificativa ? -importe : importe);
  }

  return out;
}

// ── Libro de movimientos (vista "TPV" al estilo Efectivo/Tarjetas) ──────

export type TipoMovimientoTpv = "cobro" | "devolucion";

export interface MovimientoTpv {
  id: string;
  fecha: string | null;
  tipo: TipoMovimientoTpv;
  metodo: MetodoTpv;
  origen: string;
  concepto: string;
  referencia: string;
  numero: string;
  cliente: string;
  /** Con signo: positivo es un cobro, negativo una devolución. */
  importe: number;
  sinImporte?: boolean;
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

/** Documentos pagados por alguno de los métodos TPV → movimientos con
    signo, uno por método (una Multiforma puede generar varios) — misma
    lógica que movimientosDeFacturas()/movimientosDeTarjetas(), pero sin
    combinar métodos entre sí (aquí cada uno se declara/cuadra por
    separado). */
export function movimientosDeTpv(facturas: FacturaCliente[]): MovimientoTpv[] {
  const out: MovimientoTpv[] = [];
  for (const f of facturas) {
    const esMultiforma = (f.formaPago || "").trim().toLowerCase() === "multiforma";
    const esDevolucionManualNegativa = f.tipo === "manual" && f.total < 0;
    const esRectificativa = f.tipo === "rectificativa" || esDevolucionManualNegativa;
    if (!esRectificativa && estadoFacturaDerivado(f) !== "Cobrada") continue;

    if (esMultiforma) {
      if (!f.formaPagoDesglose?.length) continue;
      for (const metodo of METODOS_TPV_VALORES as readonly MetodoTpv[]) {
        const monto = redondear(montoPorFormaDesglose(f.formaPagoDesglose, metodo));
        if (monto <= 0) continue;
        out.push({
          id: `doc:${f.numero}:${metodo}`,
          fecha: f.fecha,
          tipo: esRectificativa ? "devolucion" : "cobro",
          metodo,
          origen: origenDe(f),
          concepto: `${conceptoDe(f)} (parte en ${etiquetaMetodoTpv(metodo).toLowerCase()})`,
          referencia: f.resguardo,
          numero: f.numero,
          cliente: f.cliente,
          importe: esRectificativa ? -monto : monto,
        });
      }
      continue;
    }

    const metodo = (f.formaPago || "").trim().toLowerCase();
    if (!METODOS_TPV_VALORES.includes(metodo)) continue;
    const importeAbs = redondear(Math.abs(montoConIva(f)));
    out.push({
      id: `doc:${f.numero}`,
      fecha: f.fecha,
      tipo: esRectificativa ? "devolucion" : "cobro",
      metodo: metodo as MetodoTpv,
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
