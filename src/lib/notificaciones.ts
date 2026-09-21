/**
 * "Centro de notificaciones" — registro de todo lo que envía el sistema a
 * clientes (y algunas alertas internas). El backend devuelve el código fino
 * de cada envío (`tipo`); aquí se traduce a etiqueta legible y a categoría.
 * Petición del usuario, 2026-09-21.
 */

export type EstadoNotificacion = "enviado" | "fallido" | "desconocido";

/** Respuesta paginada de /api/notificaciones. */
export interface RespuestaNotificaciones {
  ok: boolean;
  total: number;
  /** KPI de estado — respetan todos los filtros salvo el de estado. */
  kpiEstado: { total: number; enviado: number; fallido: number; sin_email: number };
  /** Conteo por tipo — respetan todos los filtros salvo el de categoría/tipo de KPI. */
  kpiTipos: Record<string, number>;
  porDia: { dia: string; n: number; fallidas: number }[];
  notificaciones: NotificacionApi[];
}

export interface NotificacionApi {
  id: string;
  fecha: string | null;
  tipo: string;
  canal: string;
  destinatario: string;
  referencia: string | null;
  cliente: string | null;
  documento: string | null;
  estado: EstadoNotificacion;
  asunto: string | null;
  error: string | null;
  bcc: string | null;
  adjuntos: string | null;
  /** "registro" = correo registrado por el sistema actual (detalle completo);
      "historico" = registro anterior (solo tipo/destinatario/estado). */
  fuente: "registro" | "historico";
}

export type CategoriaNotificacion =
  | "cambio_estado"
  | "presupuestos"
  | "recogida"
  | "piezas"
  | "facturas"
  | "alquileres"
  | "recepcion"
  | "interno"
  | "otros";

