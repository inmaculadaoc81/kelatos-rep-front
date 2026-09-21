"use client";

import { useEffect, useRef } from "react";

/**
 * Sondeo periódico que solo trabaja con la pestaña visible.
 * Ejecuta `fn` al montar, cada `ms` MIENTRAS la pestaña está a la vista, y
 * de inmediato cuando el usuario vuelve a ella. Las pestañas olvidadas en
 * segundo plano dejan de consultar al servidor (antes cada pestaña abierta
 * seguía preguntando todo el día). `activo=false` pausa el sondeo.
 */
export function useSondeoVisible(fn: () => void, ms: number, activo = true) {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    if (!activo) return;
    const visible = () => typeof document === "undefined" || document.visibilityState === "visible";
    if (visible()) fnRef.current();
    const id = setInterval(() => {
      if (visible()) fnRef.current();
    }, ms);
    const alVolver = () => {
      if (visible()) fnRef.current();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [ms, activo]);
}
