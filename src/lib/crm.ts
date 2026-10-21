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

export const CATEGORIAS: { id: Categoria; nombre: string; chip: string }[] = [
  { id: "dyson", nombre: "Dyson", chip: "bg-fuchsia-100 text-fuchsia-800" },
  { id: "thermomix", nombre: "Thermomix", chip: "bg-lime-100 text-lime-800" },
  { id: "ordenador", nombre: "Ordenador / portátil", chip: "bg-sky-100 text-sky-800" },
  { id: "surface", nombre: "Surface", chip: "bg-indigo-100 text-indigo-800" },
  { id: "consola", nombre: "Consola", chip: "bg-violet-100 text-violet-800" },
  { id: "robot", nombre: "Robot (aspirador / cocina)", chip: "bg-teal-100 text-teal-800" },
  { id: "monitor", nombre: "Monitor", chip: "bg-cyan-100 text-cyan-800" },
  { id: "alquiler", nombre: "Alquiler", chip: "bg-amber-100 text-amber-800" },
  { id: "repuestos", nombre: "Repuestos y piezas", chip: "bg-orange-100 text-orange-800" },
  { id: "otro", nombre: "Otro", chip: "bg-zinc-100 text-zinc-700" },
];

/** WhatsApp (bandejas de Chatwoot) que alimentan el CRM. Debe coincidir con kelatos_app.crm_config.chatwoot_bandejas_info. */
export const BANDEJAS: { id: number; nombre: string; numero: string }[] = [
  { id: 1, nombre: "Kelatos", numero: "+34 649 970 128" },
  { id: 7, nombre: "Dyson", numero: "+34 606 806 376" },
  { id: 6, nombre: "Kelatos NL", numero: "+31 684 635 001" },
  { id: 3, nombre: "Automatizaciones n8n", numero: "+34 638 619 588" },
];

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
  conversion: number;
  mediana_primera_respuesta_horas: number | null;
  leads_con_respuesta: number;
  mediana_dias_hasta_ganar: number | null;
  leads_ganados_con_fecha: number;
  porDia: { dia: string; n: number }[];
  porOrigen: FilaMetrica[];
  porNumero: FilaMetrica[];
  porCategoria: FilaMetrica[];
  porResponsable: FilaMetrica[];
}

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