export const CATEGORIAS: Record<CategoriaNotificacion, { etiqueta: string; clase: string }> = {
  cambio_estado: { etiqueta: "Cambio de estado", clase: "bg-sky-500/10 text-sky-700 dark:text-sky-400" },
  presupuestos: { etiqueta: "Presupuestos", clase: "bg-violet-500/10 text-violet-700 dark:text-violet-400" },
  recogida: { etiqueta: "Recogida y almacenaje", clase: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  piezas: { etiqueta: "Piezas y ventas", clase: "bg-teal-500/10 text-teal-700 dark:text-teal-400" },
  facturas: { etiqueta: "Facturas y tickets", clase: "bg-green-500/10 text-green-700 dark:text-green-400" },
  alquileres: { etiqueta: "Alquileres", clase: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400" },
  recepcion: { etiqueta: "Recepción", clase: "bg-pink-500/10 text-pink-700 dark:text-pink-400" },
  interno: { etiqueta: "Alertas internas", clase: "bg-slate-500/10 text-slate-700 dark:text-slate-400" },
  otros: { etiqueta: "Otros", clase: "bg-muted text-muted-foreground" },
};

export const ORDEN_CATEGORIAS: CategoriaNotificacion[] = [
  "cambio_estado",
  "presupuestos",
  "recogida",
  "piezas",
  "facturas",
  "alquileres",
  "recepcion",
  "interno",
  "otros",
];

const TIPOS: Record<string, { etiqueta: string; categoria: CategoriaNotificacion }> = {
  // Cambios de estado (mismos códigos que TIPO_POR_ESTADO_CAMBIO del backend)
  estado_recepcion: { etiqueta: "Equipo recibido", categoria: "cambio_estado" },
  estado_garantia: { etiqueta: "Equipo en garantía", categoria: "cambio_estado" },
  estado_ppto_aceptado: { etiqueta: "Presupuesto aceptado", categoria: "cambio_estado" },
  estado_pieza_pendiente: { etiqueta: "Pieza pedida", categoria: "cambio_estado" },
  estado_pieza_entregada: { etiqueta: "Pieza recibida — comienza reparación", categoria: "cambio_estado" },
  estado_en_reparacion: { etiqueta: "Equipo en reparación", categoria: "cambio_estado" },
  // Presupuestos
  presupuesto_enviado: { etiqueta: "Presupuesto", categoria: "presupuestos" },
  recordatorio_presupuesto: { etiqueta: "Recordatorio de presupuesto", categoria: "presupuestos" },
  vencimiento_presupuesto: { etiqueta: "Vencimiento de presupuesto", categoria: "presupuestos" },
  presupuesto_sin_respuesta: { etiqueta: "Presupuesto sin respuesta", categoria: "presupuestos" },
  respuesta_consulta_presupuesto: { etiqueta: "Respuesta a consulta de presupuesto", categoria: "presupuestos" },
  // Recogida y almacenaje
  aviso_recogida_reparado: { etiqueta: "Aviso de recogida: equipo reparado", categoria: "recogida" },
  aviso_recogida_sin_reparacion: { etiqueta: "Aviso de recogida: sin reparación", categoria: "recogida" },
  aviso_recogida_ppto_rechazado: { etiqueta: "Aviso de recogida: presupuesto rechazado", categoria: "recogida" },
  aviso_previo_almacenaje: { etiqueta: "Aviso previo de almacenaje", categoria: "recogida" },
  cargo_almacenaje_activo: { etiqueta: "Cargo de almacenaje activo", categoria: "recogida" },
  aviso_final_reciclaje: { etiqueta: "Aviso final de reciclaje", categoria: "recogida" },
  equipo_abandonado: { etiqueta: "Equipo abandonado", categoria: "recogida" },
  confirmacion_recogida: { etiqueta: "Confirmación de recogida", categoria: "recogida" },
  // Piezas y ventas
  aviso_pieza_lista_equipo_ausente: { etiqueta: "Pieza lista (equipo ausente)", categoria: "piezas" },
  recordatorio_pieza_lista_equipo_ausente: { etiqueta: "Recordatorio: pieza lista (equipo ausente)", categoria: "piezas" },
  aviso_pieza_recibida_venta: { etiqueta: "Pieza recibida (pedido de venta)", categoria: "piezas" },
  recordatorio_pieza_recibida_venta: { etiqueta: "Recordatorio: pieza recibida (pedido de venta)", categoria: "piezas" },
  confirmacion_entrega_venta: { etiqueta: "Confirmación de entrega de pieza", categoria: "piezas" },
  // Facturas y tickets
  factura_cliente: { etiqueta: "Factura", categoria: "facturas" },
  factura_manual: { etiqueta: "Factura (envío manual)", categoria: "facturas" },
  factura_combinada: { etiqueta: "Rectificativa y corregida", categoria: "facturas" },
  ticket_envio: { etiqueta: "Ticket", categoria: "facturas" },
  // Alquileres
  confirmacion_alquiler: { etiqueta: "Confirmación de alquiler", categoria: "alquileres" },
  // Recepción
  resguardo_formulario: { etiqueta: "Resguardo de recepción", categoria: "recepcion" },
  // Internas
  alerta_interna: { etiqueta: "Alerta interna", categoria: "interno" },
  alerta_sin_canal: { etiqueta: "Alerta: cliente sin canal de contacto", categoria: "interno" },
};

/** Todos los tipos conocidos, ordenados por etiqueta (para el desplegable de tipos). */
export const TIPOS_CONOCIDOS: string[] = Object.keys(TIPOS).sort((a, b) => TIPOS[a].etiqueta.localeCompare(TIPOS[b].etiqueta, "es"));

/** Tipos que pertenecen a una categoría ("otros" = los que no están en el mapa). */
export function tiposDeCategoria(categoria: CategoriaNotificacion): string[] {
  return Object.keys(TIPOS).filter((t) => TIPOS[t].categoria === categoria);
}

/** Tipos cuya etiqueta legible contiene el texto — para que la búsqueda libre
    también encuentre "Pieza pedida" aunque el código sea estado_pieza_pendiente. */
export function tiposQueCoinciden(texto: string): string[] {
  const q = texto.trim().toLowerCase();
  if (!q) return [];
  return Object.keys(TIPOS).filter((t) => TIPOS[t].etiqueta.toLowerCase().includes(q));
}

export function etiquetaTipo(tipo: string): string {
  return TIPOS[tipo]?.etiqueta || tipo.replace(/_/g, " ");
}

export function categoriaDe(tipo: string): CategoriaNotificacion {
  return TIPOS[tipo]?.categoria || "otros";
}

export const ESTADOS: Record<EstadoNotificacion, { etiqueta: string; clase: string }> = {
  enviado: { etiqueta: "Enviado", clase: "bg-green-500/10 text-green-600" },
  fallido: { etiqueta: "Fallido", clase: "bg-red-500/10 text-red-600" },
  desconocido: { etiqueta: "Sin estado", clase: "bg-muted text-muted-foreground" },
};

export const CANALES: Record<string, string> = { email: "Email", sms: "SMS", interno: "Interno" };

/** Errores técnicos → texto que entiende quien atiende el mostrador. */
export function explicarError(error: string | null): string {
  if (!error) return "";
  if (error === "sin_email_valido") return "El cliente no tiene un email válido: no se pudo enviar nada.";
  if (/NETELIP/i.test(error)) return `Fallo del proveedor de SMS (${error}).`;
  return error;
}
