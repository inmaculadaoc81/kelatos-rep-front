import { redirect } from "next/navigation";
import { auth, esDominioKelatos } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";

export default async function AsistenciaIndexPage() {
  const session = await auth();
  const email = session?.user?.email || "";
  const esManager = esDominioKelatos(email) && (session?.user?.role === "admin" || esSuperadmin(email));
  redirect(esManager ? "/asistencia/admin/fichajes" : "/asistencia/kiosk");
}
