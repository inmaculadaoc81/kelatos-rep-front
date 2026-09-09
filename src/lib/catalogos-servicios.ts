/**
 * "Servicios" — catálogos de precios de servicio compartidos por marca
 * (Servicios Surface/Dyson/Thermomix), independientes de "Webs Kelatos"
 * (sitios_web/productos_web). Fase actual: solo el catálogo interno; el
 * enlace con páginas reales en Vercel (para que varias webs de una misma
 * marca lean del mismo catálogo) es una fase posterior.
 */

export interface CatalogoServicios {
  id: number;
  nombre: string;
  totalItems: number;
}

export interface ItemServicio {
  id: number;
  catalogoId: number;
  nombre: string;
  descripcion: string;
  precio: number | null;
  categoria: string;
  imagenUrl: string;
  activo: boolean;
  fechaCreacion: string | null;
  fechaActualizacion: string | null;
}

interface FilaCatalogoServiciosSql {
  id: number | string;
  nombre: string;
  total_items: number | string;
}

interface FilaItemServicioSql {
  id: number | string;
  catalogo_id: number | string;
  nombre: string;
  descripcion: string | null;
  precio: string | number | null;
  categoria: string | null;
  imagen_url: string | null;
  activo: boolean;
  fecha_creacion: string | null;
  fecha_actualizacion: string | null;
}

export function mapearCatalogoServicios(row: FilaCatalogoServiciosSql): CatalogoServicios {
  return {
    id: Number(row.id),
    nombre: row.nombre,
    totalItems: Number(row.total_items) || 0,
  };
}

export function mapearItemServicio(row: FilaItemServicioSql): ItemServicio {
  return {
    id: Number(row.id),
    catalogoId: Number(row.catalogo_id),
    nombre: row.nombre,
    descripcion: row.descripcion || "",
    precio: row.precio === null || row.precio === undefined ? null : Number(row.precio),
    categoria: row.categoria || "",
    imagenUrl: row.imagen_url || "",
    activo: row.activo !== false,
    fechaCreacion: row.fecha_creacion || null,
    fechaActualizacion: row.fecha_actualizacion || null,
  };
}
