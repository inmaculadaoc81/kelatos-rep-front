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
  asignado: { id: number; nombre: string; esBot: boolean } | null;
  bandejaId: number;
  bandeja: string;
  prioridad: string | null;
  pospuestaHasta: number;
  contactoId: number | null;
  email: string | null;
  puedeResponder: boolean;
  reparaciones: RepWhatsapp[];
  otras?: { id: number; estado: string; bandejaId: number; ts: number }[];
}

export interface CatalogoWa {
  configurado: boolean;
  bandejas: { id: number; nombre: string; canal: string; telefono: string }[];
  agentes: { id: number; nombre: string; email: string; rol: string; estado: string }[];
  etiquetas: { titulo: string; color: string }[];
  respuestas: { atajo: string; texto: string }[];
}

export interface ContadoresWa { todas: number; sinAsignar: number; asignadas: number; mias: number | null }

export interface MensajeWa {
  id: number;
  tipo: "entrante" | "saliente" | "plantilla" | "actividad";
  texto: string;
  ts: number;
  estado: string | null;
  privado: boolean;
  autor: string | null;
  adjuntos: { tipo: string; url: string | null; miniatura: string | null; nombre: string }[];
}

export const FILTROS_WA: { valor: string; etiqueta: string }[] = [
  { valor: "open", etiqueta: "Abiertas" },
  { valor: "pending", etiqueta: "Pendientes" },
  { valor: "snoozed", etiqueta: "Pospuestas" },
  { valor: "resolved", etiqueta: "Resueltas" },
  { valor: "all", etiqueta: "Todas" },
];

export const ESTADOS_WA: Record<string, string> = { open: "Abierta", pending: "Pendiente", snoozed: "Pospuesta", resolved: "Resuelta" };

export const PRIORIDADES_WA: { valor: string; etiqueta: string; clase: string }[] = [
  { valor: "urgent", etiqueta: "Urgente", clase: "text-red-600" },
  { valor: "high", etiqueta: "Alta", clase: "text-orange-600" },
  { valor: "medium", etiqueta: "Media", clase: "text-amber-600" },
  { valor: "low", etiqueta: "Baja", clase: "text-sky-600" },
];

/** Segundos de Unix de «mañana a las 9:00» (hora de Madrid) — la opción habitual de «Posponer». */
export function mananaALas9(): number {
  const ahora = new Date();
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ahora.getTime() + 24 * 3600 * 1000));
  const probe = new Date(`${partes}T09:00:00Z`);
  const offsetMin = (new Date(probe.toLocaleString("en-US", { timeZone: "Europe/Madrid" })).getTime() - new Date(probe.toLocaleString("en-US", { timeZone: "UTC" })).getTime()) / 60000;
  return Math.floor((probe.getTime() - offsetMin * 60000) / 1000);
}

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
