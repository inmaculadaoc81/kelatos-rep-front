import type { DefaultSession } from "next-auth";

export type RolUsuario = "admin" | "usuario";

declare module "next-auth" {
  interface Session {
    user: {
      role: RolUsuario;
      /** Id del empleado en asistencia.empleados si esta cuenta ficha —
          null si no está registrada ahí (ver src/auth.ts). */
      asistenciaEmpleadoId: number | null;
      /** true si esta sesión entró con email+contraseña (Credentials),
          no con Google — aunque el email tenga forma @kelatos.com, esta
          vía nunca da acceso al dashboard completo, solo al kiosco (ver
          proxy.ts). */
      viaCredentials: boolean;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: RolUsuario;
    asistenciaEmpleadoId?: number | null;
    viaCredentials?: boolean;
  }
}
