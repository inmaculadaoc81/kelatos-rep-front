/** Vista «WhatsApp» del dashboard: conversaciones de Chatwoot (ver backend chatwootWhatsapp.js). */

export interface RepWhatsapp {
  resguardo: string;
  estado: string;
  equipo: string | null;
  cliente: string | null;
}

export interface ConversacionWa {
  id: number;
  estado: "open" | "pending" | "resolved" | "snoozed" | string;
  noLeidos: number;
  ultimaActividad: number;
  nombre: string;
  telefono: string;
  avatar: string | null;
  ultimoMensaje: { texto: string; saliente: boolean; ts: number } | null;
  etiquetas: string[];
  asignadoA: string | null;
  puedeResponder: boolean;
  reparaciones: RepWhatsapp[];
}

export interface MensajeWa {
  id: number;
  tipo: "entrante" | "saliente" | "plantilla" | "actividad";
  texto: string;
  ts: number;
  estado: string | null;
  autor: string | null;
  adjuntos: { tipo: string; url: string | null; miniatura: string | null; nombre: string }[];
}

export const FILTROS_WA: { valor: string; etiqueta: string }[] = [
  { valor: "open", etiqueta: "Abiertas" },
  { valor: "pending", etiqueta: "Pendientes" },
  { valor: "resolved", etiqueta: "Resueltas" },
  { valor: "all", etiqueta: "Todas" },
];

export function horaWa(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  const opts: Intl.DateTimeFormatOptions = { timeZone: "Europe/Madrid" };
  const hoy = new Date();
  const mismoDia = d.toLocaleDateString("es-ES", opts) === hoy.toLocaleDateString("es-ES", opts);
  return mismoDia
    ? d.toLocaleTimeString("es-ES", { ...opts, hour: "2-digit", minute: "2-digit", hour12: false })
    : d.toLocaleDateString("es-ES", { ...opts, day: "2-digit", month: "short" });
}

export function horaCompletaWa(ts: number): string {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function inicialesWa(nombre: string): string {
  const p = nombre.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
