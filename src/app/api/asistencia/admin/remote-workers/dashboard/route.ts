import { auth } from "@/auth";
import { adminGet } from "@/lib/asistencia-proxy";

// Necesita el email de la sesión para el registro de accesos al módulo
// (registrarAccesoRemoteWorkers en el backend) — adminGet ya vuelve a
// comprobar el rol internamente, duplicar esa comprobación aquí es
// aceptable (mismo patrón que ya usa adminPost).
export async function GET() {
  const session = await auth();
  const usuario = session?.user?.email || "desconocido";
  return adminGet("/v1/asistencia/admin/remote-workers/dashboard", { usuario });
}
