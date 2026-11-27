export interface DiagnosticoPendiente {
  resguardo: string;
  fechaRecepcion: string;
  cliente: string;
  telefono: string;
  equipo: string;
  estado: string;
  entregado: boolean;
  documentoReparacion: string;
}

/** Margen tras la recepción antes de lanzar el aviso emergente: da tiempo a generar el ticket mientras se atiende al cliente. */
export const MARGEN_AVISO_MS = 10 * 60 * 1000;
