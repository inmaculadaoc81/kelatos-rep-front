import { redirect } from "next/navigation";
import { auth, esDominioKelatos } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";

// proxy.ts ya filtra el acceso — esta comprobación se repite aquí como
// defensa en profundidad (mismo patrón que Transferencias). Entra
// cualquiera con sesión válida que sea del dominio @kelatos.com, admin,
// o esté dado de alta como empleado que ficha (asistenciaEmpleadoId).
//
// Este layout raíz SOLO hace de guardia de acceso — sin sidebar/header
// propios. El kiosco (/asistencia/kiosk/*) y el panel admin
// (/asistencia/admin/*) tienen cada uno su propia presentación: el
// kiosco es la vista de cara al empleado que ficha (sin el dashboard
// completo alrededor, solo login → fichaje), el admin sí reutiliza el
// Sidebar de la aplicación — petición del usuario, 2026-08-31.
export default async function AsistenciaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const email = session?.user?.email || "";
  const permitido = !!email && (esDominioKelatos(email) || esSuperadmin(email) || session?.user?.asistenciaEmpleadoId != null);
  if (!permitido) redirect("/login");

  return <>{children}</>;
}
