/**
 * Tipos para el alta de una reparación — consume el dominio SQL nativo
 * POST /v1/reparaciones/altas/preparar + /confirmar (kelatos-api,
 * server.js). Ese dominio todavía no tiene ningún cliente real (Apps
 * Script sigue generando resguardos por Sheets vía generarSiguienteResguardo,
 * completamente desacoplado) — este formulario es el primer consumidor.
 *
 * v1 solo cubre tipoAlta 'simple' (equipo estándar, sin cintas ni
 * "aceptar presupuesto ahora"); el backend ya soporta 'cintas' y
 * 'con_presupuesto' — quedan para una iteración futura del formulario.
 */

export type EstadoInicialSimple = "Presupuesto Pendiente" | "Garantía";
export type TipoRecepcion = "LOCAL" | "ENVIO";

export interface DatosNuevaReparacion {
  fechaRecepcion: string;
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail: string;
  dniCif: string;
  direccionEnvio: string;
  equipoModelo: string;
  sintoma: string;
  estado: EstadoInicialSimple;
  tipoRecepcion: TipoRecepcion;
  entregaMensajeria: boolean;
  revisionPagada: boolean;
}

export interface ReparacionAltaCreada {
  resguardo: string;
  reparacion: Record<string, unknown>;
  cliente: Record<string, unknown> | null;
}
