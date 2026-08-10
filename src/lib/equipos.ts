/**
 * Tipos para "Equipos de Alquiler" — replica el contrato exacto de
 * obtenerEquipos() (backend/Equipos.js) vía GET /v1/equipos, para que
 * vistas_equipos.html.html no necesitara cambios de contrato al migrar de
 * Sheets a SQL. Aquí se reutiliza tal cual.
 */

export type EstadoEquipo = "DISPONIBLE" | "ALQUILADO" | "MANTENIMIENTO" | "FUERA_SERVICIO" | "VENDIDO";
export type TipoEquipo = "normal" | "gamer";

export interface AlquilerResumen {
  alquilerId: string;
  equipoId: string;
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail: string;
  clienteDNI: string;
  clienteDireccion: string;
  fechaInicio: string | null;
  fechaFinPrevista: string | null;
  fechaDevolucionReal: string | null;
  meses: number;
  semanas: number;
  dias: number;
  precioDia: number;
  precioSemana: number;
  precioMes: number;
  fianzaCobrada: number;
  subtotal: number;
  iva: number;
  totalPrevisto: number;
  totalCobrado: number;
  fianzaDevuelta: number;
  estado: string;
  metodoPago: string;
  observaciones: string;
  numeroFactura: string;
  estadoDevolucion: string;
  descuentoDanos: number;
}

export interface Equipo {
  id: string;
  marca: string;
  modelo: string;
  serie: string;
  sistemaOperativo: string;
  caracteristicas: string;
  defectos: string;
  observaciones: string;
  fianza: number;
  precioDia: number;
  precioSemana: number;
  precioMes: number;
  estado: EstadoEquipo;
  fechaAlta: string | null;
  alquilerActualId: string | null;
  clienteActual: { nombre: string; telefono: string } | null;
  fechaInicio: string | null;
  fechaFinPrevista: string | null;
  alquilerActivo: AlquilerResumen | null;
  historicoAlquileres: AlquilerResumen[];
}

export const TARIFAS_EQUIPO: Record<TipoEquipo, { dia: number; semanal: number; mensual: number; fianza: number }> = {
  normal: { dia: 10, semanal: 50, mensual: 150, fianza: 165.29 },
  gamer: { dia: 20, semanal: 80, mensual: 240, fianza: 661.16 },
};

export interface DatosNuevoEquipo {
  tipo: TipoEquipo;
  marca: string;
  modelo: string;
  serie: string;
  sistemaOperativo: string;
  caracteristicas: string;
  defectos: string;
  observaciones: string;
}

export interface DatosNuevoAlquiler {
  clienteNombre: string;
  clienteTelefono: string;
  clienteDNI: string;
  clienteEmail: string;
  clienteDireccion: string;
  fechaInicio: string;
  fechaFinPrevista: string;
  meses: number;
  semanas: number;
  dias: number;
  metodoPago: string;
  observaciones: string;
}

export interface DatosDevolucion {
  fechaDevolucion: string;
  totalCobrado: number;
  fianzaDevuelta: number;
  estadoDevolucion: string;
  descuentoDanos: number;
}
