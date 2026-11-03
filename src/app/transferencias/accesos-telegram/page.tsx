import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { puedeGestionarAccesosTelegram } from "@/lib/superadmin";
import { AccesosTelegramVista } from "./accesos-telegram-vista";

// Solo kelatosclaude2: cualquier otra cuenta vuelve a Transferencias aunque conozca la dirección.
export default async function AccesosTelegramPage() {
  const session = await auth();
  if (!puedeGestionarAccesosTelegram(session?.user?.email)) redirect("/transferencias");
  return <AccesosTelegramVista />;
}
