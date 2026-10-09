"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Entre teclas de una persona escribiendo a mano nunca baja de ~60-80ms;
    un lector de códigos de barras USB (emula teclado) los manda en
    ráfaga, casi siempre por debajo de 30ms entre caracteres. */
const INTERVALO_MAX_ESCANEO_MS = 30;
/** Si pasa más de esto desde la última tecla sin que llegue el Enter
    final, se descarta el búfer — no es un escaneo completo. */
const TIMEOUT_BUFER_MS = 300;

function elementoEsCampoDeTexto(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return (el as HTMLElement).isContentEditable === true;
}

/**
 * Atajo global: escanear el código de barras de una etiqueta de resguardo
 * (lector USB tipo "teclado", LENVII) en CUALQUIER pantalla del dashboard
 * salta directo al detalle de esa reparación — sin tener que hacer clic en
 * ningún buscador primero. Petición del usuario, 2026-10-09.
 *
 * No interfiere con la escritura normal: se ignora por completo mientras
 * el foco esté en un campo de texto/textarea/select, y además exige que
 * las teclas lleguen a velocidad de escaneo (no de una persona tecleando).
 */
export function EscanerCodigoBarras() {
  const router = useRouter();
  const buferRef = useRef("");
  const ultimaTeclaRef = useRef(0);

  useEffect(() => {
    function alPulsarTecla(e: KeyboardEvent) {
      if (elementoEsCampoDeTexto(document.activeElement)) return;

      const ahora = Date.now();
      const transcurrido = ahora - ultimaTeclaRef.current;
      ultimaTeclaRef.current = ahora;

      if (e.key === "Enter") {
        const codigo = buferRef.current;
        buferRef.current = "";
        if (/^\d{3,8}$/.test(codigo)) {
          e.preventDefault();
          router.push(`/reparaciones?resguardo=${codigo}`);
        }
        return;
      }

      if (transcurrido > TIMEOUT_BUFER_MS) buferRef.current = "";

      if (/^\d$/.test(e.key)) {
        // Primer dígito: siempre se acepta (no hay tecla anterior con la
        // que medir el ritmo). A partir del segundo, debe cumplir la
        // velocidad de escaneo o se reinicia el búfer con este dígito.
        if (buferRef.current.length > 0 && transcurrido > INTERVALO_MAX_ESCANEO_MS) {
          buferRef.current = e.key;
        } else {
          buferRef.current += e.key;
        }
      } else {
        buferRef.current = "";
      }
    }

    window.addEventListener("keydown", alPulsarTecla);
    return () => window.removeEventListener("keydown", alPulsarTecla);
  }, [router]);

  return null;
}
