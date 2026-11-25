/** Por dónde se respondió un presupuesto. Vacío en respuestas anteriores a que se guardara. */
export function textoMedio(medio: string | null | undefined, quien?: string | null): string {
  if (medio === "pagina") return "por la página (botón del correo)";
  if (medio === "email" || medio === "webhook") return "por correo";
  if (medio === "whatsapp") return "por WhatsApp";
  if (medio === "dashboard") return quien ? `marcado en el dashboard por ${quien}` : "marcado en el dashboard";
  if (medio === "automatico") return "automático (se eligió otra opción)";
  return "";
}

export const ETIQUETA_MEDIO: Record<string, string> = { pagina: "Por la página", email: "Por correo", webhook: "Por correo", whatsapp: "Por WhatsApp", dashboard: "En el dashboard" };
