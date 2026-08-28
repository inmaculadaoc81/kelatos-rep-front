// Pills de estado/tipo para las tablas de Asistencia — mismo patrón que
// EstadoBadge ya usado en Ventas/Facturas de Clientes (span redondeado,
// color inline en vez de las variantes fijas de components/ui/badge.tsx).

const ESTILO_ESTADO: Record<string, { bg: string; color?: string }> = {
  pendiente: { bg: "#fef3c7", color: "#92400e" },
  aprobado: { bg: "#d1fae5", color: "#065f46" },
  aprobado_manual: { bg: "#d1fae5", color: "#065f46" },
  aprobado_auto: { bg: "#dbeafe", color: "#1e40af" },
  rechazado: { bg: "#fee2e2", color: "#991b1b" },
  borrador: { bg: "#e4e4e7", color: "#3f3f46" },
};

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  aprobado_manual: "Aprobado (manual)",
  aprobado_auto: "Aprobado (auto)",
  rechazado: "Rechazado",
  borrador: "Borrador",
};

export function EstadoPill({ estado }: { estado: string }) {
  const estilo = ESTILO_ESTADO[estado] || { bg: "#e4e4e7", color: "#3f3f46" };
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: estilo.bg, color: estilo.color }}>
      {ETIQUETA_ESTADO[estado] || estado}
    </span>
  );
}

const ESTILO_TIPO_FICHAJE: Record<string, { bg: string; color?: string }> = {
  entrada: { bg: "#d1fae5", color: "#065f46" },
  salida_comida: { bg: "#fef3c7", color: "#92400e" },
  vuelta_comida: { bg: "#dbeafe", color: "#1e40af" },
  salida: { bg: "#e0e7ff", color: "#3730a3" },
  ausencia: { bg: "#fee2e2", color: "#991b1b" },
  regreso_ausencia: { bg: "#f3e8ff", color: "#6b21a8" },
};

const ETIQUETA_TIPO_FICHAJE: Record<string, string> = {
  entrada: "Entrada",
  salida_comida: "Salida comida",
  vuelta_comida: "Vuelta comida",
  salida: "Salida",
  ausencia: "Ausencia",
  regreso_ausencia: "Regreso ausencia",
};

export function TipoFichajePill({ tipo }: { tipo: string }) {
  const estilo = ESTILO_TIPO_FICHAJE[tipo] || { bg: "#e4e4e7", color: "#3f3f46" };
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: estilo.bg, color: estilo.color }}>
      {ETIQUETA_TIPO_FICHAJE[tipo] || tipo}
    </span>
  );
}
