/**
 * Un móvil/fijo español real son siempre 9 dígitos. El formulario público y
 * "Aceptar ahora" autocompletan el teléfono a partir del cliente ya
 * guardado (buscarClientePorDni/separarTelefono): si ese valor guardado ya
 * traía un "34" de más pegado al número (dato corrompido de un envío
 * anterior), el siguiente envío lo volvía a combinar con el prefijo del
 * selector y quedaba "34" otra vez de más — creciendo sin límite en cada
 * ciclo (34 → 3434 → 343434… detectado en producción). Esta función se usa
 * tanto al autocompletar (para no perpetuar el dato ya corrompido) como al
 * guardar (para no dejar que se generen números nuevos así de largos).
 */
export function normalizarNumeroLocal(prefijo: string, numeroDigits: string): string {
  if (prefijo === "+34" && numeroDigits.length > 9) return numeroDigits.slice(-9);
  return numeroDigits;
}
