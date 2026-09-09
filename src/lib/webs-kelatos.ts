/**
 * Dashboard "Webs Kelatos" — una web por página en el sidebar, cada una
 * con su propio listado de productos. Fase "interfaz primero": por ahora
 * es solo un listado interno (kelatos_app.sitios_web / productos_web);
 * la sincronización con cada web en vivo (Vercel) es una fase posterior.
 */

export interface SitioWeb {
  id: number;
  nombre: string;
  url: string;
  /** Identificador para GET /publico/productos/:slug — cada web en Vercel
      consulta sus productos con esto, sin el Bearer interno. */
  slug: string;
  /** Marca/categoría — agrupa el sidebar en secciones colapsables, p.ej.
      varias webs "Lenovo" bajo un mismo grupo desplegable. */
  tipo: string;
  totalProductos: number;
}

export interface ProductoWeb {
  id: number;
  sitioId: number;
  nombre: string;
  descripcion: string;
  precio: number | null;
  stock: number;
  categoria: string;
  imagenUrl: string;
  activo: boolean;
  fechaCreacion: string | null;
  fechaActualizacion: string | null;
}

interface FilaSitioWebSql {
  id: number | string;
  nombre: string;
  url: string | null;
  slug: string | null;
  tipo: string | null;
  total_productos: number | string;
}

interface FilaProductoWebSql {
  id: number | string;
  sitio_id: number | string;
  nombre: string;
  descripcion: string | null;
  precio: string | number | null;
  stock: number | string;
  categoria: string | null;
  imagen_url: string | null;
  activo: boolean;
  fecha_creacion: string | null;
  fecha_actualizacion: string | null;
}

export function mapearSitioWeb(row: FilaSitioWebSql): SitioWeb {
  return {
    id: Number(row.id),
    nombre: row.nombre,
    url: row.url || "",
    slug: row.slug || "",
    tipo: row.tipo || "",
    totalProductos: Number(row.total_productos) || 0,
  };
}

export function mapearProductoWeb(row: FilaProductoWebSql): ProductoWeb {
  return {
    id: Number(row.id),
    sitioId: Number(row.sitio_id),
    nombre: row.nombre,
    descripcion: row.descripcion || "",
    precio: row.precio === null || row.precio === undefined ? null : Number(row.precio),
    stock: Number(row.stock) || 0,
    categoria: row.categoria || "",
    imagenUrl: row.imagen_url || "",
    activo: row.activo !== false,
    fechaCreacion: row.fecha_creacion || null,
    fechaActualizacion: row.fecha_actualizacion || null,
  };
}
