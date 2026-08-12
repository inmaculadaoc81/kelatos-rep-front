/**
 * Tipos para "Finalizar Reparación" y "Marcar como entregado" — consumen
 * POST /v1/reparaciones/:resguardo/finalizar y
 * POST /v1/reparaciones/:resguardo/salidas (acción marcar_entregado).
 * minutosNotificacion/pesoArchivo ya están soportados (retraso real vía
 * kelatos_app.notificaciones_programadas + poller, ver server.js) — las
 * acciones "cliente_se_lleva"/"punto_limpio" de /salidas siguen fuera de
 * alcance, quedan para una iteración futura.
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
  minutosNotificacion: number;
  pesoArchivo: string;
}

export type TipoEntrega = "ENTREGADO" | "ENVIO" | "RECICLAJE";

export interface DatosMarcarEntregado {
  fechaRecogida: string;
  tipoEntrega: TipoEntrega;
  numeroFactura: string;
  resena: "SI" | "NO";
  observaciones: string;
}
