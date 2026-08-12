import type { DefaultSession } from "next-auth";

export type RolUsuario = "admin" | "usuario";

declare module "next-auth" {
  interface Session {
    user: {
      role: RolUsuario;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: RolUsuario;
  }
}
