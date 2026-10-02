// Informe del día — texto libre de lo que ha hecho un empleado cada día
// (informesDiarios.js en el backend). Mismo patrón que tareas.ts.

export interface InformeDiario {
  id: number;
  fecha: string;
  texto: string;
  creadoEn: string;
  actualizadoEn: string;
}

interface FilaInforme {
  id: number | string;
  fecha: string;
  texto: string;
  creado_en: string;
  actualizado_en: string;
}

export function mapearInforme(f: FilaInforme): InformeDiario {
  return { id: Number(f.id), fecha: f.fecha, texto: f.texto, creadoEn: f.creado_en, actualizadoEn: f.actualizado_en };
}

export interface InformeAdmin extends InformeDiario {
  empleadoId: number;
  empleadoNombre: string;
  empleadoEmail: string;
}

interface FilaInformeAdmin extends FilaInforme {
  empleado_id: number | string;
  empleado_nombre: string;
  empleado_email: string;
}

export function mapearInformeAdmin(f: FilaInformeAdmin): InformeAdmin {
  return { ...mapearInforme(f), empleadoId: Number(f.empleado_id), empleadoNombre: f.empleado_nombre, empleadoEmail: f.empleado_email };
}
