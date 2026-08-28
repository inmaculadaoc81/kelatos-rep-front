/**
 * Restricción de dominio equivalente a la de doGet() en Apps Script
 * (Code.js): `emailSesion.endsWith('@' + DOMINIO_ADMIN)`. Vive en su
 * propio archivo (sin nada de NextAuth) para poder importarse tanto desde
 * server code (src/auth.ts, src/proxy.ts) como desde componentes cliente
 * (nav-user.tsx) — importar directamente de src/auth.ts en un componente
 * "use client" intentaría empaquetar la configuración entera de NextAuth
 * (secretos incluidos) en el bundle del navegador.
 */
const DOMINIO_ADMIN = "kelatos.com";
export const EMAILS_ADMIN = new Set(["kelatoscielo@gmail.com", "kelatosclaude2@gmail.com"]);

export function esDominioKelatos(email: string): boolean {
  const e = email.toLowerCase();
  return e.endsWith(`@${DOMINIO_ADMIN}`) || EMAILS_ADMIN.has(e);
}
