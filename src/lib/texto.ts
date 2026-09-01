/**
 * El texto que llega como "respuesta del cliente" (webhook de n8n) suele
 * ser el email completo del cliente, con la cabecera de cita que añade el
 * propio cliente de correo ("On [fecha] [hora] Kelatos Servicio Técnico
 * <soporte@kelatos.com> wrote:" / equivalente en español "El ... escribió:")
 * seguida del hilo citado — nunca la enviamos nosotros, viene ya así en la
 * respuesta original. Se corta ahí para mostrar solo lo que el cliente
 * escribió de verdad (bug real reportado, 2026-09-01: se mostraba todo
 * junto, ilegible).
 */
const PATRON_CITA_CORREO = /\bOn\s+.{5,120}\bwrote:|\bEl\s+.{5,120}\bescribi[oó]:/i;

export function limpiarRespuestaCliente(texto: string | null | undefined): string {
  if (!texto) return "";
  const m = texto.match(PATRON_CITA_CORREO);
  const limpio = m && m.index !== undefined ? texto.slice(0, m.index) : texto;
  return limpio.trim();
}
