import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Protege todas las rutas salvo /login y /api/auth/* — equivalente a la
 * comprobación de Session.getActiveUser() al principio de doGet() en
 * Code.js. La restricción de dominio en sí (@kelatos.com) ya se aplica
 * en el callback signIn de src/auth.ts; aquí solo se exige que exista
 * una sesión válida.
 */
export default auth((req) => {
  const isAuthed = !!req.auth?.user;
  if (!isAuthed) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }
  // Configuración (lista de usuarios) es solo para el Administrador.
  if (req.nextUrl.pathname.startsWith("/configuracion") && req.auth?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
});

export const config = {
  matcher: [
    "/((?!login|api/auth|formulario|api/formulario-cliente|api/formulario-recogida|_next/static|_next/image|favicon.ico).*)",
  ],
};
