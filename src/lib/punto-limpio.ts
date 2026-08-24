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
  };
}
