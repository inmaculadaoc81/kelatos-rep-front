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
