import { esSuperadmin } from "@/lib/superadmin";

/** Panel «Comercial»: agentes comerciales que llaman a listas de empresas, registran el resultado y agendan reuniones. */

type Usuario = { role?: string | null; email?: string | null; comercial?: boolean | null } | null | undefined;

/** Administradores y superadmins: ven y gestionan todo el panel (listas, agentes, actividad). */
export function puedeAdministrarComercial(user: Usuario): boolean {
  return !!user && (user.role === "admin" || esSuperadmin(user.email));
}

/** Cuenta de agente comercial (dada de alta en el panel por un administrador): solo ve el panel Comercial. */
export function esAgenteComercial(user: Usuario): boolean {
  return !!user && user.comercial === true;
}

export function puedeVerComercial(user: Usuario): boolean {
  return puedeAdministrarComercial(user) || esAgenteComercial(user);
}

export type EstadoContacto = "pendiente" | "no_contesta" | "volver_a_llamar" | "interesado" | "reunion" | "no_interesa" | "erroneo" | "ganado";
export type ResultadoLlamada = "no_contesta" | "volver_a_llamar" | "interesado" | "reunion" | "no_interesa" | "erroneo" | "venta";

export const ETIQUETA_ESTADO_CONTACTO: Record<string, string> = {
  pendiente: "Pendiente",
  no_contesta: "No contesta",
  volver_a_llamar: "Volver a llamar",
  interesado: "Interesado",
  reunion: "Reunión agendada",
  no_interesa: "No le interesa",
  erroneo: "Número erróneo",
  ganado: "Venta cerrada",
};

export const COLOR_ESTADO_CONTACTO: Record<string, string> = {
  pendiente: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  no_contesta: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  volver_a_llamar: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  interesado: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  reunion: "bg-green-500/10 text-green-700 dark:text-green-400",
  no_interesa: "bg-red-500/10 text-red-700 dark:text-red-400",
  erroneo: "bg-red-500/10 text-red-700 dark:text-red-400",
  ganado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

export const ETIQUETA_RESULTADO: Record<string, string> = {
  no_contesta: "No contesta",
  volver_a_llamar: "Volver a llamar",
  interesado: "Interesado",
  reunion: "Reunión agendada",
  no_interesa: "No le interesa",
  erroneo: "Número erróneo",
  venta: "Venta cerrada",
};

export interface Contacto {
  id: string;
  lista_id: number;
  lista: string;
  empresa: string;
  contacto: string | null;
  cargo: string | null;
  telefono: string;
  telefono2: string | null;
  email: string | null;
  web: string | null;
  ciudad: string | null;
  sector: string | null;
  notas: string | null;
  estado: EstadoContacto;
  intentos: number;
  ultima_gestion: string | null;
  proxima_llamada: string | null;
  asignado_a: string | null;
}

export interface Gestion {
  id: string;
  tipo: string;
  resultado: string | null;
  nota: string | null;
  agente: string;
  llamada_id: string | null;
  proxima_llamada: string | null;
  creada_en: string;
}

export interface Reunion {
  id: string;
  contacto_id: string;
  agente: string;
  fecha_hora: string;
  canal: string;
  estado: "agendada" | "realizada" | "cancelada" | "no_asistio";
  nota: string | null;
  empresa: string;
  contacto: string | null;
  telefono: string;
  email: string | null;
}

export interface LlamadaHistorial {
  id: string;
  inicio: string;
  duracion_seg: number | null;
  estado: string;
  agente: string;
  telefono: string | null;
  contacto_id: string | null;
  empresa: string | null;
  contacto: string | null;
  resultado: string | null;
  nota: string | null;
}

export interface AgenteComercial { email: string; nombre: string; activo: boolean; contactos?: number }

export interface ListaComercial {
  id: number;
  nombre: string;
  descripcion: string | null;
  asignado_a: string | null;
  activa: boolean;
  creada_en: string;
  total: number;
  pendientes: number;
  en_curso: number;
  interesados: number;
  reuniones: number;
  ganados: number;
  descartados: number;
}

export interface ActividadAgente {
  agente: string;
  nombre: string;
  activo: boolean;
  llamadas: number;
  contestadas: number;
  segundos: number;
  interesados: number;
  reuniones: number;
  ventas: number;
  no_interesa: number;
  no_contesta: number;
}

/** Llamada al proxy /api/comercial/*. Lanza Error con el mensaje del servidor si algo falla. */
export async function apiComercial<T = Record<string, unknown>>(ruta: string, opciones?: { metodo?: "GET" | "POST" | "PATCH" | "PUT"; params?: Record<string, string | number | undefined | null>; cuerpo?: unknown }): Promise<T> {
  const metodo = opciones?.metodo ?? "GET";
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(opciones?.params ?? {})) if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  const url = `/api/comercial/${ruta}${qs.toString() ? `?${qs.toString()}` : ""}`;
  const res = await fetch(url, {
    method: metodo,
    headers: metodo === "GET" ? undefined : { "Content-Type": "application/json" },
    body: metodo === "GET" ? undefined : JSON.stringify(opciones?.cuerpo ?? {}),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) throw new Error(data?.error || `Error ${res.status}`);
  return data as T;
}

export function fechaHoraCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
}

export function duracionCorta(seg: number | null | undefined): string {
  if (!seg || seg <= 0) return "—";
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return m > 0 ? `${m} min ${s} s` : `${s} s`;
}

export function tiempoHablado(seg: number): string {
  if (!seg) return "0 min";
  const h = Math.floor(seg / 3600);
  const m = Math.round((seg % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}
