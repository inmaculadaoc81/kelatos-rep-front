import { auth, esDominioKelatos } from "@/auth";
import { NextResponse } from "next/server";
import { esSuperadmin, puedeVerTransferencias } from "@/lib/superadmin";

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
  // Contabilidad (Importaciones / DUA…) — solo administradores; el menú ya la
  // oculta al resto (navegacion.tsx) y aquí se cierra también la ruta directa.
  if (
    (["/importaciones", "/api/importaciones", "/reporte-resenas", "/api/resenas"].some((r) => req.nextUrl.pathname.startsWith(r))) &&
    req.auth?.user?.role !== "admin" &&
    !esSuperadmin(req.auth?.user?.email)
  ) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
  // Dashboard de Transferencias — vista aparte. Superadmins entran por
  // serlo; puedeVerTransferencias además admite cuentas con acceso SOLO a
  // este módulo, sin el resto de poderes de superadmin.
  if (req.nextUrl.pathname.startsWith("/transferencias") && !puedeVerTransferencias(req.auth?.user?.email)) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
  // Dashboard de Webs Kelatos — vista aparte, solo administradores
  // (mismo criterio que nav-user.tsx/webs-kelatos/layout.tsx — defensa en
  // profundidad, igual patrón que Transferencias).
  if (
    req.nextUrl.pathname.startsWith("/webs-kelatos") &&
    req.auth?.user?.role !== "admin" &&
    !esSuperadmin(req.auth?.user?.email)
  ) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
  // Dashboard de Agentes IA — vista aparte, solo administradores (mismo
  // criterio que Webs Kelatos — defensa en profundidad, ver también
  // agentes/layout.tsx).
  if (
    req.nextUrl.pathname.startsWith("/agentes") &&
    req.auth?.user?.role !== "admin" &&
    !esSuperadmin(req.auth?.user?.email)
  ) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
  // Gestión MAILS — vista aparte, solo administradores (mismo criterio que
  // Agentes; los buzones guardan credenciales de correo). Las rutas de API
  // repiten la comprobación (src/lib/mails-auth.ts).
  if (
    (req.nextUrl.pathname.startsWith("/mails") || req.nextUrl.pathname.startsWith("/api/mails")) &&
    req.auth?.user?.role !== "admin" &&
    !esSuperadmin(req.auth?.user?.email)
  ) {
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
  // viaCredentials: el login por email+contraseña nunca cuenta como "del
  // dominio" aunque el email tenga forma @kelatos.com (p.ej.
  // ivan.gonzalez@kelatos.com sin cuenta de Gmail real) — es la vía
  // pensada solo para el kiosco, así que confina igual que una cuenta
  // ajena al dominio. 2026-08-31.
  const esSoloAsistencia = req.auth?.user?.asistenciaEmpleadoId != null &&
    (req.auth?.user?.viaCredentials || !esDominioKelatos(req.auth?.user?.email || ""));
  if (esSoloAsistencia && !enAsistencia) {
    return NextResponse.redirect(new URL("/asistencia/kiosk", req.nextUrl.origin));
  }
  if (enAsistenciaAdmin && req.auth?.user?.role !== "admin" && !esSuperadmin(req.auth?.user?.email)) {
    return NextResponse.redirect(new URL("/asistencia/kiosk", req.nextUrl.origin));
  }
});

export const config = {
  matcher: [
    // api/mails/imagen queda fuera: la piden <img> dentro de un iframe con
    // srcDoc (origen opaco), sin cookie de sesión (SameSite la bloquea) —
    // esa ruta hace su propia comprobación (sesión o token corto, ver
    // mails-image-token.ts) en vez de la cookie que exige este middleware.
    "/((?!login|api/auth|api/mails/imagen|formulario|api/formulario-cliente|api/formulario-recogida|api/formulario-entrega-venta|_next/static|_next/image|favicon.ico|logos).*)",
  ],
};
