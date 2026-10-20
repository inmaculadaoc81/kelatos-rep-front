/**
 * Vista "TPV" (Facturación): parte diario de lo facturado por cada método
 * de pago (tarjeta, tarjeta virtual, bizum, transferencia, efectivo),
 * para que el personal de tienda lo cuadre contra lo que calcula el
 * sistema a partir de facturas/tickets. Aquí no se lista un libro de
 * movimientos: se agrega directamente un total por día+método a
 * comparar. "efectivo" se añadió el 2026-10-12 (fusión con lo que antes
 * era "Tarjetas") para que el desglose de un día muestre TODOS los tipos
 * de pago juntos — no sustituye ni toca la vista "Efectivo"
 * (lib/efectivo.ts), que sigue siendo el libro de movimientos/retiradas
 * de caja; esto es solo una fila más de reconciliación aquí. Petición del
 * usuario, 2026-10-09/12.
 */
import { FacturaCliente, ETIQUETA_TIPO_FACTURA, estadoFacturaDerivado, montoConIva } from "@/lib/facturas-cliente";
import { BANCOS } from "@/lib/bancos";

export const METODOS_TPV = [
  { value: "tarjeta", label: "Tarjeta bancaria" },
  { value: "tarjeta_virtual", label: "Tarjeta virtual" },
  { value: "bizum", label: "Bizum" },
  { value: "transferencia", label: "Transferencia bancaria" },
  { value: "efectivo", label: "Efectivo" },
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

/**
 * Forma de pago de un documento → método TPV + banco. Los documentos de alquiler guardan el TEXTO "Tarjeta bancaria"
 * (metodo_pago) en vez del código "tarjeta", y algunas facturas de reparación "BBVA · tarjeta bancaria": sin normalizar,
 * el cálculo los descartaba y el "Sistema" salía por debajo (caso real, 2026-10-15: alquiler ALQ-0054, factura de 12,10 y
 * rectificativa de -260,50 ignoradas). Los códigos ya normalizados salen igual que antes.
 */
const ALIAS_METODO_TPV: Record<string, string> = {
  "tarjeta bancaria": "tarjeta",
  "tarjeta virtual": "tarjeta_virtual",
  "transferencia bancaria": "transferencia",
};
const FORMA_PAGO_COMBINADO_RE = /^(.+?)\s*·\s*tarjeta bancaria$/i;

export function normalizarFormaTpv(formaPago: string | null | undefined, banco: string | null | undefined): { metodo: string; banco: string | null } {
  const original = (formaPago || "").trim();
  const combinado = FORMA_PAGO_COMBINADO_RE.exec(original);
  if (combinado) return { metodo: "tarjeta", banco: combinado[1].trim() };
  const raw = original.toLowerCase();
  return { metodo: ALIAS_METODO_TPV[raw] ?? raw, banco: (banco || "").trim() || null };
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

    const { metodo } = normalizarFormaTpv(f.formaPago, f.banco);
    if (!METODOS_TPV_VALORES.includes(metodo)) continue;
    const importe = redondear(Math.abs(montoConIva(f)));
    suma(dia, metodo, esRectificativa ? -importe : importe);
  }

  return out;
}

// ── Desglose por banco (tarjeta/transferencia) para la vista de un día ──
// Petición del usuario, 2026-10-12: que "Tarjeta bancaria" y
// "Transferencia bancaria" no se sumen en una sola fila, sino una fila por
// banco (mismo dato "banco" que ya guarda tarjeta desde siempre, extendido
// a transferencia ese mismo día). segunSistemaPorDia()/METODOS_TPV NO se
// tocan — los sigue usando el calendario mensual (ahí no hace falta tanto
// detalle) y el libro de movimientos.

const SIN_BANCO = "_sin_banco";

export interface FilaDesgloseTpv {
  clave: string;
  metodo: MetodoTpv;
  banco: string | null;
  label: string;
}

/** Filas que SIEMPRE se muestran (haya o no movimiento ese día) — mismo
    criterio ya usado para METODOS_TPV. Las filas "sin banco" (datos de
    antes de este cambio, sin banco guardado) se añaden aparte, solo si
    tienen importe, para no ensuciar un día ya migrado. */
