import Link from "next/link";
import { auth } from "@/auth";
import { aterrizaEnFichaje } from "@/lib/superadmin";
import { SolicitudEquipoLocal } from "@/components/acceso-local/solicitud-equipo";

export const metadata = { title: "Acceso restringido" };

/** Página que ve la cuenta del local si intenta usar el dashboard fuera del local (modo «bloquear» de src/lib/acceso-local.ts). */
export default async function AccesoRestringidoPage() {
  const session = await auth();
  const puedeFichar = aterrizaEnFichaje(session?.user?.email);
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Acceso restringido</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta cuenta solo puede usar el dashboard desde los equipos autorizados del local. Si estás en el local y ves este aviso, avisa a un administrador.
        </p>
        {puedeFichar && (
          <div className="mt-4 space-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="text-muted-foreground">Desde aquí sí puedes fichar y usar tus solicitudes.</p>
            <Link href="/asistencia/kiosk" className="inline-block rounded-md bg-primary px-3 py-1.5 text-primary-foreground">Volver al fichaje</Link>
          </div>
        )}
        <SolicitudEquipoLocal mostrarAviso />
      </div>
    </main>
  );
}
