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
  tiene_adjuntos: boolean;
  resumen: string;
  clientes: ClienteVinculado[];
}

export interface MensajeDetalle {
  id: number;
  buzon_id: number;
  buzon_email: string;
  carpeta: string;
  direccion: "entrada" | "salida";
  message_id: string | null;
  remitente: string;
  remitente_nombre: string | null;
  destinatarios: string;
  cc: string | null;
  asunto: string;
  fecha: string | null;
  cuerpo_texto: string | null;
  cuerpo_html: string | null;
  truncado: boolean;
  adjuntos: { nombre: string; tipo?: string; tamano?: number }[];
  leido: boolean;
  es_rebote: boolean;
  clientes: ClienteVinculado[];
}

export interface ContadoresMensajes {
  entrada: number;
  salida: number;
  rebotes: number;
  sin_leer: number;
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

/** Nombre del remitente si lo hay; si no, su dirección. */
export function nombreOCorreo(m: Pick<MensajeLista, "remitente" | "remitente_nombre">): string {
  return (m.remitente_nombre || "").trim() || m.remitente || "(sin remitente)";
}
