import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, esDominioKelatos } from "@/auth";
import { Button } from "@/components/ui/button";

// Fuera de (app)/ a propósito: la usan también quienes solo tienen acceso al fichaje, que no ven el resto del dashboard.
export default async function RrhhLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const u = session?.user;
  if (!u?.email) redirect("/login");
  const soloFichaje = u.asistenciaEmpleadoId != null && !u.accesoCompleto && (u.viaCredentials || !esDominioKelatos(u.email));

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Image src="/logos/kelatos.png" alt="Kelatos" width={145} height={41} priority unoptimized className="h-7 w-auto" />
          <span className="text-sm font-semibold">Recursos Humanos</span>
          <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">{u.email}</span>
          <div className="ml-auto flex gap-2 sm:ml-0">
            {u.asistenciaEmpleadoId != null && <Button variant="outline" size="sm" render={<Link href="/asistencia/kiosk" />}>Fichaje</Button>}
            {!soloFichaje && <Button variant="outline" size="sm" render={<Link href="/" />}>Dashboard</Button>}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>
    </div>
  );
}
