/**
 * Panel "Notificaciones de presupuestos (webhook)" del navbar original
 * (offcanvasNotif en Index.html): eventos de un webhook que interpreta
 * respuestas de email de clientes a presupuestos enviados (aceptación,
 * rechazo, o casos ambiguos que requieren revisión manual). Backend ya
 * expone kelatos_app.webhook_eventos vía GET /v1/lecturas/webhook-eventos
 * (filtros + no_leidas) y PATCH /v1/webhook_eventos/:id genérico.
 */
export interface WebhookEvento {
  id: string;
  fecha: string | null;
  numero_presupuesto: string | null;
  resguardo: string | null;
  estado: "Aviso" | "Aceptado" | "Rechazado" | string;
  email_cliente: string | null;
  nombre_cliente: string | null;
  respuesta_cliente: string | null;
  importe: string | number | null;
  motivo: string | null;
  leida: boolean;
  /** Message-ID del correo original (lo aporta n8n) — cuando está presente,
      "Responder consulta" contesta DENTRO del mismo hilo en vez de mandar
      un correo nuevo. */
  message_id_original?: string | null;
}

/** Mismo diccionario que MOTIVO_LABELS en Index.html, para que el motivo del aviso sea legible. */
export const MOTIVO_LABELS: Record<string, string> = {
  NO_SE_IDENTIFICO_QUE_PRESUPUESTO: "No se pudo identificar qué presupuesto aceptó",
  INTENCIONES_CONTRADICTORIAS: "Respuesta con señales contradictorias",
  INTENCION_NO_EXPLICITA: "La intención no es clara",
  MAPA_PRESUPUESTOS_NO_ENCONTRADO: "No se encontró el marcador de presupuesto en el email",
  RESPUESTA_VACIA_O_NO_EXTRAIBLE: "Respuesta vacía o ilegible",
  DATOS_DE_SELECCION_CONTRADICTORIOS: "Señales de selección contradictorias",
  PRECIO_APROXIMADO_SIN_COINCIDENCIA_SEGURA: "Precio mencionado no coincide con ningún presupuesto",
  PRECIO_EXACTO_REPETIDO: "Precio exacto coincide con varios presupuestos",
  EMPATE_PRECIO_MINIMO: "Varios presupuestos con el mismo precio mínimo",
  EMPATE_PRECIO_MAXIMO: "Varios presupuestos con el mismo precio máximo",
  ACEPTACION_EXPLICITA: "Aceptación explícita del cliente",
  RECHAZO_EXPLICITO: "Rechazo explícito del cliente",
  // Motivos propios del matching por resguardo/referencia legacy (backend,
  // server.js: _resolverActualizarEstadoPorResguardo/ReferenciaLegacy).
  DATOS_INCOMPLETOS: "Faltan datos (resguardo, email o importe) para localizar el presupuesto",
  SIN_COINCIDENCIA: "Ningún presupuesto coincide con resguardo, email e importe (con IVA)",
  MULTIPLES_COINCIDENCIAS: "Varios presupuestos coinciden con resguardo, email e importe",
  ESTADO_INCOMPATIBLE: "El presupuesto ya no está en un estado que admita esta respuesta",
  NUMERO_PRESUPUESTO_NO_ENCONTRADO: "La referencia citada por el cliente no identifica ningún presupuesto de forma inequívoca",
  // Motivos del clasificador de IA (n8n) que faltaban en este diccionario —
  // se mostraban como el enum en bruto en el panel.
  CONSULTA: "El cliente hace una consulta",
  ACEPTACION_CON_CONSULTA: "Acepta el presupuesto y además hace una consulta",
  NUMERO_DE_PRESUPUESTO_NO_EXISTE: "El número de presupuesto citado no existe",
  ORIGINAL_RECUPERADO_SIN_REFERENCIA_PRESUPUESTO: "Se recuperó el correo original pero sin referencia al presupuesto",
  SIN_AUTORIZACION_EXPLICITA_JS: "Falta una autorización explícita del cliente",
  RESPUESTA_NO_CLARA: "La respuesta del cliente no es clara",
  OPCION_NO_EXISTE: "La opción de presupuesto citada no existe",
  RECHAZO_PARA_REVISION: "Rechazo que requiere revisión manual",
  SIN_REFERENCIAS_DE_RESPUESTA: "El correo no tiene referencias suficientes para identificar la respuesta",
  APLAZAMIENTO: "El cliente pide aplazar su decisión",
  ERROR_CLASIFICACION_IA: "Error al clasificar la respuesta automáticamente",
  ACEPTACION_CONDICIONADA: "Acepta el presupuesto de forma condicionada",
};

/** Motivos en los que el cliente formuló una pregunta junto a su respuesta
    — habilitan el composer de "Responder consulta" en el panel. */
export function esConsultaCliente(motivo: string | null): boolean {
  return !!motivo && motivo.includes("CONSULTA");
}
