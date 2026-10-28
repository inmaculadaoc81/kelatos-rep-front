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
  /** NIF-IVA comunitario con el prefijo del país (p. ej. IT05587220822); se completa al registrar una compra intracomunitaria. */
  nifIva: string;
  direccionFiscal: string;
  pais: string;
  telefono: string;
  email: string;
  codigoInterno: string;
  notas: string;
  /** Marcas de equipos (HP, Dell, Lenovo...) de las que el proveedor vende piezas o servicio. */
  marcas: string[];
  activo: boolean;
}

export interface ProveedorFormData {
  nombre: string;
  dniCif: string;
  nifIva: string;
  direccionFiscal: string;
  pais: string;
  telefono: string;
  email: string;
  codigoInterno: string;
  notas: string;
  /** Texto separado por comas, tal como se escribe en el formulario. */
  marcas: string;
}

interface FilaProveedorSql {
  proveedor_id: string;
  nombre: string | null;
  dni_cif: string | null;
  nif_iva?: string | null;
  direccion_fiscal: string | null;
  pais: string | null;
  telefono: string | null;
  email: string | null;
  codigo_interno: string | null;
  notas: string | null;
  marcas?: string | null;
  activo: boolean | null;
}

/** "HP, dell ;Lenovo, hp" -> ["HP", "dell", "Lenovo"]: separa por coma o punto y coma, quita espacios y repetidas (sin distinguir mayúsculas). */
export function normalizarMarcas(texto: string | null | undefined): string[] {
  const vistas = new Set<string>();
  const resultado: string[] = [];
  for (const parte of String(texto || "").split(/[,;]/)) {
    const marca = parte.trim().replace(/\s+/g, " ");
    if (!marca || vistas.has(marca.toLowerCase())) continue;
    vistas.add(marca.toLowerCase());
    resultado.push(marca);
  }
  return resultado;
}

export function mapearProveedor(row: FilaProveedorSql): Proveedor {
  return {
    proveedorId: row.proveedor_id,
    nombre: row.nombre || "",
    dniCif: row.dni_cif || "",
    nifIva: row.nif_iva || "",
    direccionFiscal: row.direccion_fiscal || "",
    pais: row.pais || "",
    telefono: row.telefono || "",
    email: row.email || "",
    codigoInterno: row.codigo_interno || "",
    notas: row.notas || "",
    marcas: normalizarMarcas(row.marcas),
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
