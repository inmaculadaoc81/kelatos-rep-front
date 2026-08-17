/**
 * Reemplaza el borrado manual que antes se hacía directamente en las
 * pestañas azules del Sheet original (Reparaciones, Presupuestos,
 * Piezas_Presupuesto, Pedidos, Historial, Clientes, alquileres,
 * Facturas_Manuales, FormulariosRechazados) — solo accesible entonces a
 * quien tuviera acceso de administrador al propio Sheet. Aquí, restringido
 * a los superadmin del dashboard (ver lib/superadmin.ts).
 *
 * Tres de estas tablas (reparaciones, clientes, alquileres) ya tenían su
 * propio endpoint de borrado con lógica de cascada dedicada, montado en
 * otra parte del panel — apiRuta() los apunta ahí. El resto usa el nuevo
 * endpoint genérico /v1/admin/registros/:table/:id (server.js).
 */

export interface EntidadAdmin {
  /** Nombre real de la tabla en kelatos_app — también la clave usada en la URL. */
  tabla: string;
  label: string;
  /** Columna clave primaria de esa tabla. */
  pk: string;
  /** Columnas mostradas en la tabla compacta de listado (subconjunto — la
      vista de detalle antes de borrar siempre muestra TODAS las columnas). */
  columnasLista: string[];
  /** Ruta del endpoint Next.js que realmente ejecuta el DELETE — las tres
      entidades con borrado propio ya existente apuntan a su ruta dedicada. */
  apiRutaDelete: (id: string) => string;
}

export const ENTIDADES_ADMIN: EntidadAdmin[] = [
  {
    tabla: "reparaciones",
    label: "Reparaciones",
    pk: "resguardo",
    columnasLista: ["resguardo", "cliente_nombre", "equipo_modelo", "estado", "fecha_recepcion"],
    apiRutaDelete: (id) => `/api/reparaciones/${encodeURIComponent(id)}`,
  },
  {
    tabla: "presupuestos",
    label: "Presupuestos",
    pk: "presupuesto_id",
    columnasLista: ["presupuesto_id", "resguardo", "version", "estado", "total"],
    apiRutaDelete: (id) => `/api/admin/registros/presupuestos/${encodeURIComponent(id)}`,
  },
  {
    tabla: "piezas_presupuesto",
    label: "Piezas de Presupuesto",
    pk: "pieza_id",
    columnasLista: ["pieza_id", "presupuesto_id", "descripcion", "precio", "tipo"],
    apiRutaDelete: (id) => `/api/admin/registros/piezas_presupuesto/${encodeURIComponent(id)}`,
  },
  {
    tabla: "pedidos",
    label: "Pedidos",
    pk: "pedido_id",
    columnasLista: ["pedido_id", "resguardo", "numero_pedido", "estado", "fecha_pedido"],
    apiRutaDelete: (id) => `/api/admin/registros/pedidos/${encodeURIComponent(id)}`,
  },
  {
    tabla: "historial",
    label: "Historial",
    pk: "id",
    columnasLista: ["id", "resguardo", "tipo", "descripcion", "fecha_hora"],
    apiRutaDelete: (id) => `/api/admin/registros/historial/${encodeURIComponent(id)}`,
  },
  {
    tabla: "clientes",
    label: "Clientes",
    pk: "codigo",
    columnasLista: ["codigo", "nombre", "dni_cif", "telefono", "email"],
    apiRutaDelete: (id) => `/api/clientes/${encodeURIComponent(id)}`,
  },
  {
    tabla: "alquileres",
    label: "Alquileres",
    pk: "alquiler_id",
    columnasLista: ["alquiler_id", "cliente_nombre", "equipo_id", "estado", "fecha_inicio"],
    apiRutaDelete: (id) => `/api/alquileres/${encodeURIComponent(id)}`,
  },
  {
    tabla: "facturas_manuales",
    label: "Facturas Manuales",
    pk: "id",
    columnasLista: ["id", "numero_factura", "cliente_nombre", "total_factura", "fecha_factura"],
    apiRutaDelete: (id) => `/api/admin/registros/facturas_manuales/${encodeURIComponent(id)}`,
  },
  {
    tabla: "notificaciones",
    label: "Notificaciones",
    pk: "notif_id",
    columnasLista: ["notif_id", "resguardo", "tipo", "canal", "estado"],
    apiRutaDelete: (id) => `/api/admin/registros/notificaciones/${encodeURIComponent(id)}`,
  },
  {
    tabla: "formularios_rechazados",
    label: "Formularios Rechazados",
    pk: "id",
    columnasLista: ["id", "fecha", "cliente_nombre", "equipo_modelo", "motivo"],
    apiRutaDelete: (id) => `/api/admin/registros/formularios_rechazados/${encodeURIComponent(id)}`,
  },
];

/** Formatea un nombre de columna snake_case como etiqueta legible ("cliente_nombre" -> "Cliente Nombre"). */
export function etiquetaColumna(col: string): string {
  return col
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Formatea el valor de una celda para mostrarlo en pantalla — objetos/arrays como JSON legible, null/"" como "—". */
export function formatearValorCelda(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "object") return JSON.stringify(valor, null, 2);
  return String(valor);
}
