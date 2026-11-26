import Link from "next/link";
import { auth } from "@/auth";
import { aterrizaEnFichaje } from "@/lib/superadmin";
import { SolicitudEquipoLocal } from "@/components/acceso-local/solicitud-equipo";

export const metadata = { title: "Acceso restringido" };

/** Página que ve la cuenta del local si intenta usar el dashboard fuera del local (modo «bloquear» de src/lib/acceso-local.ts). */
export default async function AccesoRestringidoPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const session = await auth();
  const motivo = (await searchParams).r;
  if (motivo === "2") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Falta aprobar este equipo</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Estás entrando desde fuera. Se envía una solicitud: un administrador tiene que aprobarla en «Equipos del local». Después, vuelve a comprobar.
          </p>
          <SolicitudEquipoLocal mostrarAviso />
          {/* Enlace normal a propósito: la comprobación la hace el servidor al cargar la página de nuevo (puede tardar medio minuto en enterarse). */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Comprobar de nuevo</a>
        </div>
      </main>
    );
  }
  if (motivo === "1") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Acceso restringido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta cuenta solo puede usar el dashboard desde el equipo de acceso remoto de Kelatos, no desde tu ordenador. Conéctate a ese equipo y entra desde allí.
          </p>
        </div>
      </main>
    );
  }
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
