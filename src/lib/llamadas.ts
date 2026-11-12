/** Llamadas del dashboard (personas e IA) — tabla kelatos_app.llamadas, vista solo para administradores. */

export interface FilaLlamada {
  id: string;
  proveedor: string;
  origen: "persona" | "ia";
  direccion: "saliente" | "entrante";
  usuario: string | null;
  resguardo: string | null;
  cliente_nombre: string | null;
  telefono: string | null;
  inicio: string;
  fin: string | null;
  duracion_seg: number | null;
  estado: string;
  tiene_grabacion: boolean;
  tiene_transcripcion: boolean;
  resumen: string | null;
  sentimiento: string | null;
  motivo?: string | null;
  queja?: boolean | null;
  queja_revisada?: boolean | null;
}

export interface AcuerdoLlamada { texto: string; quien: "empleado" | "cliente" | "ambos"; plazo: string | null }

/** Análisis automático de la transcripción (lo calcula la API al transcribir). */
export interface AnalisisLlamada {
  motivo: string;
  decision_presupuesto: "acepta" | "rechaza" | "lo_piensa" | "no_aplica";
  acuerdos: AcuerdoLlamada[];
  queja: { hay: boolean; motivo: string | null };
  datos_cliente: { telefono: string | null; email: string | null; direccion: string | null; nombre: string | null };
  checklist: { se_presento: boolean | null; aviso_grabacion: boolean | null; dio_plazo: boolean | null };
  linea_historial: string | null;
}

export interface QuejaPendiente { id: string; inicio: string; usuario: string | null; resguardo: string | null; cliente_nombre: string | null; motivo: string | null }
export interface TiemposUsuario { usuario: string; n: number; dur_media: number | null; espera_media: number | null; quejas: number }

export interface ListadoLlamadas {
  ok: boolean;
  registros: FilaLlamada[];
  total: number;
  limit: number;
  offset: number;
  resumen: { hoy: number; semana: number; segundos_semana: number; total_global: number };
  usuarios: { usuario: string; n: number }[];
  estados: { estado: string; n: number }[];
  motivos: { motivo: string; n: number }[];
  por_usuario: TiemposUsuario[];
  quejas_pendientes: QuejaPendiente[];
}

export interface TurnoLlamada {
  hablante?: string;
  texto: string;
  inicio_seg?: number;
}

export interface DetalleLlamada extends Omit<FilaLlamada, "tiene_grabacion" | "tiene_transcripcion"> {
  grabacion_url: string | null;
  transcripcion: string | null;
  transcripcion_json: TurnoLlamada[] | null;
  datos: Record<string, unknown>;
}

export const ETIQUETA_ESTADO: Record<string, string> = {
  iniciada: "Iniciada",
  contestada: "Contestada",
  completada: "Completada",
  no_contesta: "No contesta",
  ocupado: "Ocupado",
  fallida: "Fallida",
};

export function duracionTexto(seg: number | null | undefined): string {
  if (seg == null) return "—";
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return m > 0 ? `${m} min ${String(s).padStart(2, "0")} s` : `${s} s`;
}

export function tiempoTotalTexto(seg: number): string {
  const h = Math.floor(seg / 3600);
  const m = Math.round((seg % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export const ETIQUETA_MOTIVO: Record<string, string> = {
  presupuesto: "Presupuesto",
  retraso_plazo: "Plazo / retraso",
  recogida_entrega: "Recogida / entrega",
  queja: "Queja",
  garantia: "Garantía",
  consulta_estado: "Estado de la reparación",
  pago_factura: "Pago / factura",
  otro: "Otro",
};

export const ETIQUETA_DECISION: Record<string, string> = {
  acepta: "Acepta el presupuesto",
  rechaza: "Rechaza el presupuesto",
  lo_piensa: "Lo piensa",
};
