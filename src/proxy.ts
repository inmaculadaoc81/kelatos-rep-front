import { auth, esDominioKelatos } from "@/auth";
import { NextResponse } from "next/server";
import { esSuperadmin } from "@/lib/superadmin";

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
  // Dashboard de Transferencias — vista aparte, solo para superadmins
  // (mismo conjunto que ya puede borrar registros en /admin/registros).
  if (req.nextUrl.pathname.startsWith("/transferencias") && !esSuperadmin(req.auth?.user?.email)) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
  // Dashboard de Asistencia (fichajes) — un empleado que ficha puede no
  // tener cuenta @kelatos.com (login ampliado en src/auth.ts); esa cuenta
  // solo puede entrar a /asistencia/kiosk (y a sus propias llamadas API
  // en /api/asistencia/kiosk/*), nunca al resto del dashboard. Sin el
  // "/api/asistencia" en esta comprobación, cada fetch() del kiosco
  // (fichar, mis-fichajes, rgpd...) rebotaba en 307 en vez de responder
  // JSON — bug real encontrado verificando con una sesión simulada,
  // 2026-08-28. El panel /asistencia/admin sigue restringido a admins.
  const enAsistencia = req.nextUrl.pathname.startsWith("/asistencia") || req.nextUrl.pathname.startsWith("/api/asistencia");
  const enAsistenciaAdmin = req.nextUrl.pathname.startsWith("/asistencia/admin") || req.nextUrl.pathname.startsWith("/api/asistencia/admin");
  const esSoloAsistencia = req.auth?.user?.asistenciaEmpleadoId != null && !esDominioKelatos(req.auth?.user?.email || "");
  if (esSoloAsistencia && !enAsistencia) {
    return NextResponse.redirect(new URL("/asistencia/kiosk", req.nextUrl.origin));
  }
  if (enAsistenciaAdmin && req.auth?.user?.role !== "admin" && !esSuperadmin(req.auth?.user?.email)) {
    return NextResponse.redirect(new URL("/asistencia/kiosk", req.nextUrl.origin));
  }
});

export const config = {
  matcher: [
    "/((?!login|api/auth|formulario|api/formulario-cliente|api/formulario-recogida|_next/static|_next/image|favicon.ico|logos).*)",
  ],
};
