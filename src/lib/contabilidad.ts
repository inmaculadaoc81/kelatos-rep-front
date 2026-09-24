/** Cliente y tipos de la capa contable (esquema `contabilidad` del backend). */

export type EstadoAsiento = "BORRADOR" | "VALIDADO" | "CONTABILIZADO" | "CERRADO";

export interface AsientoResumen {
  id: number;
  numero: string | null;
  fecha: string;
  concepto: string;
  tipo: string;
  estado: EstadoAsiento;
  origen_tipo: string | null;
  origen_id: string | null;
  evento_id: number | null;
  reversa_de: number | null;
  creado_por: string | null;
  total?: number;
}

export interface LineaAsiento {
  orden: number;
  cuenta_codigo: string;
  cuenta_nombre: string;
  subcuenta_codigo: string | null;
  subcuenta_nombre: string | null;
  debe: number;
  haber: number;
  concepto: string;
}

export interface DetalleAsiento {
  asiento: AsientoResumen & { validado_por: string | null; contabilizado_por: string | null; contabilizado_en: string | null };
  lineas: LineaAsiento[];
  regla: { codigo: string; version: number; nombre: string; requiere_validacion_gestoria: boolean; nota: string | null } | null;
  evento: { id: number; tipo_evento: string; payload: unknown } | null;
  revertidoPor: { id: number; numero: string | null } | null;
  auditoria: { ts: string; usuario: string | null; accion: string; detalle: unknown }[];
}

export interface Cuenta {
  codigo: string;
  nombre: string;
  grupo: number;
  tipo: string;
  padre: string | null;
  imputable: boolean;
  activa: boolean;
  origen: string;
  con_movimientos: boolean;
}

export interface Banco {
  id: number;
  nombre: string;
  alias: string[];
  iban: string | null;
  cuenta_codigo: string;
  activa: boolean;
}

export interface Categoria {
  codigo: string;
  nombre: string;
  cuenta_codigo: string;
  cuenta_nombre: string;
  tipo: string;
  activa: boolean;
}

export interface ReglaLinea {
  orden: number;
  lado: "debe" | "haber";
  cuenta_fija: string | null;
  cuenta_derivada: string | null;
  expandir: string | null;
  formula: string;
  descripcion: string;
}

export interface Regla {
  id: number;
  codigo: string;
  tipo_evento: string;
  version: number;
  nombre: string;
  concepto: string;
  activa: boolean;
  requiere_validacion_gestoria: boolean;
  nota: string | null;
  asientos: number;
  lineas: ReglaLinea[];
}

export interface EventoContable {
  id: number;
  origen_tipo: string;
  origen_id: string;
  tipo_evento: string;
  estado: "pendiente" | "procesado" | "error" | "ignorado";
  error: string | null;
  intentos: number;
  creado_en: string;
  asiento_id: number | null;
  payload: unknown;
}

export interface Periodo {
  anio: number;
  mes: number;
  estado: "abierto" | "cerrado";
  cerrado_por: string | null;
  reabierto_motivo: string | null;
  pendientes: number;
  contabilizados: number;
}

/** Llama al proxy de Contabilidad; lanza Error con el mensaje del backend. */
export async function apiC<T = Record<string, unknown>>(
  ruta: string,
  opciones: { metodo?: "GET" | "POST" | "PUT"; cuerpo?: unknown; query?: Record<string, string | number | boolean | undefined | null> } = {}
): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(opciones.query || {})) if (v !== undefined && v !== null && v !== "" && v !== false) qs.set(k, String(v));
  const res = await fetch(`/api/contabilidad/${ruta}${qs.toString() ? `?${qs.toString()}` : ""}`, {
    method: opciones.metodo || "GET",
    headers: opciones.cuerpo !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
    cache: "no-store",
  });
  let datos: { ok?: boolean; error?: string } = {};
  try {
    datos = await res.json();
  } catch {
    /* respuesta vacía */
  }
  if (!res.ok || datos.ok === false) throw new Error(datos.error || `Error ${res.status}`);
  return datos as T;
}

const NF = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const num = (n: number | null | undefined): string => (n == null ? "—" : NF.format(n));
export const eur = (n: number | null | undefined): string => (n == null ? "—" : `${NF.format(n)} €`);

export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const ETIQUETA_ESTADO: Record<EstadoAsiento, string> = {
  BORRADOR: "Borrador",
  VALIDADO: "Validado",
  CONTABILIZADO: "Contabilizado",
  CERRADO: "Cerrado",
};

export const CLASE_ESTADO: Record<EstadoAsiento, string> = {
  BORRADOR: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  VALIDADO: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  CONTABILIZADO: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  CERRADO: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
};

export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
