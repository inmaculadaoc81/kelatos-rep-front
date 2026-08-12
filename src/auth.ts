import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { RolUsuario } from "@/types/next-auth";

/**
 * Restricción de dominio equivalente a la de doGet() en Apps Script
 * (Code.js): `emailSesion.endsWith('@' + DOMINIO_ADMIN)`. Aquí se aplica
 * en signIn (bloquea el inicio de sesión) y otra vez en el callback de
 * sesión (por si un token viejo de otro dominio quedara en la cookie).
 *
 * El original no tenía roles (verificarPermisos() solo comprobaba el
 * dominio, sin distinguir usuarios) — esto es una capa nueva: dos roles,
 * Administrador y Usuario, determinados por email. La cuenta de
 * kelatoscielo@gmail.com es la única fuera del dominio @kelatos.com y es
 * quien ejerce de Administrador.
 */
const DOMINIO_ADMIN = "kelatos.com";
const EMAILS_ADMIN = new Set(["kelatoscielo@gmail.com"]);

function emailPermitido(email: string): boolean {
  const e = email.toLowerCase();
  return e.endsWith(`@${DOMINIO_ADMIN}`) || EMAILS_ADMIN.has(e);
}

function rolPara(email: string): RolUsuario {
  return EMAILS_ADMIN.has(email.toLowerCase()) ? "admin" : "usuario";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    signIn({ profile }) {
      const email = profile?.email || "";
      return emailPermitido(email);
    },
    jwt({ token }) {
      if (token.email) token.role = rolPara(token.email);
      return token;
    },
    session({ session, token }) {
      if (!session.user?.email || !emailPermitido(session.user.email)) {
        // No debería ocurrir tras el guard de signIn, pero si ocurriera,
        // no se expone una sesión válida para un email no permitido.
        session.user = undefined as unknown as typeof session.user;
        return session;
      }
      session.user.role = token.role || rolPara(session.user.email);
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
