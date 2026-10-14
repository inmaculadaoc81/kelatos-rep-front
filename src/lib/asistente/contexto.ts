"use client";

import { useEffect } from "react";

/**
 * Qué elemento tiene abierto el usuario en pantalla (un resguardo, un equipo...). Lo registra cada diálogo de
 * detalle con `useContextoAsistente` y el asistente lo envía con cada pregunta, para poder contestar a
 * "¿cuándo se generó este resguardo?". Es un simple valor en memoria: no provoca renders.
 */
export interface ContextoPantalla {
  /** Tipo de elemento en lenguaje natural: "resguardo", "equipo", "factura"... */
  tipo: string;
  /** Su identificador: el número de resguardo, "EQ-0007"... */
  id: string;
}

let actual: ContextoPantalla | null = null;

export function contextoPantallaActual(): ContextoPantalla | null {
  return actual;
}

/** Registra el elemento abierto mientras el componente está montado (y `ctx` no sea null). */
export function useContextoAsistente(ctx: ContextoPantalla | null) {
  const tipo = ctx?.tipo ?? null;
  const id = ctx?.id ?? null;
  useEffect(() => {
    if (!tipo || !id) return;
    const mio = { tipo, id };
    actual = mio;
    return () => {
      if (actual === mio) actual = null;
    };
  }, [tipo, id]);
}
