/**
 * Tipos para "Recogidas a Domicilio" — los eventos vienen de Google
 * Calendar (Apps Script nunca genera id_evento; el dashboard solo lee y
 * actualiza estado/detalle, nunca crea una recogida). GET genérico
 * /v1/recogidas, PATCH /v1/recogidas/:idEvento (upsert de estado+detalle).
 */

export const ESTADOS_RECOGIDA = [
  "Pedido de recogida",
  "Recogida Pagada",
  "Pago pendiente",
  "No contesta",
  "Recogida Realizada",
  "Recibido en local",
] as const;

export type EstadoRecogida = (typeof ESTADOS_RECOGIDA)[number];

export interface Recogida {
  idEvento: string;
  fecha: string | null;
  hora: string;
  cliente: string;
  asunto: string;
  telefono: string;
  email: string;
  direccion: string;
  notas: string;
  estado: string;
  noSeguimiento: string;
  fechaActualizacion: string | null;
  actualizadoPor: string;
  observaciones: string;
}

interface FilaRecogidaSql {
  id_evento: string;
  fecha: string | null;
  hora: string | null;
  cliente: string | null;
  asunto: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  notas: string | null;
  estado: string | null;
  no_seguimiento: string | null;
  fecha_actualizacion: string | null;
  actualizado_por: string | null;
  observaciones: string | null;
}

export function mapearRecogida(row: FilaRecogidaSql): Recogida {
  return {
    idEvento: row.id_evento,
    fecha: row.fecha || null,
    hora: row.hora || "",
    cliente: row.cliente || "",
    asunto: row.asunto || "",
    telefono: row.telefono || "",
    email: row.email || "",
    direccion: row.direccion || "",
    notas: row.notas || "",
    estado: row.estado || "",
    noSeguimiento: row.no_seguimiento || "",
    fechaActualizacion: row.fecha_actualizacion || null,
    actualizadoPor: row.actualizado_por || "",
    observaciones: row.observaciones || "",
  };
}

export interface DatosEditarRecogida {
  nuevoEstado: EstadoRecogida;
  numeroSeguimiento: string;
  observaciones: string;
}
