/**
 * Tipos para el directorio de clientes — GET /v1/lecturas/clientes
 * (búsqueda) y POST /v1/clientes/crear. Este directorio no existe como
 * pantalla en el dashboard original (los clientes solo se crean/actualizan
 * implícitamente dentro del alta de reparaciones) — es una pantalla nueva,
 * construida sobre las tablas/endpoints ya reales de kelatos_app.clientes.
 */

export interface Cliente {
  codigo: string;
  nombre: string;
  dniCif: string;
  telefono: string;
  email: string;
  direccion: string;
  notas: string;
  fechaAlta: string | null;
  cp: string;
  localidad: string;
  provincia: string;
}

export interface ClienteFormData {
  nombre: string;
  dniCif: string;
  telefono: string;
  email: string;
  direccion: string;
  cp: string;
  localidad: string;
  provincia: string;
  notas: string;
}

interface FilaClienteSql {
  codigo: string;
  nombre: string | null;
  dni_cif: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  notas: string | null;
  fecha_alta: string | null;
  cp: string | null;
  localidad: string | null;
  provincia: string | null;
}

/**
 * kelatos_app.clientes.codigo es texto libre, sin longitud fija — los
 * ~735 códigos migrados del Sheet original son números sin ceros a la
 * izquierda (1-3 dígitos), mientras que los generados desde este sistema
 * (nextval('cliente_codigo_seq')) ya vienen con 5 dígitos. Bug real
 * reportado, 2026-08-28: "algunos salen con 2 ceros adelante y otros no".
 * Se normaliza solo al MOSTRAR (nunca se toca el dato real, que sigue
 * siendo la clave primaria y ya vive copiado sin padding en otras tablas
 * — repadear la columna sería una migración de datos real, no un simple
 * arreglo visual).
 */
export function codigoClienteFormateado(codigo: string): string {
  return (codigo || "").padStart(5, "0");
}

export function mapearCliente(row: FilaClienteSql): Cliente {
  return {
    codigo: row.codigo,
    nombre: row.nombre || "",
    dniCif: row.dni_cif || "",
    telefono: row.telefono || "",
    email: row.email || "",
    direccion: row.direccion || "",
    notas: row.notas || "",
    fechaAlta: row.fecha_alta || null,
    cp: row.cp || "",
    localidad: row.localidad || "",
    provincia: row.provincia || "",
  };
}
