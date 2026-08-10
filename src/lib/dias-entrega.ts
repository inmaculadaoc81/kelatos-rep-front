import { Reparacion } from "./reparaciones";

/** Días laborables (L-V) entre dos fechas — idéntico a
 * calcularDiasLaborablesFrontend() en Index.html. */
function diasLaborables(inicio: Date, fin: Date): number {
  const i = new Date(inicio);
  const f = new Date(fin);
  i.setHours(0, 0, 0, 0);
  f.setHours(0, 0, 0, 0);

  let dias = 0;
  const actual = new Date(i);
  while (actual <= f) {
    const diaSemana = actual.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) dias++;
    actual.setDate(actual.getDate() + 1);
  }
  return dias;
}

export type DiasEntregaEstado = {
  texto: string;
  clase: "" | "text-muted-foreground" | "text-green-600 dark:text-green-500" | "text-amber-600 dark:text-amber-500 font-semibold" | "text-red-600 dark:text-red-500 font-semibold";
};

/** Réplica exacta de calcularDiasEntregaFrontend() (Index.html): sin
 * pieza cuenta desde que el cliente aceptó el presupuesto; con pieza,
 * desde que la pieza fue recibida. */
export function calcularDiasEntrega(rep: Reparacion): DiasEntregaEstado {
  const summary = rep.pptoAceptadoSummary;
  const tiempoPrometido = summary?.diasEntrega || 0;

  if (!tiempoPrometido) return { texto: "-", clase: "" };

  const costoPiezas = summary?.costoPiezas ?? 0;
  let fechaInicio: string | null = null;

  if (costoPiezas > 0) {
    const pedidoRecibido = rep.pedidos.find((p) => p.estado === "Recibido");
    fechaInicio = pedidoRecibido?.fechaRecepcion ?? null;
  } else {
    fechaInicio = summary?.fechaRespuesta ?? null;
  }

  if (!fechaInicio) return { texto: `${tiempoPrometido}d`, clase: "text-muted-foreground" };

  const transcurridos = diasLaborables(new Date(fechaInicio), new Date());
  const restantes = tiempoPrometido - transcurridos;

  if (restantes > 0) return { texto: `${restantes}d`, clase: "text-green-600 dark:text-green-500" };
  if (restantes === 0) return { texto: "Hoy", clase: "text-amber-600 dark:text-amber-500 font-semibold" };
  return { texto: `+${Math.abs(restantes)}d`, clase: "text-red-600 dark:text-red-500 font-semibold" };
}

export function formatearFecha(fecha: string | null): string {
  if (!fecha) return "-";
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}
