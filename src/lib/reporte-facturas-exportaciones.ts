/**
 * Historial de exportaciones CSV del Reporte de Facturas — funcionalidad
 * nueva (el original apiExportarReporteFacturasCsv() generaba el CSV sin
 * dejar ningún rastro de quién/cuándo/con qué filtros exportó). Respaldada
 * por kelatos_app.reporte_facturas_exportaciones (ver migración 022 en
 * kelatos-rep-back), servida vía las rutas CRUD genéricas /v1/:table.
 */

export interface ExportacionReporteFacturas {
  id: string;
  fechaHora: string;
  usuario: string;
  fechaDesde: string;
  fechaHasta: string;
  series: string;
  docDesde: number | null;
  docHasta: number | null;
  filtroTexto: string;
  numFacturas: number;
  totalExportado: number;
}

interface FilaExportacionSql {
  id: string | number;
  fecha_hora: string;
  usuario: string | null;
  fecha_desde: string;
  fecha_hasta: string;
  series: string | null;
  doc_desde: number | null;
  doc_hasta: number | null;
  filtro_texto: string | null;
  num_facturas: number | null;
  total_exportado: string | number | null;
}

export function mapearExportacion(row: FilaExportacionSql): ExportacionReporteFacturas {
  return {
    id: String(row.id),
    fechaHora: row.fecha_hora,
    usuario: row.usuario || "",
    fechaDesde: row.fecha_desde,
    fechaHasta: row.fecha_hasta,
    series: row.series || "",
    docDesde: row.doc_desde,
    docHasta: row.doc_hasta,
    filtroTexto: row.filtro_texto || "",
    numFacturas: Number(row.num_facturas) || 0,
    totalExportado: Number(row.total_exportado) || 0,
  };
}

export interface DatosRegistrarExportacion {
  fechaDesde: string;
  fechaHasta: string;
  series: string[];
  docDesde: number;
  docHasta: number;
  filtroTexto: string;
  numFacturas: number;
  totalExportado: number;
}
