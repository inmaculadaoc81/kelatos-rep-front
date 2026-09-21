/**
 * Totales de las facturas de alquiler — un solo sitio para las reglas que
 * usan Facturas de Clientes y el detalle del alquiler.
 *
 * Por qué hace falta: en `alquileres`, `fianza_cobrada` se guarda como BASE
 * sin IVA (165,29 → 200 € con IVA) mientras que la factura sí lleva IVA sobre
 * la fianza. Sumar `total_previsto` (ya con IVA) + `fianza_cobrada` a secas
 * dejaba el total 34,71 € corto (bug real reportado 2026-09-21 con
 * ALQ-0049: la lista decía 189,49 € y la factura real es 224,20 €).
 */

const IVA = 1.21;

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Fianza tal como aparece en la factura (base + 21 % de IVA). */
export function fianzaConIva(fianzaBase: number): number {
  return redondear(fianzaBase * IVA);
}

/**
 * Total de la factura principal. `total_cobrado` es el importe real cuando
 * la factura lo dejó registrado (creación del alquiler, ajustes de duración);
 * al devolver el equipo se vuelve a poner a 0, y entonces el total se
 * reconstruye: alquiler previsto (ya con IVA) + fianza con IVA + envío.
 */
export function totalFacturaPrincipalAlquiler(p: { cobrado: number; previsto: number; fianzaBase: number; envio?: number }): number {
  if (p.cobrado > 0) return redondear(p.cobrado);
  return redondear(p.previsto + fianzaConIva(p.fianzaBase) + (p.envio || 0));
}

/**
 * Total (negativo) de una rectificativa de alquiler. La rectificativa de
 * "solo fianza" se guardó durante un tiempo con la fianza SIN IVA
 * (`-fianza_cobrada`, p. ej. -165,29 cuando el documento dice -200,00): se
 * reconoce por ser exactamente `-fianza_cobrada` y se le añade el IVA.
 * Sin importe guardado, se reconstruye como la anulación de la principal.
 */
export function totalRectificativaAlquiler(p: { guardado: number; previsto: number; fianzaBase: number }): number {
  if (p.guardado === 0) return redondear(-(p.previsto + fianzaConIva(p.fianzaBase)));
  if (p.fianzaBase > 0 && Math.abs(p.guardado + p.fianzaBase) < 0.005) return -fianzaConIva(p.fianzaBase);
  return p.guardado;
}
