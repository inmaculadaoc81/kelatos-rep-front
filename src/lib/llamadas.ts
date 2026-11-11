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
}

export interface ListadoLlamadas {
  ok: boolean;
  registros: FilaLlamada[];
  total: number;
  limit: number;
  offset: number;
  resumen: { hoy: number; semana: number; segundos_semana: number; total_global: number };
  usuarios: { usuario: string; n: number }[];
  estados: { estado: string; n: number }[];
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
