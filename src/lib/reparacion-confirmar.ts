/**
 * Tipos para confirmar/rechazar una reparación con estado "Formulario
 * Pendiente" — consume POST /v1/reparaciones/:resguardo/formulario/confirmar
 * y /rechazar (kelatos-api, server.js), ya migrados y consumidos por Apps
 * Script (apiConfirmarReparacionFormulario / apiRechazarReparacionFormulario),
 * a diferencia del dominio de altas. v1 solo cubre el caso simple (sin
 * "aceptar presupuesto ahora").
 */

import { EstadoInicialSimple, TipoRecepcion } from "./reparacion-alta";

export interface DatosConfirmarFormulario {
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail: string;
  direccionEnvio: string;
  equipoModelo: string;
  sintoma: string;
  estado: EstadoInicialSimple;
  tipoRecepcion: TipoRecepcion;
  entregaMensajeria: boolean;
  revisionPagada: boolean;
}
