/**
 * Vista "Compras" (Stock > Compras) — todos los pedidos de piezas de todas
 * las reparaciones en una sola tabla (backend: GET /v1/compras, server.js).
 * Es el mismo kelatos_app.pedidos que ya se registra desde el modal
 * "Registrar Pedido de Pieza" en cada reparación (ver
 * app/(app)/reparaciones/registrar-pedido-dialog.tsx); esta vista solo los
 * agrupa a todos, con su enlace de compra, proveedor y a qué cliente/equipo
 * pertenecen. Los cambios de estado (recibir/cancelar) reutilizan las rutas
 * ya existentes de Reparaciones (/api/pedidos/cambiar-estado).
 */

export interface CompraFila {
  pedidoId: string;
  piezaId: string;
  resguardo: string;
  clienteNombre: string;
  equipoModelo: string;
  reparacionEstado: string;
  compradoPor: string;
  numeroPedido: string;
  fechaPedido: string | null;
  fechaEstimada: string | null;
  fechaRecepcion: string | null;
  estado: string;
  recibidoPor: string;
  problemaTipo: string;
  codigoDevolucion: string;
  pedidoRemplazoId: string;
  /** Descripción de la pieza (columna `notas` en kelatos_app.pedidos). */
  descripcion: string;
  enlace: string;
  proveedorId: string;
  proveedorNombre: string;
  proveedorOtro: string;
  /** Pedido activo cuya fecha estimada ya pasó sin haber llegado (calculado en el servidor). */
  retrasado: boolean;
}

interface FilaCompraSql {
  pedido_id: string;
  pieza_id: string | null;
  resguardo: string | null;
  cliente_nombre: string | null;
  equipo_modelo: string | null;
  reparacion_estado: string | null;
  comprado_por: string | null;
  numero_pedido: string | null;
  fecha_pedido: string | null;
  fecha_estimada: string | null;
  fecha_recepcion: string | null;
  estado: string | null;
  recibido_por: string | null;
  problema_tipo: string | null;
  codigo_devolucion: string | null;
  pedido_remplazo_id: string | null;
  notas: string | null;
  enlace: string | null;
  proveedor_id: string | null;
  proveedor_nombre: string | null;
  proveedor_otro: string | null;
  retrasado: boolean | null;
}

export function mapearCompra(row: FilaCompraSql): CompraFila {
  return {
    pedidoId: row.pedido_id || "",
    piezaId: row.pieza_id || "",
    resguardo: row.resguardo || "",
    clienteNombre: row.cliente_nombre || "",
    equipoModelo: row.equipo_modelo || "",
    reparacionEstado: row.reparacion_estado || "",
    compradoPor: row.comprado_por || "",
    numeroPedido: row.numero_pedido || "",
    fechaPedido: row.fecha_pedido,
    fechaEstimada: row.fecha_estimada,
    fechaRecepcion: row.fecha_recepcion,
    estado: row.estado || "",
    recibidoPor: row.recibido_por || "",
    problemaTipo: row.problema_tipo || "",
    codigoDevolucion: row.codigo_devolucion || "",
    pedidoRemplazoId: row.pedido_remplazo_id || "",
    descripcion: row.notas || "",
    enlace: row.enlace || "",
    proveedorId: row.proveedor_id || "",
    proveedorNombre: row.proveedor_nombre || "",
    proveedorOtro: row.proveedor_otro || "",
    // Calculado en el servidor (kelatos_app.pedidos no tiene columna para esto):
    // pedido activo cuya fecha estimada ya pasó sin haber llegado.
    retrasado: row.retrasado === true,
  };
}

export interface KpisCompras {
  total: number;
  pendiente: number;
  pedido: number;
  en_transito: number;
  recibido: number;
  cancelado: number;
  con_problema: number;
  retrasado: number;
}

export const KPIS_COMPRAS_VACIOS: KpisCompras = { total: 0, pendiente: 0, pedido: 0, en_transito: 0, recibido: 0, cancelado: 0, con_problema: 0, retrasado: 0 };

// Un color por proveedor — se reconoce por el nombre (normalizado, igual
// criterio que formatoPedidoDe en lib/formato-pedido.ts) para que un
// proveedor "Otro" con nombre libre ("Gise", "TiendaMóvil"…) también caiga
// en un color estable (gris neutro) en vez de quedar sin pill.
function normalizarNombreProveedor(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");
}

const COLOR_PROVEEDOR: [string, string][] = [
  ["amazon", "bg-orange-500/10 text-orange-700 dark:text-orange-400"],
  ["aliexpress", "bg-red-500/10 text-red-700 dark:text-red-400"],
  ["ebay", "bg-blue-500/10 text-blue-700 dark:text-blue-400"],
  ["asus", "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"],
  ["aswoo", "bg-teal-500/10 text-teal-700 dark:text-teal-400"],
  ["lenovo", "bg-rose-500/10 text-rose-700 dark:text-rose-400"],
  ["msi", "bg-violet-500/10 text-violet-700 dark:text-violet-400"],
  ["pccomponentes", "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400"],
  ["techsparts", "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"],
];
const COLOR_PROVEEDOR_OTRO = "bg-slate-500/10 text-slate-600 dark:text-slate-300";

/** Clases de la pill de un proveedor a partir de su nombre. */
export function colorProveedor(nombre: string): string {
  const n = normalizarNombreProveedor(nombre);
  const encontrado = COLOR_PROVEEDOR.find(([clave]) => n.includes(clave));
  return encontrado ? encontrado[1] : COLOR_PROVEEDOR_OTRO;
}

export const ESTADOS_PEDIDO = ["Pendiente", "Pedido", "En Tránsito", "Recibido", "Cancelado", "Problema", "Pieza Rota", "Pieza Defectuosa"] as const;

// Mismos colores que ESTILO_BADGE_PEDIDO en reparaciones/detalle-dialog.tsx
// (colorPedido del original), con Pendiente y Cancelado añadidos porque en
// Compras sí se pueden ver (allí no aparecían en los datos reales).
export const ESTILO_BADGE_ESTADO: Record<string, string> = {
  Pendiente: "border-slate-400/40 text-slate-600 dark:text-slate-300",
  Pedido: "border-sky-500/40 text-sky-700 dark:text-sky-400",
  "En Tránsito": "border-amber-500/40 text-amber-700 dark:text-amber-400",
  Recibido: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
  Cancelado: "border-muted-foreground/30 text-muted-foreground",
  Problema: "border-destructive/40 text-destructive",
  "Pieza Rota": "border-destructive/40 text-destructive",
  "Pieza Defectuosa": "border-amber-500/40 text-amber-700 dark:text-amber-400",
};
