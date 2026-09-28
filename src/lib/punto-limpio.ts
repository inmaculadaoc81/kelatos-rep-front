/** Vista "Punto Limpio" — reparaciones con estado_entrega='RECICLAJE' y el
    motivo/destino registrado (ver GET /v1/lecturas/punto-limpio). */

export type MotivoPuntoLimpio = "reparable" | "reciclaje_interno" | "retirado" | "otro";
export type DestinoPuntoLimpio = "venta" | "alquiler" | "uso_interno";

export const MOTIVOS_PUNTO_LIMPIO: { valor: MotivoPuntoLimpio; label: string }[] = [
  { valor: "reparable", label: "Puede ser reparable" },
  { valor: "reciclaje_interno", label: "Reciclaje interno" },
  { valor: "retirado", label: "Ya no está en la tienda — se llevó a punto limpio" },
  { valor: "otro", label: "Otro" },
];

export const DESTINOS_PUNTO_LIMPIO: { valor: DestinoPuntoLimpio; label: string }[] = [
  { valor: "venta", label: "Poner en venta" },
  { valor: "alquiler", label: "Pasar a alquiler" },
  { valor: "uso_interno", label: "Uso interno" },
];

export function labelMotivo(motivo: string | null): string {
  return MOTIVOS_PUNTO_LIMPIO.find((m) => m.valor === motivo)?.label || "Sin motivo registrado";
}

export function labelDestino(destino: string | null): string {
  return DESTINOS_PUNTO_LIMPIO.find((d) => d.valor === destino)?.label || "";
}

interface FilaPuntoLimpioSql {
  resguardo: string;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  equipo_modelo: string | null;
  estado: string | null;
  fecha_entrega: string | null;
  punto_limpio_motivo: string | null;
  punto_limpio_motivo_detalle: string | null;
  punto_limpio_destino: string | null;
  punto_limpio_registrado_en: string | null;
  punto_limpio_registrado_por: string | null;
  ppto_id: string | null;
  ppto_numero: string | null;
  ppto_version: number | null;
  ppto_estado: string | null;
  ppto_total: string | number | null;
  ppto_fecha_envio: string | null;
  ppto_motivo_rechazo: string | null;
  ppto_concepto: string | null;
  ppto_total_versiones: number | null;
}

/** El presupuesto más relevante de la reparación: el aceptado; si no lo hay, el último que se envió al cliente. */
export interface PresupuestoPuntoLimpio {
  id: string;
  numero: string;
  version: number | null;
  totalVersiones: number;
  estado: string;
  total: number | null;
  fechaEnvio: string | null;
  concepto: string;
  motivoRechazo: string;
}

export const ESTILO_ESTADO_PRESUPUESTO: Record<string, string> = {
  aceptado: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
  rechazado: "border-red-500/40 text-red-700 dark:text-red-400",
  enviado: "border-sky-500/40 text-sky-700 dark:text-sky-400",
  sin_respuesta: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  anulado: "text-muted-foreground",
};

export function labelEstadoPresupuesto(estado: string): string {
  const e = estado.toLowerCase();
  return e === "sin_respuesta" ? "Sin respuesta" : e ? e.charAt(0).toUpperCase() + e.slice(1) : "—";
}

export interface PuntoLimpioItem {
  resguardo: string;
  clienteNombre: string;
  clienteTelefono: string;
  equipoModelo: string;
  estado: string;
  fechaEntrega: string | null;
  motivo: MotivoPuntoLimpio | null;
  motivoDetalle: string;
  destino: DestinoPuntoLimpio | null;
  registradoEn: string | null;
  registradoPor: string;
  presupuesto: PresupuestoPuntoLimpio | null;
}

export function mapearPuntoLimpio(row: FilaPuntoLimpioSql): PuntoLimpioItem {
  return {
    resguardo: row.resguardo,
    clienteNombre: row.cliente_nombre || "",
    clienteTelefono: row.cliente_telefono || "",
    equipoModelo: row.equipo_modelo || "",
    estado: row.estado || "",
    fechaEntrega: row.fecha_entrega,
    motivo: (row.punto_limpio_motivo as MotivoPuntoLimpio | null) || null,
    motivoDetalle: row.punto_limpio_motivo_detalle || "",
    destino: (row.punto_limpio_destino as DestinoPuntoLimpio | null) || null,
    registradoEn: row.punto_limpio_registrado_en,
    registradoPor: row.punto_limpio_registrado_por || "",
    presupuesto: row.ppto_id
      ? {
          id: row.ppto_id,
          numero: row.ppto_numero || "",
          version: row.ppto_version,
          totalVersiones: row.ppto_total_versiones ?? 1,
          estado: (row.ppto_estado || "").toLowerCase(),
          total: row.ppto_total === null || row.ppto_total === undefined ? null : Number(row.ppto_total),
          fechaEnvio: row.ppto_fecha_envio,
          concepto: (row.ppto_concepto || "").replace(/\s+/g, " ").trim(),
          motivoRechazo: row.ppto_motivo_rechazo || "",
        }
      : null,
  };
}
