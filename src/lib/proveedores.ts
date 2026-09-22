/**
 * Proveedores — hasta ahora kelatos_app.proveedores era mínima
 * (proveedor_id, nombre, notas, activo) y solo se veía como un selector de
 * solo lectura en Compras/pedidos. Ampliada (migración 112) con los datos
 * fiscales que exige Facturas Recibidas: DNI/CIF, dirección, país,
 * teléfono, email, código interno. Sin ruta dedicada en el backend — usa
 * el CRUD genérico /v1/:table (proveedores ya está en su allowlist).
 */

export interface Proveedor {
  proveedorId: string;
  nombre: string;
  dniCif: string;
  direccionFiscal: string;
  pais: string;
  telefono: string;
  email: string;
  codigoInterno: string;
  notas: string;
  activo: boolean;
}

export interface ProveedorFormData {
  nombre: string;
  dniCif: string;
  direccionFiscal: string;
  pais: string;
  telefono: string;
  email: string;
  codigoInterno: string;
  notas: string;
}

interface FilaProveedorSql {
  proveedor_id: string;
  nombre: string | null;
  dni_cif: string | null;
  direccion_fiscal: string | null;
  pais: string | null;
  telefono: string | null;
  email: string | null;
  codigo_interno: string | null;
  notas: string | null;
  activo: boolean | null;
}

export function mapearProveedor(row: FilaProveedorSql): Proveedor {
  return {
    proveedorId: row.proveedor_id,
    nombre: row.nombre || "",
    dniCif: row.dni_cif || "",
    direccionFiscal: row.direccion_fiscal || "",
    pais: row.pais || "",
    telefono: row.telefono || "",
    email: row.email || "",
    codigoInterno: row.codigo_interno || "",
    notas: row.notas || "",
    activo: row.activo !== false,
  };
}

/** "aliexpress-4f2a" — slug del nombre + sufijo aleatorio corto, para no
    necesitar comprobar colisiones (proveedor_id es texto libre, sin
    secuencia propia). */
export function generarProveedorId(nombre: string): string {
  const slug = nombre
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 40) || "proveedor";
  const sufijo = Math.random().toString(16).slice(2, 6);
  return `${slug}-${sufijo}`;
}
