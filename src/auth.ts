import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { RolUsuario } from "@/types/next-auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { esDominioKelatos, EMAILS_ADMIN } from "@/lib/dominio-kelatos";

export { esDominioKelatos };

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
  // Desplegado en Hostinger, no Vercel — sin esto, Auth.js v5 no confía
  // en el host que le manda el proxy y puede generar mal la URL absoluta
  // de redirección en flujos que no pasan por /api/auth/callback (el
  // signOut() de un Server Action, sobre todo), lo que en el navegador
  // se ve como "This page couldn't load" al pulsar "Salir" — el login
  // normal no lo sufría porque ese flujo sí resuelve el host de otra
  // forma. 2026-08-31.
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    // Alternativa a Google para empleados de Asistencia cuyo email
    // registrado (p.ej. ivan.gonzalez@kelatos.com) no está asociado a una
    // cuenta de Gmail real — pedido del usuario, 2026-08-31. Verifica
    // contra asistencia.empleados.password_hash en el backend; solo da
    // acceso al kiosco (nunca al dominio @kelatos.com por esta vía, ni
    // rol de admin — eso sigue siendo exclusivo de Google).
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = typeof creds?.email === "string" ? creds.email.trim() : "";
        const password = typeof creds?.password === "string" ? creds.password : "";
        if (!email || !password) return null;
        try {
          const data = await kelatosApiPost<{ ok: boolean; empleado?: { id: number; nombre: string; email: string } }>(
            "/v1/asistencia/login",
            { email, password }
          );
          if (!data.ok || !data.empleado) return null;
          return { id: String(data.empleado.id), name: data.empleado.nombre, email: data.empleado.email };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      // El Credentials provider ya validó email+contraseña dentro de
      // authorize() — si llegó hasta aquí, es un empleado activo real.
      if (account?.provider === "credentials") return true;
      const email = profile?.email || "";
      if (esDominioKelatos(email)) return true;
      return (await buscarEmpleadoAsistencia(email)) !== null;
    },
    async jwt({ token, account }) {
      // "account" solo llega en el login inicial, no en refrescos
      // posteriores del JWT — hay que guardar el dato en el propio token.
      if (account) token.viaCredentials = account.provider === "credentials";
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
      // Login por credenciales nunca cuenta como "del dominio" aunque el
      // email tenga forma @kelatos.com — es la vía pensada solo para
      // empleados sin cuenta de Gmail real, deben quedar confinados al
      // kiosco igual que cualquier cuenta ajena al dominio (ver
      // proxy.ts). Si no tiene alta en asistencia.empleados tampoco entra.
      const permitido = email && !token.viaCredentials && esDominioKelatos(email)
        ? true
        : !!email && token.asistenciaEmpleadoId != null;
      if (!permitido) {
        // No debería ocurrir tras el guard de signIn, pero si ocurriera,
        // no se expone una sesión válida para un email no permitido.
        session.user = undefined as unknown as typeof session.user;
        return session;
      }
      session.user.role = token.role || rolPara(email);
      session.user.asistenciaEmpleadoId = token.asistenciaEmpleadoId ?? null;
      session.user.viaCredentials = !!token.viaCredentials;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
