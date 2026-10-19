/** Tipos y estilos del calendario de ausencias de Asistencia (vacaciones, días libres, descansos médicos). */

export type TipoAusencia = "vacaciones" | "dia_libre" | "descanso_medico";
export type PaisCalendario = "ES" | "PE";

export const TIPO_AUSENCIA_LABEL: Record<TipoAusencia, string> = {
  vacaciones: "Vacaciones",
  dia_libre: "Día libre",
  descanso_medico: "Descanso médico",
};

export const TIPO_AUSENCIA_LETRA: Record<TipoAusencia, string> = {
  vacaciones: "V",
  dia_libre: "L",
  descanso_medico: "M",
};

/** Colores inline (mismo criterio que las pills de Asistencia). */
export const TIPO_AUSENCIA_ESTILO: Record<TipoAusencia, { bg: string; color: string }> = {
  vacaciones: { bg: "#bfdbfe", color: "#1e3a8a" },
  dia_libre: { bg: "#ddd6fe", color: "#4c1d95" },
  descanso_medico: { bg: "#fecaca", color: "#7f1d1d" },
};

export const PAIS_LABEL: Record<PaisCalendario, string> = { ES: "España", PE: "Perú" };

export const AMBITO_FERIADO_LABEL: Record<string, string> = {
  nacional: "Nacional",
  autonomico: "Comunidad de Madrid",
  local: "Local",
};

export interface EmpleadoCalendario {
  id: number;
  nombre: string;
  pais: PaisCalendario;
  horario: string | null;
}

export interface AusenciaCalendario {
  id: number;
  employee_id: number;
  tipo: TipoAusencia;
  state: string;
  motivo: string | null;
  documento_nombre: string | null;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface AusenciaParcialCalendario {
  id: number;
  employee_id: number;
  tipo_permiso: string;
  state: string;
  hora_inicio: number | string | null;
  hora_fin: number | string | null;
  fecha: string;
}

export interface FeriadoCalendario {
  id: number;
  pais: PaisCalendario;
  ambito: string;
  nombre: string;
  fuente: string | null;
  verificado: boolean;
  fecha: string;
}

export interface RespuestaCalendario {
  ok: boolean;
  error?: string;
  empleados: EmpleadoCalendario[];
  ausencias: AusenciaCalendario[];
  parciales: AusenciaParcialCalendario[];
  feriados: FeriadoCalendario[];
}

/** AAAA-MM-DD del día local (nunca vía toISOString: convierte a UTC y puede saltar de día). */
export function claveDia(anio: number, mes0: number, dia: number): string {
  return `${anio}-${String(mes0 + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function diasEnMes(anio: number, mes0: number): number {
  return new Date(anio, mes0 + 1, 0).getDate();
}

/** 0 = lunes … 6 = domingo. */
export function diaSemanaLunes0(anio: number, mes0: number, dia: number): number {
  return (new Date(anio, mes0, dia).getDay() + 6) % 7;
}
