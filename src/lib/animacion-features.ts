/**
 * Aislado en su propio módulo a propósito: `LazyMotion` lo importa con un
 * `import()` dinámico, así que todo lo que cuelgue de aquí acaba en un chunk
 * aparte y no en el bundle inicial. Si se importara `domAnimation` desde el
 * componente, viajaría siempre, aunque nadie abriera una reparación.
 *
 * `domAnimation` trae animaciones y gestos básicos; se descarta `domMax`
 * porque incluye drag y layout animations, que aquí no se usan.
 */
export { domAnimation as default } from "framer-motion";
