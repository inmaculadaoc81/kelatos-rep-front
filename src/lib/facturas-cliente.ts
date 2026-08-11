/**
 * "Facturas de Clientes" y "Reporte de Facturas" (Index.html) leen ambas de
 * la misma fuente en el original — reparaciones con al menos un campo de
 * factura poblado — y aquí igual: GET /v1/lecturas/reparaciones-facturadas
 * devuelve la reparación completa (hasta 8 campos de factura posibles:
 * normal/revisión/mensajería/anticipo/rectificativa[+revisión]/
 * corregida[+revisión]), y esta función la expande a una fila por factura
 * real encontrada — una reparación con normal + revisión produce 2 filas.
 */

interface FilaReparacionFacturadaSql {
  resguardo: string;
  cliente_nombre: string | null;
  dni_cif: string | null;
  equipo_modelo: string | null;
  fecha_entrega: string | null;
  estado: string | null;

  numero_factura: string | null;
  url_factura: string | null;
  total_factura: string | number | null;

  numero_factura_revision: string | null;
  url_factura_revision: string | null;
  total_factura_revision: string | number | null;
  fecha_factura_revision: string | null;
  forma_pago_revision: string | null;

  numero_factura_mensajeria: string | null;
  url_factura_mensajeria: string | null;
  total_factura_mensajeria: string | number | null;

  numero_factura_anticipo: string | null;
  url_factura_anticipo: string | null;
  anticipo_importe: string | number | null;
  banco_anticipo: string | null;

  numero_factura_rectificativa: string | null;
  url_factura_rectificativa: string | null;
  total_factura_rectificativa: string | number | null;
  fecha_factura_rectificativa: string | null;

  numero_factura_rectificativa_revision: string | null;
  url_factura_rectificativa_revision: string | null;
  total_factura_rectificativa_revision: string | number | null;
  fecha_factura_rectificativa_revision: string | null;

  numero_factura_corregida: string | null;
  url_factura_corregida: string | null;
  total_factura_corregida: string | number | null;

  numero_factura_corregida_revision: string | null;
  url_factura_corregida_revision: string | null;
  total_factura_corregida_revision: string | number | null;
  fecha_factura_corregida_revision: string | null;
}

export type TipoFactura =
  | "normal"
  | "revision"
  | "mensajeria"
  | "anticipo"
  | "rectificativa"
  | "rectificativa_revision"
  | "corregida"
  | "corregida_revision";

export const ETIQUETA_TIPO_FACTURA: Record<TipoFactura, string> = {
  normal: "Reparación",
  revision: "Revisión",
  mensajeria: "Mensajería",
  anticipo: "Anticipo",
  rectificativa: "Rectificativa",
  rectificativa_revision: "Rectificativa (revisión)",
  corregida: "Corregida",
  corregida_revision: "Corregida (revisión)",
};

export interface FacturaCliente {
  resguardo: string;
  cliente: string;
  dniCif: string;
  equipo: string;
  estado: string;
  tipo: TipoFactura;
  numero: string;
  url: string;
  /** IVA incluido — así se guardan todos los totales en este sistema. */
  total: number;
  fecha: string | null;
  formaPago: string;
}

function numero(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function expandirFacturas(row: FilaReparacionFacturadaSql): FacturaCliente[] {
  const base = {
    resguardo: row.resguardo,
    cliente: row.cliente_nombre || "",
    dniCif: row.dni_cif || "",
    equipo: row.equipo_modelo || "",
    estado: row.estado || "",
  };

  const candidatas: { tipo: TipoFactura; numero: string | null; url: string | null; total: unknown; fecha: string | null; formaPago?: string | null }[] = [
    { tipo: "normal", numero: row.numero_factura, url: row.url_factura, total: row.total_factura, fecha: row.fecha_entrega },
    { tipo: "revision", numero: row.numero_factura_revision, url: row.url_factura_revision, total: row.total_factura_revision, fecha: row.fecha_factura_revision, formaPago: row.forma_pago_revision },
    { tipo: "mensajeria", numero: row.numero_factura_mensajeria, url: row.url_factura_mensajeria, total: row.total_factura_mensajeria, fecha: row.fecha_entrega },
    { tipo: "anticipo", numero: row.numero_factura_anticipo, url: row.url_factura_anticipo, total: row.anticipo_importe, fecha: row.fecha_entrega, formaPago: row.banco_anticipo },
    { tipo: "rectificativa", numero: row.numero_factura_rectificativa, url: row.url_factura_rectificativa, total: row.total_factura_rectificativa, fecha: row.fecha_factura_rectificativa },
    { tipo: "rectificativa_revision", numero: row.numero_factura_rectificativa_revision, url: row.url_factura_rectificativa_revision, total: row.total_factura_rectificativa_revision, fecha: row.fecha_factura_rectificativa_revision },
    { tipo: "corregida", numero: row.numero_factura_corregida, url: row.url_factura_corregida, total: row.total_factura_corregida, fecha: row.fecha_entrega },
    { tipo: "corregida_revision", numero: row.numero_factura_corregida_revision, url: row.url_factura_corregida_revision, total: row.total_factura_corregida_revision, fecha: row.fecha_factura_corregida_revision },
  ];

  return candidatas
    // Los campos numero_factura_*/url_factura_* no siempre llevan lo que
    // dicen: se ha visto "ENVIADO"/"BAJA" como marcador de estado
    // intermedio en vez de un número real, e incluso una marca de tiempo
    // ISO completa en un campo de revisión — un ^\d+- suelto la habría
    // colado, porque el año también empieza por dígitos y guion. El
    // patrón real es serie (1-2 dígitos) + guion + 6 dígitos, como
    // "1-000438" o "3-000172".
    .filter((c) => c.numero && /^\d{1,2}-\d{6}$/.test(c.numero.trim()))
    .map((c) => ({
      ...base,
      tipo: c.tipo,
      numero: c.numero as string,
      url: c.url && /^https?:\/\//i.test(c.url) ? c.url : "",
      total: numero(c.total),
      fecha: c.fecha,
      formaPago: c.formaPago || "",
    }));
}
