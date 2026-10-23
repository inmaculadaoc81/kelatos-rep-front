import type { Categoria, Etapa, Origen } from "@/lib/crm";

export type CategoriaTipo = "promocion" | "seguimiento" | "bienvenida" | "recordatorio" | "informativo" | "propuesta";
export type EstadoCampana = "borrador" | "programada" | "pausada" | "cancelada";
export type Recurrencia = "ninguna" | "semanal" | "mensual";

export const CATEGORIAS_TIPO: { id: CategoriaTipo; nombre: string; chip: string }[] = [
  { id: "promocion", nombre: "Promoción", chip: "bg-rose-100 text-rose-800" },
  { id: "seguimiento", nombre: "Seguimiento", chip: "bg-sky-100 text-sky-800" },
  { id: "bienvenida", nombre: "Bienvenida", chip: "bg-emerald-100 text-emerald-800" },
  { id: "recordatorio", nombre: "Recordatorio", chip: "bg-amber-100 text-amber-800" },
  { id: "informativo", nombre: "Informativo", chip: "bg-violet-100 text-violet-800" },
  { id: "propuesta", nombre: "Propuesta comercial", chip: "bg-indigo-100 text-indigo-800" },
];
export const ESTADOS_CAMPANA: { id: EstadoCampana; nombre: string; chip: string }[] = [
  { id: "borrador", nombre: "Borrador", chip: "bg-zinc-100 text-zinc-700" },
  { id: "programada", nombre: "Programada", chip: "bg-sky-100 text-sky-800" },
  { id: "pausada", nombre: "Pausada", chip: "bg-amber-100 text-amber-800" },
  { id: "cancelada", nombre: "Cancelada", chip: "bg-rose-100 text-rose-800" },
];
export const RECURRENCIAS: { id: Recurrencia; nombre: string }[] = [
  { id: "ninguna", nombre: "Una sola vez" },
  { id: "semanal", nombre: "Cada semana" },
  { id: "mensual", nombre: "Cada mes" },
];
export const nombreCategoriaTipo = (id: string) => CATEGORIAS_TIPO.find((c) => c.id === id)?.nombre ?? id;
export const chipCategoriaTipo = (id: string) => CATEGORIAS_TIPO.find((c) => c.id === id)?.chip ?? "bg-zinc-100 text-zinc-700";
export const nombreEstadoCampana = (id: string) => ESTADOS_CAMPANA.find((e) => e.id === id)?.nombre ?? id;
export const chipEstadoCampana = (id: string) => ESTADOS_CAMPANA.find((e) => e.id === id)?.chip ?? "bg-zinc-100 text-zinc-700";

export interface TipoCorreo {
  id: number; nombre: string; categoria: CategoriaTipo; descripcion: string | null; asunto: string; cuerpo: string; activo: boolean;
}
export interface Segmento { canales: Origen[]; etapas: Etapa[]; categorias: Categoria[]; incluir_clientes: boolean }
export interface PasoCampana { tipo_id: number; espera_dias: number }
export interface Campana {
  id: number; pasos: PasoCampana[]; limite_diario: number | null; nombre: string; tipo_id: number | null; tipo_nombre: string | null; tipo_categoria: CategoriaTipo | null; segmento: Segmento;
  programado_para: string | null; recurrencia: Recurrencia; estado: EstadoCampana; audiencia: number; enviados: number; creado_en: string;
}
export interface ContactoCorreo {
  email: string; nombre: string | null; tipo: "lead" | "cliente"; canal: Origen | null; etapa: Etapa | null; categoria: Categoria | null; bloqueo: "Baja" | "Rebotó" | "No contactar" | null; lead_id: number | null;
}
export interface ResumenCorreos {
  ok: boolean; envio_activo: boolean; enviados: number;
  contactos: { total: number; aptos: number; bloqueados: number; clientes: number; leads: number };
  porCanal: { clave: string; n: number; aptos: number }[];
  campanas: { estado: EstadoCampana; n: number }[];
  tipos: { activos: number; total: number };
  proximas: { id: number; nombre: string; programado_para: string | null; tipo: string | null }[];
}
export interface MetricasCorreos {
  ok: boolean; dias: number; envio_activo: boolean;
  totales: { enviados: number; entregados: number; abiertos: number; clics: number; bajas: number; rebotes: number; errores: number };
  porDia: { dia: string; enviados: number; abiertos: number; clics: number }[];
  porTipo: { nombre: string; enviados: number; abiertos: number; clics: number }[];
  porCampana: { nombre: string; enviados: number; abiertos: number; clics: number; bajas: number }[];
}

/** Llamada a /api/crm/correos/* con aviso claro si falla. */
export async function llamarCorreos(ruta: string, metodo: "POST" | "PATCH" | "PUT", cuerpo: object) {
  const res = await fetch(`/api/crm/correos/${ruta}`, { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string } & Record<string, unknown>;
  if (!res.ok || !d.ok) throw new Error(d.error || "No se pudo completar la acción");
  return d;
}

export interface ConfigCorreo {
  buzon_id: number | null; limite_diario: number; limite_hora: number; hora_inicio: number; hora_fin: number; intervalo_seg: number; dias_semana: string;
  cc_supervision: string | null; cc_primero_por_tipo: boolean; comprobar_respuestas_min: number; actualizado_en: string; actualizado_por: string | null;
}
export interface DatosConfigCorreo { ok: boolean; config: ConfigCorreo; buzones: { id: number; nombre: string; email: string }[]; envio_activo: boolean }

export type EstadoSeguimiento = "sin_enviar" | "pendiente" | "enviado" | "respondio" | "rebotado" | "error" | "baja" | "no_contactar";
export const ESTADOS_SEGUIMIENTO: { id: EstadoSeguimiento; nombre: string; chip: string }[] = [
  { id: "sin_enviar", nombre: "Sin enviar", chip: "bg-zinc-100 text-zinc-700" },
  { id: "pendiente", nombre: "Pendiente", chip: "bg-amber-100 text-amber-800" },
  { id: "enviado", nombre: "Enviado", chip: "bg-sky-100 text-sky-800" },
  { id: "respondio", nombre: "Respondió", chip: "bg-emerald-100 text-emerald-800" },
  { id: "rebotado", nombre: "Rebotó", chip: "bg-rose-100 text-rose-800" },
  { id: "error", nombre: "Error", chip: "bg-rose-100 text-rose-800" },
  { id: "baja", nombre: "Baja", chip: "bg-violet-100 text-violet-800" },
  { id: "no_contactar", nombre: "No contactar", chip: "bg-violet-100 text-violet-800" },
];
export interface FilaSeguimiento {
  email: string; nombre: string | null; tipo: "lead" | "cliente"; canal: string | null; tipo_id: number | null; tipo_nombre: string | null;
  enviado_en: string | null; respondido_en: string | null; paso: number | null; enviados: number; campana: string | null; estado: EstadoSeguimiento;
}
export interface PlanCorreos {
  ok: boolean; envio_activo: boolean; enviados_hoy: number; limite_diario: number; motivos: string[]; ritmo: string; horario: string; total_hoy: number;
  campanas: { id: number; nombre: string; tipo: string | null; pasos: number; audiencia: number; enviados: number; pendientes: number; hoy: number; dias_restantes: number }[];
}
