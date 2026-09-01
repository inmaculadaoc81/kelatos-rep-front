import { FacturaCliente, TipoFactura } from "@/lib/facturas-cliente";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface FacturaConDesglose extends FacturaCliente {
  serie: "1" | "3" | "4";
  baseImponible: number;
  iva: number;
  /** Total CON IVA — sustituye a `total` (que en FacturaCliente es la base
      para la mayoría de tipos) para que el resto de la vista no tenga que
      volver a mirar `tipo` para saber si hace falta convertir. */
  totalConIva: number;
  codigoCliente: string;
}

/**
 * Reproduce el paso de mapeo de apiObtenerReporteFacturas(): añade serie y
 * desglose de IVA a cada factura. Alquiler y venta ya guardan el total CON
 * IVA; el resto (incluida "recogida", que en la lista de Facturas de
 * Clientes sí lo lleva ya incluido) se trata aquí como base sin IVA — es
 * una inconsistencia real del original, no un error de esta réplica.
 * Los tickets (prefijo "4-", Serie 4 propia desde 2026-08-27 — antes
 * compartían numeración con Serie 1/3) usan el mismo criterio sin IVA
 * incluido que el resto. Antes de esta corrección, cualquier número que no
 * empezara por "3-" se clasificaba como Serie 1 sin más — los tickets
 * quedaban mezclados ahí, invisibles como categoría propia y sin forma de
 * filtrarlos por separado (bug real reportado, 2026-09-01).
 */
export function calcularDesglose(f: FacturaCliente): FacturaConDesglose {
  const serie: "1" | "3" | "4" = /^3-/.test(f.numero) ? "3" : /^4-/.test(f.numero) ? "4" : "1";
  const totalNum = Number(f.total) || 0;
  let baseImponible: number;
  let iva: number;
  let totalConIva: number;
  if (f.tipo === "alquiler" || f.tipo === "venta") {
    baseImponible = round2(totalNum / 1.21);
    iva = round2(totalNum - baseImponible);
    totalConIva = totalNum;
  } else {
    baseImponible = round2(totalNum);
    iva = round2(baseImponible * 0.21);
    totalConIva = round2(baseImponible + iva);
  }
  return { ...f, serie, baseImponible, iva, totalConIva, codigoCliente: f.codigoCliente || "" };
}

export function numeroDocumento(factura: string): number {
  const partes = factura.includes("-") ? factura.split("-")[1] : "";
  return parseInt(partes, 10) || 0;
}

/** Solo estos 7 tipos son elegibles en el desplegable "Tipo" del original —
    recogida/corregida/manual quedan fuera de ese filtro aunque sí aparezcan
    en la tabla y en "Totales por tipo". */
export const RF_TIPOS_FILTRABLES: TipoFactura[] = [
  "reparacion",
  "revision",
  "mensajeria",
  "anticipo",
  "rectificativa",
  "alquiler",
  "venta",
  "ticket",
];

/** Etiquetas/colores de "Totales por tipo" — deliberadamente distintos de
    ETIQUETA_TIPO_FACTURA (p. ej. "Revisión" en vez de "Revisión Pagada"):
    el original define este mapa aparte (RF_TIPOS) solo para esta vista. */
export const RF_TIPO_ESTILO: Partial<Record<TipoFactura, { label: string; bg: string; color: string }>> = {
  reparacion: { label: "Reparación", bg: "#0d6efd", color: "#fff" },
  revision: { label: "Revisión", bg: "#0dcaf0", color: "#000" },
  anticipo: { label: "Anticipo", bg: "#ffc107", color: "#000" },
  mensajeria: { label: "Mensajería", bg: "#6c757d", color: "#fff" },
  alquiler: { label: "Alquiler", bg: "#198754", color: "#fff" },
  rectificativa: { label: "Rectificativa", bg: "#dc3545", color: "#fff" },
  recogida: { label: "Recogida", bg: "#6c757d", color: "#fff" },
  corregida: { label: "Corregida", bg: "#212529", color: "#fff" },
  venta: { label: "Venta", bg: "#0d6efd", color: "#fff" },
  ticket: { label: "Ticket", bg: "#20c997", color: "#fff" },
};

// Reproduce _n() del original: coma decimal, SIN separador de miles — el
// CSV va a Excel, no a mostrarse en la interfaz, y toLocaleString() añadiría
// puntos de millar que el original nunca escribe en este archivo.
function numeroCsv(n: number): string {
  return (n || 0).toFixed(2).replace(".", ",");
}

function fechaCsv(iso: string | null): string {
  if (!iso) return "";
  const p = iso.slice(0, 10).split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : "";
}

function celdaCsv(valor: string | number): string {
  const s = String(valor);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Reproduce apiExportarReporteFacturasCsv() del original — separador ";",
 * coma decimal, BOM UTF-8 para Excel, cabecera con el período/series/fecha
 * de generación y fila de totales al final. Se genera aquí mismo en el
 * navegador (los datos ya están en el cliente) en vez de pedirlo al
 * backend como hacía el original.
 */
export function generarCsvReporte(
  facturas: FacturaConDesglose[],
  opciones: { fechaDesde: string; fechaHasta: string; series: string[]; docDesde: number; docHasta: number; usuario: string }
): string {
  const filas: string[] = [];
  const fila = (...celdas: (string | number)[]) => filas.push(celdas.map(celdaCsv).join(";"));

  const seriesLabel = opciones.series.map((s) => `Serie ${s}`).join(", ");
  const docsLabel = opciones.docDesde > 0 || opciones.docHasta < 999999 ? `N.º ${opciones.docDesde} — ${opciones.docHasta}` : "Todos";

  fila("REPORTE DE FACTURAS", "Kelatos");
  fila("Período", `${fechaCsv(opciones.fechaDesde)} — ${fechaCsv(opciones.fechaHasta)}`);
  fila("Series", seriesLabel, "Documentos", docsLabel);
  fila("Generado", new Date().toLocaleString("es-ES"), "Usuario", opciones.usuario);
  filas.push("");

  fila("S.", "N.º Factura", "Fecha", "Cód. Cliente", "Cliente", "N.I.F./C.I.F.", "Base Imp.", "% IVA", "Cuota IVA", "Rec. Eq.", "Total");

  let totBase = 0;
  let totIva = 0;
  let totTotal = 0;
  for (const f of facturas) {
    const numPart = f.numero.includes("-") ? f.numero.split("-")[1] : f.numero;
    fila(f.serie, `="${numPart}"`, fechaCsv(f.fecha), f.codigoCliente, f.cliente, f.dniCif, numeroCsv(f.baseImponible), "21", numeroCsv(f.iva), numeroCsv(0), numeroCsv(f.totalConIva));
    totBase += f.baseImponible;
    totIva += f.iva;
    totTotal += f.totalConIva;
  }

  filas.push("");
  fila("", "", "", "", "", "TOTALES", numeroCsv(totBase), "", numeroCsv(totIva), numeroCsv(0), numeroCsv(totTotal), `${facturas.length} facturas`);

  return `﻿${filas.join("\r\n")}`;
}

export function descargarCsv(contenido: string, nombre: string) {
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
