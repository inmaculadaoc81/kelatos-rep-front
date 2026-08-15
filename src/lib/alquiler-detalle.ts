/**
 * Detalle de un alquiler (kelatos_app.alquileres) para el modal con tabs de
 * Facturas de Clientes (PDF/Enviar + Devolución) — equivalente a
 * factura-manual.ts, pero para GET /v1/alquileres/:id (ya usado por
 * /api/alquileres/[id]/facturas, ahora también expuesto en su propia ruta
 * de solo lectura).
 */

interface FilaAlquilerRaw {
  alquiler_id: string;
  equipo_id: string;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  cliente_email: string | null;
  cliente_dni: string | null;
  cliente_direccion: string | null;
  fecha_inicio: string | null;
  fecha_fin_prevista: string | null;
  meses: number | null;
  semanas: number | null;
  dias: number | null;
  precio_dia: string | number | null;
  precio_semana: string | number | null;
  precio_mes: string | number | null;
  fianza_cobrada: string | number | null;
  total_previsto: string | number | null;
  total_cobrado: string | number | null;
  estado_factura: string | null;
  metodo_pago: string | null;
  numero_factura: string | null;
  url_factura: string | null;
  numero_factura_rectificativa: string | null;
  url_factura_rectificativa: string | null;
  total_factura_rectificativa: string | number | null;
  numero_factura_corregida: string | null;
  url_factura_corregida: string | null;
  total_factura_corregida: string | number | null;
  numero_factura_inicial: string | null;
  url_factura_inicial: string | null;
  total_factura_inicial: string | number | null;
  numero_factura_anterior: string | null;
  url_factura_anterior: string | null;
  total_factura_anterior: string | number | null;
  envio_activado: boolean | string | null;
  recogida_activada: boolean | string | null;
}

export interface AlquilerFacturaDetalle {
  resguardo: string;
  equipoId: string;
  cliente: { nombre: string; dni: string; telefono: string; email: string; direccion: string };
  fechaInicio: string | null;
  fechaFinPrevista: string | null;
  duracion: { meses: number; semanas: number; dias: number };
  tarifas: { precioDia: number; precioSemana: number; precioMes: number };
  numeroFactura: string;
  urlFactura: string;
  totalFactura: number;
  formaPago: string;
  estadoFactura: string;
  rectificativa: { numeroFactura: string; urlFactura: string; totalFactura: number } | null;
  corregida: { numeroFactura: string; urlFactura: string; totalFactura: number } | null;
  /** Versión activa antes de un ajuste de duración/corrección — misma fila
      de kelatos_app.alquileres, mismo resguardo que la factura activa, pero
      es un documento YA SUSTITUIDO (ver Pasada 10 en facturas-cliente.ts). */
  inicial: { numeroFactura: string; urlFactura: string; totalFactura: number } | null;
  /** Versión activa justo antes de la corrección MÁS RECIENTE (distinta de
      "inicial" si ha habido más de un ciclo). */
  anterior: { numeroFactura: string; urlFactura: string; totalFactura: number } | null;
  envioActivado: boolean;
  recogidaActivada: boolean;
}

function numero(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
}

function activo(v: boolean | string | null): boolean {
  return v === true || String(v || "").toUpperCase() === "SI";
}

export function mapAlquilerFacturaDetalle(row: FilaAlquilerRaw): AlquilerFacturaDetalle {
  return {
    resguardo: row.alquiler_id,
    equipoId: row.equipo_id,
    cliente: {
      nombre: row.cliente_nombre || "",
      dni: row.cliente_dni || "",
      telefono: row.cliente_telefono || "",
      email: row.cliente_email || "",
      direccion: row.cliente_direccion || "",
    },
    fechaInicio: row.fecha_inicio,
    fechaFinPrevista: row.fecha_fin_prevista,
    duracion: { meses: row.meses || 0, semanas: row.semanas || 0, dias: row.dias || 0 },
    tarifas: { precioDia: numero(row.precio_dia), precioSemana: numero(row.precio_semana), precioMes: numero(row.precio_mes) },
    numeroFactura: row.numero_factura || "",
    urlFactura: row.url_factura || "",
    totalFactura: numero(row.total_cobrado) || numero(row.total_previsto),
    formaPago: row.metodo_pago || "",
    estadoFactura: row.estado_factura || "",
    rectificativa: row.numero_factura_rectificativa
      ? { numeroFactura: row.numero_factura_rectificativa, urlFactura: row.url_factura_rectificativa || "", totalFactura: numero(row.total_factura_rectificativa) }
      : null,
    corregida: row.numero_factura_corregida
      ? { numeroFactura: row.numero_factura_corregida, urlFactura: row.url_factura_corregida || "", totalFactura: numero(row.total_factura_corregida) }
      : null,
    inicial: row.numero_factura_inicial
      ? { numeroFactura: row.numero_factura_inicial, urlFactura: row.url_factura_inicial || "", totalFactura: numero(row.total_factura_inicial) }
      : null,
    anterior: row.numero_factura_anterior
      ? { numeroFactura: row.numero_factura_anterior, urlFactura: row.url_factura_anterior || "", totalFactura: numero(row.total_factura_anterior) }
      : null,
    envioActivado: activo(row.envio_activado),
    recogidaActivada: activo(row.recogida_activada),
  };
}
