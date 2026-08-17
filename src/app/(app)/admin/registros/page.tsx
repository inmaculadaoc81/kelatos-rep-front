import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { RegistrosAdminContenido } from "./registros-admin-contenido";

export default async function EliminarRegistrosPage() {
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
  return <RegistrosAdminContenido />;
}
