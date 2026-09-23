/**
 * Exportación CSV del Libro de Compras (libro de IVA soportado) para el
 * gestor/asesor fiscal — mismo patrón que generarCsvReporte() en
 * reporte-facturas.ts (separador ";", coma decimal, BOM UTF-8 para Excel,
 * fila de totales al final), generado en el navegador desde filas ya
 * cargadas por el cliente.
 */
import { FacturaRecibida, ETIQUETA_CATEGORIA, ETIQUETA_ALMACEN, ETIQUETA_ESTADO_PAGO } from "./facturas-recibidas";

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

export function generarCsvLibroCompras(
  facturas: FacturaRecibida[],
  opciones: { desde: string; hasta: string; usuario: string }
): string {
  const filas: string[] = [];
  const fila = (...celdas: (string | number)[]) => filas.push(celdas.map(celdaCsv).join(";"));

  fila("LIBRO DE COMPRAS", "Kelatos");
  fila("Período", `${fechaCsv(opciones.desde) || "Todos"} — ${fechaCsv(opciones.hasta) || "todos"}`);
  fila("Generado", new Date().toLocaleString("es-ES"), "Usuario", opciones.usuario);
  filas.push("");

  fila(
    "Fecha expedición", "Nº recepción", "Proveedor", "NIF/CIF", "Nº factura proveedor", "Serie", "Tipo documento",
    "Base imponible", "% IVA", "Cuota IVA soportado", "Cuota IVA deducible", "IVA no deducible", "Total",
    "Categoría", "Almacén", "Estado de pago", "Estado de revisión"
  );

  let totBase = 0;
  let totCuotaSoportado = 0;
  let totCuotaDeducible = 0;
  let totTotal = 0;
  for (const f of facturas) {
    fila(
      fechaCsv(f.fechaExpedicion), f.numeroRecepcion, f.proveedorNombre, f.proveedorDniCif, f.numeroFacturaProveedor, f.serieProveedor,
      f.tipoDocumento || "", numeroCsv(f.baseImponible), f.tipoIva !== null ? numeroCsv(f.tipoIva) : "",
      numeroCsv(f.cuotaIvaSoportado || 0), numeroCsv(f.cuotaIvaDeducible), numeroCsv(f.ivaNoDeducible || 0), numeroCsv(f.importeTotal),
      f.categoria ? ETIQUETA_CATEGORIA[f.categoria] : "", f.almacen ? ETIQUETA_ALMACEN[f.almacen] : "",
      ETIQUETA_ESTADO_PAGO[f.estadoPago], f.estadoRevision === "validada" ? "Validada" : "Pendiente"
    );
    totBase += f.baseImponible;
    totCuotaSoportado += f.cuotaIvaSoportado || 0;
    totCuotaDeducible += f.cuotaIvaDeducible;
    totTotal += f.importeTotal;
  }

  filas.push("");
  fila(
    "", "", "", "", "", "", "TOTALES",
    numeroCsv(totBase), "", numeroCsv(totCuotaSoportado), numeroCsv(totCuotaDeducible), "", numeroCsv(totTotal),
    "", "", "", `${facturas.length} factura${facturas.length !== 1 ? "s" : ""}`
  );

  return `﻿${filas.join("\r\n")}`;
}

export { descargarCsv } from "./reporte-facturas";
