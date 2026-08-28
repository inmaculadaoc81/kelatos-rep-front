import Link from "next/link";
import { auth, esDominioKelatos } from "@/auth";
import { redirect } from "next/navigation";
import { esSuperadmin } from "@/lib/superadmin";

// proxy.ts ya filtra el acceso — esta comprobación se repite aquí como
// defensa en profundidad (mismo patrón que Transferencias). Entra
// cualquiera con sesión válida que sea del dominio @kelatos.com, admin,
// o esté dado de alta como empleado que ficha (asistenciaEmpleadoId).
export default async function AsistenciaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const email = session?.user?.email || "";
  const esDelDominio = esDominioKelatos(email);
  const permitido = !!email && (esDelDominio || esSuperadmin(email) || session?.user?.asistenciaEmpleadoId != null);
  if (!permitido) redirect("/login");

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="flex items-center justify-between border-b bg-card px-4 py-3">
        <span className="text-sm font-semibold">Kelatos · Asistencia</span>
        {esDelDominio && (
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
            Volver a Reparaciones
          </Link>
        )}
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
}
