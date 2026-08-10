/**
 * Tipos para el dominio "Estados especiales" — consume
 * POST /v1/reparaciones/:resguardo/estados-especiales (acciones
 * sin_reparacion_pieza / deshacer_sin_reparacion / revertir_abandonado).
 */

export interface DatosSinReparacionPieza {
  tecnico: string;
  fecha: string;
  motivoAdicional: string;
  marcarPresupuestosObsoletos: boolean;
}
