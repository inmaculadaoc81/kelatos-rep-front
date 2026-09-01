/**
 * "Su Referencia" — campo opcional de texto libre (PO/referencia propia
 * del cliente) que se puede escribir al generar cualquier factura o
 * ticket. Nunca viaja al PDF; solo alimenta la columna "Su Ref." de
 * Facturas de Clientes (kelatos_app.documentos_su_referencia, migración
 * 069). Se guarda en una llamada aparte DESPUÉS de que el documento ya
 * tenga numero_factura/numero_ticket asignado — nunca bloquea ni puede
 * hacer fallar la generación del documento en sí, por eso el error se
 * traga aquí (best-effort) en vez de propagarse al flujo de generación.
 */
export async function guardarSuReferencia(numero: string, suReferencia: string): Promise<void> {
  if (!numero || !suReferencia.trim()) return;
  try {
    await fetch("/api/documentos/su-referencia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero, suReferencia: suReferencia.trim() }),
    });
  } catch {
    // best-effort — un fallo aquí no debe deshacer ni bloquear la factura/ticket ya generado
  }
}
