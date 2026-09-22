/**
 * Gestión MAILS — tipos y utilidades compartidas por las vistas Buzones y
 * Bandeja (backend: kelatos-rep-back/src/mailGestion.js, migración 103).
 */

export type SeguridadMail = "SSL" | "STARTTLS" | "NINGUNA";

export interface Buzon {
  id: number;
  nombre: string;
  email: string;
  proveedor: string;
  imap_host: string;
  imap_port: number;
  imap_seguridad: SeguridadMail;
  imap_usuario: string;
  smtp_host: string;
  smtp_port: number;
  smtp_seguridad: SeguridadMail;
  smtp_usuario: string;
  carpetas_vigiladas: string[];
  carpeta_enviados: string;
  sincronizar_desde: string;
  activo: boolean;
  ultima_sincronizacion: string | null;
  ultimo_error: string | null;
  creado_en: string;
  mensajes: number;
  sin_leer: number;
}

/** Cliente cuyo correo coincide con el de la otra parte de la conversación. */
export interface ClienteVinculado {
  codigo: string;
  nombre: string;
  /** Email del cliente con el que coincidió el correo (en minúsculas). */
  email: string;
}

/** Lead (empresa/contacto de la base de envíos) cuyo correo coincide con el de la otra parte. */
export interface LeadVinculado {
  id: number;
  nombre: string;
  estado: EstadoLead;
}

/** Carpetas del Centro de mails. */
export type Vista = "todos" | "entrada" | "destacados" | "enviados" | "archivo" | "rebotes" | "papelera";

export interface AdjuntoMail {
  id: number;
  nombre: string;
  tipo: string | null;
  tamano: number | null;
  /** false = era demasiado grande y solo se conserva el nombre. */
  guardado: boolean;
}

export interface MensajeLista {
  id: number;
  buzon_id: number;
  buzon_email: string;
  direccion: "entrada" | "salida";
  remitente: string;
  remitente_nombre: string | null;
  destinatarios: string;
  asunto: string;
  fecha: string | null;
  leido: boolean;
  es_rebote: boolean;
  destacado: boolean;
  archivado: boolean;
  hilo: string | null;
  tiene_adjuntos: boolean;
  resumen: string;
  /** Mensajes de la conversación (1 si no se agrupa). */
  n_mensajes: number;
  /** Recibidos sin leer dentro de la conversación. */
  no_leidos: number;
  clientes: ClienteVinculado[];
  leads: LeadVinculado[];
}

export interface MensajeHilo {
  id: number;
  buzon_id: number;
  buzon_email: string;
  carpeta: string;
  direccion: "entrada" | "salida";
  remitente: string;
  remitente_nombre: string | null;
  destinatarios: string;
  cc: string | null;
  asunto: string;
  fecha: string | null;
  cuerpo_texto: string | null;
  cuerpo_html: string | null;
  truncado: boolean;
  leido: boolean;
  es_rebote: boolean;
  destacado: boolean;
  archivado: boolean;
  eliminado_en: string | null;
  enviado_por: string | null;
  adjuntos: AdjuntoMail[];
}

export interface MensajeDetalle extends MensajeHilo {
  message_id: string | null;
  hilo: string | null;
  /** Mensaje al que contesta (si está guardado). */
  en_respuesta_a: { id: number; asunto: string; fecha: string | null; direccion: "entrada" | "salida" } | null;
  clientes: ClienteVinculado[];
  leads: LeadVinculado[];
}

export interface ContadoresMensajes {
  todos: number;
  entrada: number;
  sin_leer: number;
  destacados: number;
  enviados: number;
  archivo: number;
  rebotes: number;
  papelera: number;
}

export const CONTADORES_VACIOS: ContadoresMensajes = { todos: 0, entrada: 0, sin_leer: 0, destacados: 0, enviados: 0, archivo: 0, rebotes: 0, papelera: 0 };

// ── Leads ────────────────────────────────────────────────────────────────

export type EstadoLead = "Pendiente" | "Enviado" | "Follow up" | "Respondió" | "No contactar" | "Inválido";

export const ESTADOS_LEAD: EstadoLead[] = ["Pendiente", "Enviado", "Follow up", "Respondió", "No contactar", "Inválido"];

