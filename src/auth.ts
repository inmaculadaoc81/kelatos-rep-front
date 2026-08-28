import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { RolUsuario } from "@/types/next-auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

/**
 * Restricción de dominio equivalente a la de doGet() en Apps Script
 * (Code.js): `emailSesion.endsWith('@' + DOMINIO_ADMIN)`. Aquí se aplica
 * en signIn (bloquea el inicio de sesión) y otra vez en el callback de
 * sesión (por si un token viejo de otro dominio quedara en la cookie).
 *
 * El original no tenía roles (verificarPermisos() solo comprobaba el
 * dominio, sin distinguir usuarios) — esto es una capa nueva: dos roles,
 * Administrador y Usuario, determinados por email. kelatoscielo@gmail.com
 * y kelatosclaude2@gmail.com son las únicas cuentas fuera del dominio
 * @kelatos.com y ejercen de Administrador.
 */
const DOMINIO_ADMIN = "kelatos.com";
const EMAILS_ADMIN = new Set(["kelatoscielo@gmail.com", "kelatosclaude2@gmail.com"]);

export function esDominioKelatos(email: string): boolean {
  const e = email.toLowerCase();
  return e.endsWith(`@${DOMINIO_ADMIN}`) || EMAILS_ADMIN.has(e);
}

function rolPara(email: string): RolUsuario {
  return EMAILS_ADMIN.has(email.toLowerCase()) ? "admin" : "usuario";
}

/**
 * Empleados de Asistencia (fichajes) — pedido del usuario, 2026-08-28:
 * "prefiero que todos usen Google también en el kiosco". Un técnico de
 * taller que ficha no tiene por qué tener cuenta @kelatos.com, así que se
 * amplía el acceso: cualquier email dado de alta en asistencia.empleados
 * puede iniciar sesión, aunque no sea del dominio — pero solo entra a
 * /asistencia (ver src/proxy.ts), nunca al resto del dashboard.
 */
async function buscarEmpleadoAsistencia(email: string): Promise<number | null> {
  try {
    const data = await kelatosApiGet<{ ok: boolean; empleado: { id: number } | null }>(
      "/v1/asistencia/empleados",
      { email }
    );
    return data.empleado?.id ?? null;
  } catch {
    // Si el API interno falla, no se bloquea el login de las cuentas
    // @kelatos.com normales — solo se pierde temporalmente el acceso al
    // kiosco para cuentas ajenas al dominio (best-effort, igual que el
    // resto de llamadas no críticas de esta app).
    return null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email || "";
      if (esDominioKelatos(email)) return true;
      return (await buscarEmpleadoAsistencia(email)) !== null;
    },
    async jwt({ token }) {
      if (token.email) {
        token.role = rolPara(token.email);
        // Se busca SIEMPRE, no solo para cuentas ajenas al dominio — una
        // cuenta @kelatos.com también puede estar dada de alta como
        // empleado que ficha (p.ej. Daniela), y necesita su propio id de
        // asistencia.empleados para poder fichar ella misma.
        token.asistenciaEmpleadoId = await buscarEmpleadoAsistencia(token.email);
      }
      return token;
    },
    async session({ session, token }) {
      const email = session.user?.email || "";
      const permitido = email && (esDominioKelatos(email) || token.asistenciaEmpleadoId != null);
      if (!permitido) {
        // No debería ocurrir tras el guard de signIn, pero si ocurriera,
        // no se expone una sesión válida para un email no permitido.
        session.user = undefined as unknown as typeof session.user;
        return session;
      }
      session.user.role = token.role || rolPara(email);
      session.user.asistenciaEmpleadoId = token.asistenciaEmpleadoId ?? null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
