import { redirect } from "next/navigation";

// El tablero por columnas se retiró (con cientos de leads no era manejable): «Leads» (bandeja) y «Tabla» lo sustituyen.
// Se deja este redirect para que no den error los accesos directos o enlaces guardados.
export default function TableroRetirado() {
  redirect("/crm");
}
