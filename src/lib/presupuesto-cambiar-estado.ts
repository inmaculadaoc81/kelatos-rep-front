/**
 * Tipos para aceptar/rechazar/anular un presupuesto — consume
 * POST /v1/presupuestos/cambiar-estado (origen "dashboard"). v1 no incluye
 * "Editar" (PATCH /v1/presupuestos/:presupuestoId) ni "Eliminar borrador" ni
 * "Crear presupuesto" — quedan para una iteración futura.
 */

export type AccionCambioEstadoPresupuesto = "aceptar" | "rechazar" | "anular";
