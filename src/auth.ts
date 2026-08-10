import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Restricción de dominio equivalente a la de doGet() en Apps Script
 * (Code.js): `emailSesion.endsWith('@' + DOMINIO_ADMIN)`. Aquí se aplica
 * en signIn (bloquea el inicio de sesión) y otra vez en el callback de
 * sesión (por si un token viejo de otro dominio quedara en la cookie).
 */
const DOMINIO_ADMIN = "kelatos.com";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  callbacks: {
    signIn({ profile }) {
      const email = profile?.email || "";
      return email.endsWith(`@${DOMINIO_ADMIN}`);
    },
    session({ session }) {
      if (!session.user?.email?.endsWith(`@${DOMINIO_ADMIN}`)) {
        // No debería ocurrir tras el guard de signIn, pero si ocurriera,
        // no se expone una sesión válida para un email de otro dominio.
        session.user = undefined as unknown as typeof session.user;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
