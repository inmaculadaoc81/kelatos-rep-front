import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { BotsAdminContenido } from "./bots-admin-contenido";

export default async function BotsAdminPage() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!esSuperadmin(email)) {
    return (
      <div className="flex h-[60vh] items-center justify-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold">No autorizado</p>
          <p className="text-sm text-muted-foreground">Esta sección solo está disponible para cuentas de administrador.</p>
        </div>
      </div>
    );
  }
  return <BotsAdminContenido />;
}
