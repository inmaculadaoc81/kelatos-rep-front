import { redirect } from "next/navigation";

/** Entra directo al primer agente (como hacía /agentes). */
export default function AgentesEnMailsPage() {
  redirect("/mails/agentes/security_audit");
}
