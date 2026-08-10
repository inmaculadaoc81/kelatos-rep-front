/**
 * Tipos para "Finalizar Reparación" y "Marcar como entregado" — consumen
 * POST /v1/reparaciones/:resguardo/finalizar y
 * POST /v1/reparaciones/:resguardo/salidas (acción marcar_entregado).
 * v1 no incluye minutosNotificacion/pesoArchivo (efectos de notificación al
 * cliente, fuera del alcance SQL de estos endpoints) ni las acciones
 * "cliente_se_lleva"/"punto_limpio" de /salidas — quedan para una
 * iteración futura.
 */

export type ResultadoReparacion = "reparado" | "no_reparado";

export interface DatosFinalizarReparacion {
  resultado: ResultadoReparacion;
  tecnico: string;
  fecha: string;
  observaciones: string;
  motivoSinReparacion: string;
  piezaOk: boolean;
  piezaNoResuelve: boolean;
  codigoDevolucion: string;
}

export type TipoEntrega = "ENTREGADO" | "ENVIO" | "RECICLAJE";

export interface DatosMarcarEntregado {
  fechaRecogida: string;
  tipoEntrega: TipoEntrega;
  numeroFactura: string;
  resena: "SI" | "NO";
  observaciones: string;
}