export const FILAS_DESGLOSE_TPV: FilaDesgloseTpv[] = [
  ...BANCOS.map((b) => ({ clave: `tarjeta:${b}`, metodo: "tarjeta" as MetodoTpv, banco: b, label: `Tarjeta bancaria · ${b}` })),
  { clave: "tarjeta_virtual", metodo: "tarjeta_virtual" as MetodoTpv, banco: null, label: "Tarjeta virtual" },
  { clave: "bizum", metodo: "bizum" as MetodoTpv, banco: null, label: "Bizum" },
  ...BANCOS.map((b) => ({ clave: `transferencia:${b}`, metodo: "transferencia" as MetodoTpv, banco: b, label: `Transferencia bancaria · ${b}` })),
  { clave: "efectivo", metodo: "efectivo" as MetodoTpv, banco: null, label: "Efectivo" },
];

export function claveDesgloseTpv(metodo: string, banco: string | null | undefined): string {
  if (metodo === "tarjeta" || metodo === "transferencia") {
    const b = (banco || "").trim();
    return b ? `${metodo}:${b}` : `${metodo}:${SIN_BANCO}`;
  }
  return metodo;
}

export function filaDesgloseSinBanco(metodo: "tarjeta" | "transferencia"): FilaDesgloseTpv {
  return {
    clave: `${metodo}:${SIN_BANCO}`,
    metodo,
    banco: null,
    label: `${etiquetaMetodoTpv(metodo)} · Sin especificar`,
  };
}

/** Igual que segunSistemaPorDia() pero la clave es claveDesgloseTpv() en
    vez del método plano — una entrada por banco para tarjeta/transferencia. */
export function segunSistemaPorDiaDesglosado(facturas: FacturaCliente[]): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  const suma = (dia: string, clave: string, delta: number) => {
    if (!dia) return;
    if (!out[dia]) out[dia] = {};
    out[dia][clave] = redondear((out[dia][clave] || 0) + delta);
  };

  for (const f of facturas) {
    const dia = diaMadrid(f.fecha);
    if (!dia) continue;

    const esMultiforma = (f.formaPago || "").trim().toLowerCase() === "multiforma";
    const esDevolucionManualNegativa = f.tipo === "manual" && f.total < 0;
    const esRectificativa = f.tipo === "rectificativa" || esDevolucionManualNegativa;
    if (!esRectificativa && estadoFacturaDerivado(f) !== "Cobrada") continue;

    if (esMultiforma) {
      if (!f.formaPagoDesglose?.length) continue;
      for (const d of f.formaPagoDesglose) {
        if (!METODOS_TPV_VALORES.includes(d.forma)) continue;
        const monto = redondear(d.monto);
        if (monto <= 0) continue;
        suma(dia, claveDesgloseTpv(d.forma, d.banco), esRectificativa ? -monto : monto);
      }
      continue;
    }

    const { metodo, banco } = normalizarFormaTpv(f.formaPago, f.banco);
    if (!METODOS_TPV_VALORES.includes(metodo)) continue;
    const importe = redondear(Math.abs(montoConIva(f)));
    suma(dia, claveDesgloseTpv(metodo, banco), esRectificativa ? -importe : importe);
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
  /** Solo relevante cuando metodo es tarjeta/transferencia — para filtrar
      el listado de movimientos por banco en el desglose del día. */
  banco: string | null;
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
        const entradaDesglose = f.formaPagoDesglose.find((d) => d.forma === metodo);
        out.push({
          id: `doc:${f.numero}:${metodo}`,
          fecha: f.fecha,
          tipo: esRectificativa ? "devolucion" : "cobro",
          metodo,
          banco: entradaDesglose?.banco || null,
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

    const { metodo, banco } = normalizarFormaTpv(f.formaPago, f.banco);
    if (!METODOS_TPV_VALORES.includes(metodo)) continue;
    const importeAbs = redondear(Math.abs(montoConIva(f)));
    out.push({
      id: `doc:${f.numero}`,
      fecha: f.fecha,
      tipo: esRectificativa ? "devolucion" : "cobro",
      metodo: metodo as MetodoTpv,
      banco,
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
