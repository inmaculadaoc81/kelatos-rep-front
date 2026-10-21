export { puedeVerCrm as puedeVerProspeccion } from "@/lib/crm";

export type EstadoEnvio = "borrador" | "aprobado" | "enviado" | "omitido" | "error";
export type Modo = "simulacion" | "aprobacion" | "automatico";

export const ESTADOS_ENVIO: { id: EstadoEnvio; nombre: string; chip: string }[] = [
  { id: "borrador", nombre: "Borrador", chip: "bg-amber-100 text-amber-800" },
  { id: "aprobado", nombre: "Aprobado", chip: "bg-sky-100 text-sky-800" },
  { id: "enviado", nombre: "Enviado", chip: "bg-emerald-100 text-emerald-800" },
  { id: "omitido", nombre: "Omitido", chip: "bg-zinc-100 text-zinc-700" },
  { id: "error", nombre: "Error", chip: "bg-rose-100 text-rose-800" },
];

export const MODOS: { id: Modo; nombre: string; descripcion: string }[] = [
  { id: "simulacion", nombre: "Simulación", descripcion: "Redacta y analiza, pero nunca envía nada. Para probar la IA." },
  { id: "aprobacion", nombre: "Con aprobación", descripcion: "Redacta borradores; solo se envía lo que tú apruebas, respetando el ritmo y el límite diario." },
  { id: "automatico", nombre: "Automático", descripcion: "Redacta, aprueba y envía solo, dentro del horario y del límite diario." },
];

export const nombreEstadoEnvio = (id: string) => ESTADOS_ENVIO.find((e) => e.id === id)?.nombre ?? id;
export const chipEstadoEnvio = (id: string) => ESTADOS_ENVIO.find((e) => e.id === id)?.chip ?? "bg-zinc-100 text-zinc-700";
export const chipEncaje = (e: string | null) =>
  e === "alto" ? "bg-emerald-100 text-emerald-800" : e === "medio" ? "bg-amber-100 text-amber-800" : e === "bajo" ? "bg-zinc-100 text-zinc-700" : "bg-zinc-50 text-zinc-500";

export type ConfigProspeccion = {
  activo: boolean; modo: Modo; limite_diario: number; hora_inicio: number; hora_fin: number; intervalo_min: number;
  buzon_id: number | null; grupo_envio: string | null; sector: string | null;
  propuesta: string; tono: string; firma: string; texto_baja: string; actualizado_en: string; actualizado_por: string | null;
};

export type EstadoGeneracion = { total: number; hechos: number; errores: number; inicio: number; usuario: string } | null;

export type DatosConfig = {
  ok: boolean; config: ConfigProspeccion;
  buzones: { id: number; nombre: string; email: string }[];
  grupos: { g: string; n: number }[];
  estados_leads: { estado: string; n: number }[];
  candidatos: number; hoy: number; generando: EstadoGeneracion;
};

export type FilaGrupo = { nombre: string | null; total?: number; enviados?: number };

export type ResumenProspeccion = {
  ok: boolean; dias: number;
  totales: { total: number; borradores: number; aprobados: number; enviados: number; omitidos: number; errores: number; enviados_7d: number; puntuacion_media: number | null; encaje_alto: number; respondieron: number; invalidos: number };
  por_dia: { dia: string; enviados: number; redactados: number }[];
  por_sector: FilaGrupo[]; por_buzon: FilaGrupo[]; por_encaje: FilaGrupo[];
  agente: { activo: boolean; modo: Modo; limite_diario: number; hoy: number; candidatos: number; generando: EstadoGeneracion };
};

export type EnvioLista = {
  id: number; lead_id: number; empresa: string; email: string; sector: string | null; ciudad: string | null; asunto: string;
  estado: EstadoEnvio; puntuacion: number | null; encaje: string | null; buzon_email: string | null; error: string | null; generado_en: string; enviado_en: string | null;
};

export type Analisis = { resumen?: string; encaje?: string; motivos?: string[]; riesgos?: string[] };

export type EnvioDetalle = EnvioLista & {
  cuerpo: string; analisis: Analisis | null; modelo: string | null; ms_ia: number | null; generado_por: string | null; aprobado_por: string | null; aprobado_en: string | null;
};

export type LeadMail = { id: number; nombre: string; contacto: string | null; email: string | null; telefono: string | null; web: string | null; ciudad: string | null; provincia: string | null; pais: string | null; sector: string | null; estado: string; notas: string | null };
