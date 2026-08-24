/**
 * Validaciones de formato reutilizadas en formularios de todo el proyecto.
 * `type="email"`/`type="url"` en el HTML no bastan por sí solos: estos
 * diálogos envían con fetch() desde un onClick, no con un <form> nativo, así
 * que el navegador nunca llega a comprobar el formato — hay que validarlo
 * explícitamente antes de enviar, igual que el resto de validaciones del
 * proyecto (required, mínimos, etc.).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

/** true si v está vacío (los campos opcionales se validan solo si tienen contenido) o tiene forma de email. */
export function esEmailValido(v: string): boolean {
  const t = v.trim();
  return t === "" || EMAIL_RE.test(t);
}

/** true si v está vacío o tiene forma de URL http(s) — coincide con lo que exige el original (enlace de compra). */
export function esUrlValida(v: string): boolean {
  const t = v.trim();
  return t === "" || URL_RE.test(t);
}

// Typo real y recurrente al escribir en el móvil: "gmail.con"/"hotmail.con"
// en vez de ".com" (bug real reportado — varios clientes lo escribieron así
// en el formulario público y los correos de confirmación rebotaron). Solo
// corrige cuando el dominio termina EXACTAMENTE en ".con" (ancla $, no una
// subcadena) — nunca toca ".com" (ya correcto, no coincide con /\.con$/),
// ni otras terminaciones que solo contengan "con" en medio (".consulting",
// ".construction"...), así no hay falsos positivos ni un ".con.com" por
// añadir en vez de sustituir.
const DOMINIO_CON_RE = /\.con$/i;

/** Corrige "algo@dominio.con" -> "algo@dominio.com"; cualquier otro valor (incluido ya correcto o vacío) se devuelve tal cual. */
export function corregirTypoDominioEmail(v: string): string {
  const t = v.trim();
  if (!DOMINIO_CON_RE.test(t)) return t;
  return t.replace(DOMINIO_CON_RE, ".com");
}
