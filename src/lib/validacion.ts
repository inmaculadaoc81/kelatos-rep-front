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
