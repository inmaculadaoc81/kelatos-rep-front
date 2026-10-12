/**
 * Reporte de reseñas: respuestas de la encuesta de satisfacción por WhatsApp
 * (n8n + Chatwoot). Backend: encuestasWhatsapp.js → GET /v1/encuestas-resenas.
 * Una fila por conversación con sus dos respuestas y un veredicto.
 */

/** Texto exacto de cada pregunta de la encuesta de WhatsApp (plantilla Meta
    "encuesta_satisfaccion_servicio_v2", flujo n8n) — vive fuera de este
    código (Chatwoot/n8n), así que se deja fijo aquí para poder mostrarlo
    en el informe ("Pregunta 1"/"Pregunta 2" son solo el número de orden,
    no el enunciado). Si el texto de la plantilla cambia algún día en n8n,
    hay que actualizarlo aquí también a mano. */
export const TEXTO_PREGUNTA_ENCUESTA: Record<1 | 2, string> = {
  1: "¿Cómo valorarías la atención recibida por nuestro equipo?",
  2: "¿Cómo valorarías el resultado del servicio realizado?",
};

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
  /** Desglose por pregunta (P1: atención recibida, P2: resultado del
      servicio) — son preguntas distintas, cada una con su propio
      positiva/negativa (muy_bueno+bueno vs. malo+muy_malo), independiente
      del veredicto combinado. */
  p1Positivas: number;
  p1Negativas: number;
  p2Positivas: number;
  p2Negativas: number;
  totalLista: number;
  servicios: string[];
  filas: FilaResena[];
}

export interface Valoracion {
  id: number;
  conversation_id: number;
  usado_en: string;
  email: string;
  email_verificado?: boolean;
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

export type EstadoEnvioResena = "pendiente" | "enviado" | "cancelado" | "fallido";

export interface EnvioResenaProgramado {
  origen: "reparacion" | "alquiler";
  id: string;
  referencia: string;
  cliente: string;
  telefono: string;
  detalle: string;
  estado_reparacion: string;
  estado: EstadoEnvioResena;
  enviar_en: string | null;
  creado_en: string | null;
  enviado_en: string | null;
  dias_restantes: number | null;
  intentos: number;
  ultimo_error: string;
}

export interface ProximosEnvios {
  ok: boolean;
  filas: EnvioResenaProgramado[];
  resumen: Record<EstadoEnvioResena, number>;
}