/** Colores de la pastilla de estado (mismo criterio en la lista, la ficha y la bandeja). */
export const COLOR_ESTADO_LEAD: Record<EstadoLead, string> = {
  Pendiente: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  Enviado: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "Follow up": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Respondió: "bg-green-500/10 text-green-600 dark:text-green-400",
  "No contactar": "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
  Inválido: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export interface LeadLista {
  id: number;
  nombre: string;
  contacto: string | null;
  email: string | null;
  emails_extra: string[];
  telefono: string | null;
  web: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string | null;
  sector: string | null;
  estado: EstadoLead;
  paso: number;
  grupo_envio: string | null;
  notas: string | null;
  origen: string | null;
  creado_en: string;
  actualizado_en: string;
  enviados: number;
  recibidos: number;
  rebotes: number;
  ultimo_envio: string | null;
  ultima_respuesta: string | null;
}

export type KpisLeads = { total: number } & Record<EstadoLead, number>;

export interface MensajeLead {
  id: number;
  direccion: "entrada" | "salida";
  asunto: string;
  fecha: string | null;
  es_rebote: boolean;
  leido: boolean;
  buzon_email: string;
  remitente: string;
  destinatarios: string;
  resumen: string;
  tiene_adjuntos: boolean;
  en_respuesta_a: { id: number; asunto: string; fecha: string | null; direccion: "entrada" | "salida" } | null;
}

export interface LeadDetalle {
  lead: LeadLista & { datos_extra: Record<string, unknown> };
  mensajes: MensajeLead[];
  invalidas: { email: string; motivo: string | null; detectado_en: string }[];
}

export interface ResultadoImportacion {
  creados: number;
  actualizados: number;
  omitidos: number;
  sin_datos: number;
  sin_email: number;
}

/** Tamaño legible: 1,2 MB, 340 KB… */
export function tamanoLegible(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("es-ES", { maximumFractionDigits: 1 })} MB`;
}

export interface ResultadoPrueba {
  imap: { ok: boolean; error?: string; carpetas?: { ruta: string; especial: string | null }[] };
  smtp: { ok: boolean; error?: string };
}

/** Valores por defecto al elegir el proveedor en el alta de un buzón. */
export const PROVEEDORES: Record<
  string,
  {
    etiqueta: string;
    imap_host: string;
    imap_port: number;
    imap_seguridad: SeguridadMail;
    smtp_host: string;
    smtp_port: number;
    smtp_seguridad: SeguridadMail;
    carpeta_enviados: string;
    ayuda?: string;
  }
> = {
  hostinger: {
    etiqueta: "Hostinger",
    imap_host: "imap.hostinger.com",
    imap_port: 993,
    imap_seguridad: "SSL",
    smtp_host: "smtp.hostinger.com",
    smtp_port: 587,
    smtp_seguridad: "STARTTLS",
    carpeta_enviados: "INBOX.Sent",
  },
  webempresa: {
    etiqueta: "Webempresa",
    imap_host: "cp7124.webempresa.eu",
    imap_port: 993,
    imap_seguridad: "SSL",
    smtp_host: "cp7124.webempresa.eu",
    smtp_port: 465,
    smtp_seguridad: "SSL",
    carpeta_enviados: "INBOX.Sent",
    ayuda: "Ajusta el servidor si tu cuenta de Webempresa está en otro (cpXXXX.webempresa.eu).",
  },
  otro: {
    etiqueta: "Otro proveedor",
    imap_host: "",
    imap_port: 993,
    imap_seguridad: "SSL",
    smtp_host: "",
    smtp_port: 587,
    smtp_seguridad: "STARTTLS",
    carpeta_enviados: "Sent",
  },
};

export function etiquetaProveedor(p: string): string {
  return PROVEEDORES[p]?.etiqueta || p;
}

/** Color de la pastilla de proveedor en Buzones. */
export const COLOR_PROVEEDOR: Record<string, string> = {
  hostinger: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  webempresa: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  otro: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
};

export function colorProveedor(p: string): string {
  return COLOR_PROVEEDOR[p] || COLOR_PROVEEDOR.otro;
}

/** Nombre del remitente si lo hay; si no, su dirección. */
export function nombreOCorreo(m: Pick<MensajeLista, "remitente" | "remitente_nombre">): string {
  return (m.remitente_nombre || "").trim() || m.remitente || "(sin remitente)";
}
