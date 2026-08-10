import { toast } from "sonner";

/**
 * Helpers que replican la API de mostrarGuardando/toastMini/mostrarError
 * de Index.html, para que los módulos migrados después puedan copiar la
 * misma lógica de negocio (try/await/toast.exito()/toast.error()) casi
 * sin cambios en la forma de llamarlos.
 */

export function mostrarGuardando(mensaje = "Guardando...") {
  const id = toast.loading(mensaje);
  return {
    exito: (mensajeExito: string) => toast.success(mensajeExito, { id }),
    error: (mensajeError: string) => toast.error(mensajeError, { id }),
  };
}

export function toastMini(mensaje: string, tipo: "sync" | "success" | "error" = "sync") {
  const id =
    tipo === "sync" ? toast.loading(mensaje) : tipo === "success" ? toast.success(mensaje) : toast.error(mensaje);
  return {
    actualizar: (mensajeNuevo: string, tipoNuevo: "success" | "error") => {
      if (tipoNuevo === "success") toast.success(mensajeNuevo, { id });
      else toast.error(mensajeNuevo, { id });
    },
  };
}

export function mostrarError(mensaje: string) {
  toast.error(mensaje);
}

export function mostrarAdvertencia(mensaje: string) {
  toast.warning(mensaje);
}
