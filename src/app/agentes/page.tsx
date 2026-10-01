import { redirect } from "next/navigation";

/** Este módulo quedó dedicado solo al agente de Auditoría de seguridad
    (petición del usuario, 2026-10-01) — con un único tipo de agente ya no
    tiene sentido la landing de "una card por tipo" que había antes, así
    que /agentes entra directo a su panel. */
export default function AgentesIndexPage() {
  redirect("/agentes/security_audit");
}
