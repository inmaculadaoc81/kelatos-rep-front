"use client";

/**
 * Capa fina sobre framer-motion, pensada para no engordar el bundle.
 *
 * Dos decisiones deliberadas:
 *
 * 1. Se exporta `m` en vez de `motion`. El componente `motion` arrastra todo
 *    el motor de animación (~34 kB); `m` no trae nada por sí mismo y las
 *    funciones se cargan una sola vez desde el `LazyMotion` de más abajo.
 * 2. Ese `LazyMotion` recibe una función que hace `import()` de
 *    ./animacion-features, de modo que el motor se descarga en un chunk
 *    aparte y solo cuando se monta este proveedor. Pasarle `domAnimation`
 *    importado de forma estática lo metería en el bundle inicial y anularía
 *    la ventaja.
 *
 * `MotionConfig reducedMotion="user"` respeta prefers-reduced-motion sin
 * tener que comprobarlo en cada componente.
 */

import type { ReactNode } from "react";
import { LazyMotion, MotionConfig } from "framer-motion";

/** Carga diferida: el motor viaja en su propio chunk, no en el inicial. */
const cargarFeatures = () => import("./animacion-features").then((mod) => mod.default);

export { m } from "framer-motion";
export { AnimatePresence } from "framer-motion";

/** Duraciones cortas: esto es un panel de trabajo, no una landing. */
export const DURACION = { rapida: 0.15, normal: 0.22 } as const;

/** Entrada estándar de un bloque: aparece subiendo unos píxeles. */
export const entrada = {
  inicial: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Lista con aparición escalonada. El retardo es pequeño y se corta a los
 * pocos elementos, para que una lista larga no tarde en asentarse.
 */
export const lista = {
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

export const elementoLista = {
  inicial: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: DURACION.rapida } },
};

export function ProveedorAnimacion({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={cargarFeatures} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: DURACION.normal, ease: "easeOut" }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
