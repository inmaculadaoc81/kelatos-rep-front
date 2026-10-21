/** CRM de Kelatos: leads (WhatsApp, llamadas, web...) con su pipeline y su línea de tiempo. */
import { esSuperadmin } from "@/lib/superadmin";

export type Etapa = "nuevo" | "contactado" | "presupuesto" | "ganado" | "perdido";
export type Origen = "whatsapp" | "llamada" | "web" | "email" | "manual" | "otro";
export type TipoActividad = "llamada" | "whatsapp" | "email" | "nota" | "cambio_etapa" | "alta";

export interface Lead {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  origen: Origen;
  etapa: Etapa;
  responsable: string | null;
  valor_estimado: string | number | null;
  proxima_accion: string | null;
  proxima_accion_fecha: string | null;
  notas: string | null;
  motivo_perdida: string | null;
  cliente_codigo: string | null;
  activo: boolean;
  ultimo_contacto: string | null;
  creado_por: string | null;
  creado_en: string;
  actualizado_en: string;
  actividades?: number;
}

export interface Actividad {
  id: number;
  tipo: TipoActividad;
  direccion: "entrante" | "saliente" | null;
  resumen: string;
  detalle: string | null;
  duracion_seg: number | null;
  canal_externo: string | null;
  usuario: string | null;
  creado_en: string;
}

export interface ResumenCrm {
  porEtapa: { etapa: Etapa; n: number; valor: number }[];
  porOrigen: { origen: Origen; n: number }[];
  nuevos_hoy: number;
  sin_respuesta: number;
  acciones_vencidas: number;
}

/** Etapas en orden de pipeline. Las clases son completas porque Tailwind no genera nombres armados. */
export const ETAPAS: { id: Etapa; nombre: string; descripcion: string; cabecera: string; chip: string; punto: string }[] = [
  { id: "nuevo", nombre: "Nuevo", descripcion: "Acaba de contactar y nadie le ha respondido todavía.", cabecera: "border-t-sky-500", chip: "bg-sky-100 text-sky-800", punto: "bg-sky-500" },
  { id: "contactado", nombre: "Contactado", descripcion: "Ya hablamos con él (llamada, mensaje o correo).", cabecera: "border-t-violet-500", chip: "bg-violet-100 text-violet-800", punto: "bg-violet-500" },
  { id: "presupuesto", nombre: "Presupuesto", descripcion: "Le hemos dado o enviado un precio y esperamos respuesta.", cabecera: "border-t-amber-500", chip: "bg-amber-100 text-amber-800", punto: "bg-amber-500" },
  { id: "ganado", nombre: "Ganado", descripcion: "Aceptó: ya es cliente o ha traído el equipo.", cabecera: "border-t-emerald-500", chip: "bg-emerald-100 text-emerald-800", punto: "bg-emerald-500" },
  { id: "perdido", nombre: "Perdido", descripcion: "No siguió adelante (precio, plazo, ya no lo necesita…).", cabecera: "border-t-rose-500", chip: "bg-rose-100 text-rose-800", punto: "bg-rose-500" },
];

export const ORIGENES: { id: Origen; nombre: string }[] = [
  { id: "whatsapp", nombre: "WhatsApp" },
  { id: "llamada", nombre: "Llamada" },
  { id: "web", nombre: "Web" },
  { id: "email", nombre: "Correo" },
  { id: "manual", nombre: "Manual" },
  { id: "otro", nombre: "Otro" },
];

export const nombreEtapa = (e: string) => ETAPAS.find((x) => x.id === e)?.nombre ?? e;
export const nombreOrigen = (o: string) => ORIGENES.find((x) => x.id === o)?.nombre ?? o;

export const TIPOS_ACTIVIDAD: { id: TipoActividad; nombre: string }[] = [
  { id: "llamada", nombre: "Llamada" },
  { id: "whatsapp", nombre: "WhatsApp" },
  { id: "email", nombre: "Correo" },
  { id: "nota", nombre: "Nota" },
];

/** Solo administradores y superadmins entran al CRM (datos de clientes potenciales). */
export function puedeVerCrm(user: { role?: string | null; email?: string | null } | null | undefined): boolean {
  if (!user) return false;
  return user.role === "admin" || esSuperadmin(user.email);
}

export function euros(v: string | number | null | undefined): string {
  const n = Number(v);
  return v === null || v === undefined || v === "" || !Number.isFinite(n) ? "—" : n.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

export function haceCuanto(iso: string | null | undefined): string {
  if (!iso) return "—";
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `hace ${min} min`;
  if (min < 60 * 24) return `hace ${Math.round(min / 60)} h`;
  return `hace ${Math.round(min / 1440)} d`;
}

export const fechaHora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }) : "—";

export function hoyMadrid(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
}

export const accionVencida = (l: Pick<Lead, "proxima_accion_fecha" | "etapa">): boolean =>
  !!l.proxima_accion_fecha && l.proxima_accion_fecha < hoyMadrid() && l.etapa !== "ganado" && l.etapa !== "perdido";
