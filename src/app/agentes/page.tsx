import { redirect } from "next/navigation";

/** /agentes entra directo a «Prospección de clientes» (2026-11-02; antes entraba en Auditoría de seguridad, que sigue en /agentes/security_audit). */
export default function AgentesIndexPage() {
  redirect("/agentes/security_audit");
}
