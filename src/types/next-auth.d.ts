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
          no con Google — por defecto esta vía nunca da acceso al dashboard
          completo, solo al kiosco (ver proxy.ts), salvo que la cuenta
          tenga accesoCompleto. */
      viaCredentials: boolean;
      /** asistencia.empleados.acceso_completo — cuenta de Credentials con
          las mismas dos puertas (Google o contraseña) a la MISMA cuenta,
          no solo al kiosco (petición del usuario, 2026-09-30: soporte@
          kelatos.com necesitaba entrar también por contraseña sin perder
          el acceso completo que ya tiene por Google). Ver proxy.ts. */
      accesoCompleto: boolean;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: RolUsuario;
    asistenciaEmpleadoId?: number | null;
    /** Cuándo (ms epoch) se consultó por última vez asistencia.empleados —
        ver src/auth.ts. */
    asistenciaComprobadaEn?: number;
    viaCredentials?: boolean;
    /** Capturado en jwt() solo al iniciar sesión por Credentials — ver
        Session.user.accesoCompleto arriba. */
    accesoCompleto?: boolean;
  }
}
