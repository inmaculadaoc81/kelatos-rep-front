/**
 * Fases del progreso de una reparación — port de renderizarTimeline()
 * (Index.html del sistema Apps Script). La lógica de qué fase está
 * completada / en curso se mantiene idéntica; aquí solo se separa del
 * HTML para poder renderizarla con componentes.
 */

import { ReparacionDetalle } from "./reparacion-detalle";

export type EstadoFase = "completada" | "en-curso" | "pendiente" | "no-aplica";

export interface Fase {
  clave: string;
  etiqueta: string;
  estado: EstadoFase;
  /** Fecha asociada, ya formateada, o el texto que ocupa su lugar. */
  detalle: string;
}

/** Estados a partir de los cuales la fase "Presupuesto" ya está superada. */
const TRAS_PRESUPUESTO = [
  "Presupuesto Enviado",
  "Presupuesto Aceptado",
  "Presupuesto Rechazado",
  "Pieza Pendiente",
  "Pieza Entregada",
  "En Reparación",
  "Reparado",
  "No tiene Reparación",
];

/** Ídem para "Respuesta": el cliente ya contestó. */
const TRAS_RESPUESTA = [
  "Presupuesto Aceptado",
  "Presupuesto Rechazado",
  "Pieza Pendiente",
  "Pieza Entregada",
  "En Reparación",
  "Reparado",
  "No tiene Reparación",
];

/** Ídem para "Pieza": ya no se espera ninguna. */
const TRAS_PIEZA = ["Pieza Entregada", "En Reparación", "Reparado", "No tiene Reparación"];

/** Ídem para "Reparación": el técnico ya cerró el equipo. */
const TRAS_REPARACION = ["Reparado", "No tiene Reparación"];

const ENTREGA_CERRADA = ["ENTREGADO", "ENVIO", "RECICLAJE"];

function fase(
  clave: string,
  etiqueta: string,
  completada: boolean,
  enCurso: boolean,
  detalle: string
): Fase {
  return {
    clave,
    etiqueta,
    estado: completada ? "completada" : enCurso ? "en-curso" : "pendiente",
    detalle,
  };
}

export function calcularFases(
  detalle: ReparacionDetalle,
  formatear: (f: string | null) => string
): Fase[] {
  const estado = detalle.estado;
  const primerPresupuesto = detalle.presupuestos[0];
  // El original busca el aceptado y cae al primero: la fecha de respuesta
  // que interesa es la del presupuesto que el cliente contestó.
  const presupuestoRespondido =
    detalle.presupuestos.find((p) => p.estado === "aceptado") || primerPresupuesto;
  const primerPedido = detalle.pedidos[0];
  // Las conversiones de cintas no pasan por pedido de pieza: se dan por
  // superadas en cuanto el presupuesto está aceptado.
  const esCintas = !!detalle.datosCintas && detalle.datosCintas !== "";

  const faseEntregaCompletada = ENTREGA_CERRADA.includes(detalle.estadoEntrega);

  const fasePieza: Fase = (() => {
    const completada = TRAS_PIEZA.includes(estado) || (esCintas && estado === "Presupuesto Aceptado");
    const enCurso = estado === "Pieza Pendiente";
    if (!completada && !enCurso && !primerPedido) {
      return { clave: "pieza", etiqueta: "Pieza", estado: "no-aplica", detalle: "N/A" };
    }
    return fase(
      "pieza",
      "Pieza",
      completada,
      enCurso,
      primerPedido ? (primerPedido.fechaEstimada ? formatear(primerPedido.fechaEstimada) : "Pendiente") : "N/A"
    );
  })();

  return [
    fase("recepcion", "Recepción", true, false, formatear(detalle.fechaRecepcion)),
    fase(
      "presupuesto",
      "Presupuesto",
      TRAS_PRESUPUESTO.includes(estado),
      estado === "Presupuesto Pendiente",
      primerPresupuesto?.fechaElaboracion ? formatear(primerPresupuesto.fechaElaboracion) : "-"
    ),
    fase(
      "respuesta",
      "Respuesta",
      TRAS_RESPUESTA.includes(estado),
      estado === "Presupuesto Enviado",
      presupuestoRespondido?.fechaRespuesta ? formatear(presupuestoRespondido.fechaRespuesta) : "-"
    ),
    fasePieza,
    fase(
      "reparacion",
      "Reparación",
      TRAS_REPARACION.includes(estado),
      estado === "En Reparación",
      detalle.fechaReparacion ? formatear(detalle.fechaReparacion) : "-"
    ),
    fase(
      "entrega",
      "Entrega",
      faseEntregaCompletada,
      false,
      detalle.fechaEntrega ? formatear(detalle.fechaEntrega) : "-"
    ),
  ];
}

/**
 * Primera línea del síntoma vs. el resto. El formulario de recepción
 * guarda el síntoma y las respuestas del cuestionario (¿Enciende?,
 * ¿Golpe?, Nº Serie…) en un mismo campo separadas por saltos de línea;
 * mostrarSintomaDetalle() las separaba para no dejar un párrafo ilegible.
 */
export function separarSintoma(sintoma: string): { principal: string; extras: string[] } {
  const lineas = String(sintoma || "").split("\n");
  return {
    principal: lineas[0]?.trim() || "No especificado",
    extras: lineas.slice(1).map((l) => l.trim()).filter(Boolean),
  };
}
