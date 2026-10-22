/** CRM de Kelatos: leads (WhatsApp, llamadas, web...) con su pipeline y su línea de tiempo. */
import { esSuperadmin } from "@/lib/superadmin";

export type Etapa = "nuevo" | "contactado" | "presupuesto" | "ganado" | "perdido";
export type Origen = "whatsapp" | "llamada" | "web" | "email" | "manual" | "otro";
export type Categoria = "dyson" | "thermomix" | "ordenador" | "surface" | "consola" | "robot" | "monitor" | "alquiler" | "repuestos" | "otro";
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
  bandeja_id: number | null;
  bandeja_nombre: string | null;
  numero_destino: string | null;
  categoria: Categoria | null;
  actividades?: number;
  /** Última línea de la última conversación de WhatsApp: «[15:17] Bot: …». */
  ultima_linea?: string | null;
  /** Resumen de la última llamada o cita (Retell / Cal.com) para la vista previa de la lista. */
  ultimo_resumen?: string | null;
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

export const CATEGORIAS: { id: Categoria; nombre: string; chip: string; borde: string }[] = [
  { id: "dyson", nombre: "Dyson", chip: "bg-fuchsia-100 text-fuchsia-800", borde: "border-l-fuchsia-400" },
  { id: "thermomix", nombre: "Thermomix", chip: "bg-lime-100 text-lime-800", borde: "border-l-lime-500" },
  { id: "ordenador", nombre: "Ordenador / portátil", chip: "bg-sky-100 text-sky-800", borde: "border-l-sky-400" },
  { id: "surface", nombre: "Surface", chip: "bg-indigo-100 text-indigo-800", borde: "border-l-indigo-400" },
  { id: "consola", nombre: "Consola", chip: "bg-violet-100 text-violet-800", borde: "border-l-violet-400" },
  { id: "robot", nombre: "Robot (aspirador / cocina)", chip: "bg-teal-100 text-teal-800", borde: "border-l-teal-400" },
  { id: "monitor", nombre: "Monitor", chip: "bg-cyan-100 text-cyan-800", borde: "border-l-cyan-400" },
  { id: "alquiler", nombre: "Alquiler", chip: "bg-amber-100 text-amber-800", borde: "border-l-amber-400" },
  { id: "repuestos", nombre: "Repuestos y piezas", chip: "bg-orange-100 text-orange-800", borde: "border-l-orange-400" },
  { id: "otro", nombre: "Otro", chip: "bg-zinc-100 text-zinc-700", borde: "border-l-zinc-400" },
];

/** WhatsApp (bandejas de Chatwoot) que alimentan el CRM. Debe coincidir con kelatos_app.crm_config.chatwoot_bandejas_info. */
export const BANDEJAS: { id: number; nombre: string; numero: string }[] = [
  { id: 1, nombre: "Kelatos", numero: "+34 649 970 128" },
  { id: 7, nombre: "Dyson", numero: "+34 606 806 376" },
  { id: 6, nombre: "Kelatos NL", numero: "+31 684 635 001" },
  { id: 3, nombre: "Automatizaciones n8n", numero: "+34 638 619 588" },
];

export const bordeCategoria = (c: string | null | undefined) => (c ? CATEGORIAS.find((x) => x.id === c)?.borde ?? "border-l-zinc-300" : "border-l-zinc-300");

export type GrupoFecha = "hoy" | "ayer" | "semana" | "antes";
export const GRUPOS_FECHA: { id: GrupoFecha; nombre: string }[] = [
  { id: "hoy", nombre: "Hoy" },
  { id: "ayer", nombre: "Ayer" },
  { id: "semana", nombre: "Esta semana" },
  { id: "antes", nombre: "Anteriores" },
];

/** En qué bloque de fecha cae un lead (por el día de Madrid de su última actividad). */
export function grupoFecha(iso: string | null | undefined): GrupoFecha {
  if (!iso) return "antes";
  const dia = (ms: number) => new Date(ms).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  const d = dia(new Date(iso).getTime());
  if (d === dia(Date.now())) return "hoy";
  if (d === dia(Date.now() - 86400000)) return "ayer";
  return d >= dia(Date.now() - 7 * 86400000) ? "semana" : "antes";
}

export const nombreCategoria = (c: string | null | undefined) => (c ? CATEGORIAS.find((x) => x.id === c)?.nombre ?? c : "Sin clasificar");
export const chipCategoria = (c: string | null | undefined) => (c ? CATEGORIAS.find((x) => x.id === c)?.chip ?? "bg-zinc-100 text-zinc-700" : "bg-zinc-100 text-zinc-500");

export interface FilaMetrica { clave: string; extra: string | null; n: number; ganados: number }
export interface MetricasCrm {
  dias: number;
  creados: number;
  ganados: number;
  perdidos: number;
  abiertos: number;
  sin_respuesta: number;
  acciones_vencidas: number;
  valor_ganado: number;
  valor_perdido: number;
  valor_abierto: number;
  llegaron_contactado: number;
  llegaron_presupuesto: number;
  atendidos_persona: number;
  conversion: number;
  mediana_primera_respuesta_horas: number | null;
  leads_con_respuesta: number;
  mediana_dias_hasta_ganar: number | null;
  leads_ganados_con_fecha: number;
  porDia: { dia: string; n: number }[];
  porOrigen: FilaMetrica[];
  porNumero: FilaMetrica[];
  porAgente: FilaMetrica[];
  porCategoria: FilaMetrica[];
  porResponsable: FilaMetrica[];
}

/** Canales de entrada: cada uno tiene su propia vista para que no se mezclen (WhatsApp, llamadas, web y citas). */
export const CANALES: { id: Origen; nombre: string; ruta: string; descripcion: string; color: string }[] = [
  { id: "whatsapp", nombre: "WhatsApp", ruta: "/crm/whatsapp", descripcion: "Conversaciones de los números de WhatsApp (Chatwoot).", color: "bg-emerald-500" },
  { id: "llamada", nombre: "Llamadas", ruta: "/crm/llamadas", descripcion: "Llamadas atendidas por los agentes de voz (Retell).", color: "bg-violet-500" },
  { id: "web", nombre: "Web y citas", ruta: "/crm/web", descripcion: "Citas reservadas en Cal.com y formularios de las webs.", color: "bg-sky-500" },
];

export interface CanalResumen {
  origen: Origen; total: number; nuevo: number; contactado: number; presupuesto: number; ganado: number; perdido: number;
  nuevos_hoy: number; ultimos_7d: number; sin_respuesta: number; acciones_vencidas: number; con_correo: number; ultimo_contacto: string | null;
}
export interface CanalesCrm { canales: CanalResumen[]; porDia: { dia: string; origen: Origen; n: number }[] }

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

/** ¿Llegó hace menos de 2 horas? (para marcar los leads recién entrados en el tablero) */
export function esReciente(iso: string | null | undefined): boolean {
  return !!iso && Date.now() - new Date(iso).getTime() < 2 * 3600 * 1000;
}

export const fechaHora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }) : "—";

export function hoyMadrid(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
}

export const accionVencida = (l: Pick<Lead, "proxima_accion_fecha" | "etapa">): boolean =>
  !!l.proxima_accion_fecha && l.proxima_accion_fecha < hoyMadrid() && l.etapa !== "ganado" && l.etapa !== "perdido";
