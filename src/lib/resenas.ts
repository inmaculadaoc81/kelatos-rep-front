/**
 * Reporte de reseñas: respuestas de la encuesta de satisfacción por WhatsApp
 * (n8n + Chatwoot). Backend: encuestasWhatsapp.js → GET /v1/encuestas-resenas.
 * Una fila por conversación con sus dos respuestas y un veredicto.
 */

export type RespuestaEncuesta = "muy_bueno" | "bueno" | "malo" | "muy_malo";
export type VeredictoEncuesta = "positiva" | "negativa" | "incompleta";

export const ETIQUETA_RESPUESTA: Record<RespuestaEncuesta, string> = {
  muy_bueno: "Muy bueno",
  bueno: "Bueno",
  malo: "Malo",
  muy_malo: "Muy malo",
};

export const ETIQUETA_VEREDICTO: Record<VeredictoEncuesta, string> = {
  positiva: "Positiva",
  negativa: "Mala reseña",
  incompleta: "Sin terminar",
};

export interface FilaResena {
  conversation_id: number;
  cliente_nombre: string | null;
  telefono: string | null;
  servicio: string | null;
  id_registro: string | null;
  destino: string | null;
  p1: RespuestaEncuesta | null;
  p2: RespuestaEncuesta | null;
  veredicto: VeredictoEncuesta;
  formulario: "respondido" | "enlace_enviado" | "caducado" | null;
  respuestas: number;
  primera: string;
  ultima: string;
}

export interface ReporteResenas {
  ok: boolean;
  total: number;
  positivas: number;
  negativas: number;
  incompletas: number;
  totalLista: number;
  servicios: string[];
  filas: FilaResena[];
}

export interface Valoracion {
  id: number;
  conversation_id: number;
  usado_en: string;
  email: string;
  motivos: string[];
  comentario: string | null;
  contactar: boolean;
  atendido: boolean;
  atendido_por: string | null;
  atendido_en: string | null;
  cliente_nombre: string | null;
  telefono: string | null;
  servicio: string | null;
  id_registro: string | null;
  p1: RespuestaEncuesta | null;
  p2: RespuestaEncuesta | null;
}

export interface ReporteValoraciones {
  ok: boolean;
  total: number;
  pendientes: number;
  enlacesSinUsar: number;
  motivos: { id: string; etiqueta: string }[];
  filas: Valoracion[];
}
