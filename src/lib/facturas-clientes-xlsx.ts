import type { SheetData } from "write-excel-file/browser";
import {
  FacturaCliente,
  estadoFacturaDerivado,
  etiquetaTipo,
  formaPagoLabel,
  montoConIva,
  serieFactura,
} from "@/lib/facturas-cliente";
import { fechaMadrid } from "@/lib/reportes";

const NEGRITA = { fontWeight: "bold" as const };
const FORMATO_EURO = "#,##0.00 €";

type Celda = string | number | { value: string | number | null; type?: typeof Number | typeof String; format?: string; fontWeight?: "bold" };
const cab = (t: string): Celda => ({ value: t, ...NEGRITA });
const euro = (n: number): Celda => ({ value: Math.round(n * 100) / 100, type: Number, format: FORMATO_EURO });
const euroNegrita = (n: number): Celda => ({ value: Math.round(n * 100) / 100, type: Number, format: FORMATO_EURO, ...NEGRITA });
const negrita = (t: string): Celda => ({ value: t, ...NEGRITA });

function fechaES(iso: string | null): string {
  const d = fechaMadrid(iso);
  if (!d) return "";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

/** Importe con IVA con el signo correcto: una rectificativa/devolución resta (aunque en origen venga en positivo). */
function importeFirmado(f: FacturaCliente): number {
  const m = montoConIva(f);
  const estado = estadoFacturaDerivado(f);
  return f.tipo === "rectificativa" || estado === "Devolución" ? -Math.abs(m) : m;
}

/** Cómo se reparte el cobro de un documento entre formas de pago (las «multiforma» se desglosan). */
function partesPago(f: FacturaCliente): { etiqueta: string; importe: number }[] {
  const total = importeFirmado(f);
  if ((f.formaPago || "").trim().toLowerCase() === "multiforma" && f.formaPagoDesglose?.length) {
    const signo = total < 0 ? -1 : 1;
    return f.formaPagoDesglose.map((d) => ({
      etiqueta: formaPagoLabel({ formaPago: d.forma, banco: d.banco || "", formaPagoDesglose: null }),
      importe: signo * Math.abs(Number(d.monto) || 0),
    }));
  }
  return [{ etiqueta: formaPagoLabel(f), importe: total }];
}

async function guardar(hojas: { data: SheetData; sheet: string; anchos: number[] }[], nombre: string) {
  // Import dinámico: write-excel-file/browser usa un Web Worker y no debe entrar en el bundle del servidor.
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  await writeExcelFile(hojas.map((h) => ({ data: h.data, sheet: h.sheet, columns: h.anchos.map((width) => ({ width })) }))).toFile(nombre);
}

/** Documentos cuyo día (hora de Madrid) está entre `desde` y `hasta` (YYYY-MM-DD, ambos incluidos), de más antiguo a más reciente. */
export function facturasEnRango(lista: FacturaCliente[], desde: string, hasta: string): FacturaCliente[] {
  return lista
    .filter((f) => {
      const d = fechaMadrid(f.fecha);
      return !!d && (!desde || d >= desde) && (!hasta || d <= hasta);
    })
    .sort((a, b) => (Date.parse(a.fecha || "") || 0) - (Date.parse(b.fecha || "") || 0) || a.numero.localeCompare(b.numero, "es", { numeric: true }));
}

/**
 * Excel para verificar ingresos: hoja «Facturas» (una fila por documento, con base, IVA, total, forma de pago, banco y estado) y hoja «Resumen»
 * (ingresos cobrados por forma de pago y por mes; lo pendiente y lo anulado va aparte para que no se mezcle con lo cobrado).
 */
export async function descargarXlsxFacturasClientes(lista: FacturaCliente[], desde: string, hasta: string): Promise<number> {
  const docs = facturasEnRango(lista, desde, hasta);

  const filas: Celda[][] = [[
    cab("Fecha"), cab("Mes"), cab("Nº documento"), cab("Serie"), cab("Tipo"), cab("Resguardo / ref."), cab("Cliente"), cab("DNI / CIF"), cab("Equipo"),
    cab("Base imponible"), cab("IVA"), cab("Total con IVA"), cab("Forma de pago"), cab("Banco"), cab("Estado"), cab("Enlace al PDF"),
  ]];
  for (const f of docs) {
    const total = importeFirmado(f);
    const base = total / 1.21; // «total» ya es con IVA (montoConIva): base e IVA se deducen del 21 %
    const fecha = fechaMadrid(f.fecha) || "";
    filas.push([
      fechaES(f.fecha),
      fecha.slice(0, 7),
      f.numero,
      serieFactura(f.numero) ? `Serie ${serieFactura(f.numero)}` : "",
      etiquetaTipo(f),
      f.resguardo,
      f.cliente,
      f.dniCif,
      f.equipo,
      euro(base),
      euro(total - base),
      euro(total),
      formaPagoLabel(f),
      f.banco || "",
      estadoFacturaDerivado(f),
      f.url || "",
    ]);
  }

  // ── Resumen ──
  const cobrados = docs.filter((f) => ["Cobrada", "Devolución"].includes(estadoFacturaDerivado(f)));
  const porForma = new Map<string, { n: number; importe: number }>();
  for (const f of cobrados) for (const p of partesPago(f)) {
    const a = porForma.get(p.etiqueta) || { n: 0, importe: 0 };
    a.n += 1; a.importe += p.importe; porForma.set(p.etiqueta, a);
  }
  const porMes = new Map<string, { cobradas: number; importeCobrado: number; devoluciones: number; importeDevuelto: number }>();
  for (const f of cobrados) {
    const mes = (fechaMadrid(f.fecha) || "").slice(0, 7);
    const a = porMes.get(mes) || { cobradas: 0, importeCobrado: 0, devoluciones: 0, importeDevuelto: 0 };
    const t = importeFirmado(f);
    if (t < 0) { a.devoluciones += 1; a.importeDevuelto += t; } else { a.cobradas += 1; a.importeCobrado += t; }
    porMes.set(mes, a);
  }
  const otros = new Map<string, { n: number; importe: number }>();
  for (const f of docs) {
    const e = estadoFacturaDerivado(f);
    if (e === "Cobrada" || e === "Devolución") continue;
    const a = otros.get(e) || { n: 0, importe: 0 };
    a.n += 1; a.importe += importeFirmado(f); otros.set(e, a);
  }

  const resumen: Celda[][] = [
    [negrita(`Facturas de clientes del ${fechaES(`${desde}T12:00:00Z`)} al ${fechaES(`${hasta}T12:00:00Z`)}`)],
    ["Solo cuentan como ingreso los documentos Cobrados menos las Devoluciones. Pendientes y Anulados van aparte."],
    [],
    [cab("INGRESOS POR FORMA DE PAGO"), cab("Nº de pagos"), cab("Importe con IVA")],
  ];
  let totalIngresos = 0;
  for (const [k, v] of [...porForma.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"))) { resumen.push([k, v.n, euro(v.importe)]); totalIngresos += v.importe; }
  resumen.push([negrita("TOTAL INGRESOS (cobrado − devoluciones)"), "", euroNegrita(totalIngresos)]);
  resumen.push([]);
  resumen.push([cab("INGRESOS POR MES"), cab("Cobradas"), cab("Importe cobrado"), cab("Devoluciones"), cab("Importe devuelto"), cab("Neto")]);
  for (const [mes, v] of [...porMes.entries()].sort()) resumen.push([mes, v.cobradas, euro(v.importeCobrado), v.devoluciones, euro(v.importeDevuelto), euro(v.importeCobrado + v.importeDevuelto)]);
  resumen.push([]);
  resumen.push([cab("NO CUENTAN COMO INGRESO"), cab("Nº"), cab("Importe con IVA")]);
  for (const [k, v] of [...otros.entries()].sort()) resumen.push([k, v.n, euro(v.importe)]);
  if (!otros.size) resumen.push(["(ninguno)"]);

  await guardar([
    { data: filas as SheetData, sheet: "Facturas", anchos: [12, 9, 14, 9, 14, 14, 30, 14, 26, 14, 12, 14, 26, 14, 12, 50] },
    { data: resumen as SheetData, sheet: "Resumen", anchos: [44, 14, 18, 14, 18, 16] },
  ], `facturas-clientes-${desde}_a_${hasta}.xlsx`);
  return docs.length;
}
