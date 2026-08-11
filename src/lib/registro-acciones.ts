/**
 * "Registro de Acciones" (Index.html) — log general de eventos de todos
 * los módulos (kelatos_app.historial), no solo reparaciones. Reutiliza
 * GET /v1/lecturas/historial, la misma ruta que ya usa historial de
 * reparaciones, pero sin el filtro de tipos por categoría.
 */

export interface EventoRegistro {
  eventoId: string;
  resguardo: string;
  fechaHora: string | null;
  empleadoId: string;
  tipo: string;
  descripcion: string;
  entidad: string;
}

// El original deriva "Entidad" a partir del prefijo del tipo — no es una
// columna propia de kelatos_app.historial. Se reproduce ese criterio aquí;
// cualquier tipo no reconocido cae en "Reparación" (categoría por defecto,
// ya que la mayoría de tipos son eventos de reparación).
const PREFIJOS_ENTIDAD: [string, string][] = [
  ["cliente", "Cliente"],
  ["equipo_", "Equipo"],
  ["alquiler", "Alquiler"],
  ["venta", "Venta"],
  ["item_", "Venta"],
  ["presupuesto", "Presupuesto"],
  ["factura", "Factura"],
  ["pedido", "Pedido"],
];

function derivarEntidad(tipo: string): string {
  const t = tipo.toLowerCase();
  for (const [prefijo, entidad] of PREFIJOS_ENTIDAD) {
    if (t.startsWith(prefijo)) return entidad;
  }
  return "Reparación";
}

interface FilaHistorialSql {
  evento_id: string;
  resguardo: string | null;
  fecha_hora: string | null;
  empleado_id: string | null;
  tipo: string | null;
  descripcion: string | null;
}

export function mapearEventoRegistro(row: FilaHistorialSql): EventoRegistro {
  const tipo = row.tipo || "";
  return {
    eventoId: row.evento_id,
    resguardo: row.resguardo || "",
    fechaHora: row.fecha_hora,
    empleadoId: row.empleado_id || "",
    tipo,
    descripcion: row.descripcion || "",
    entidad: derivarEntidad(tipo),
  };
}
