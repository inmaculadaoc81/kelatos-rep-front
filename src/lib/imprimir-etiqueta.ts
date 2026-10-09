"use client";

/**
 * Avisa al puente local de impresión de etiquetas (KelatosImpresoraBridge,
 * un servicio en localhost:9876 que corre en el PC donde esté conectada la
 * TSC TE200 — ver C:\KelatosImpresoraBridge\INSTALAR.md) para que imprima
 * la etiqueta del resguardo recién confirmado/creado.
 *
 * Fire-and-forget a propósito: si el servicio no está corriendo en este
 * PC (cualquier PC sin impresora conectada), la llamada simplemente falla
 * en silencio — nunca bloquea el alta/confirmación ni muestra un error al
 * empleado por esto.
 */
const PUENTE_IMPRESORA_URL = "http://127.0.0.1:9876/imprimir-etiqueta";

export function imprimirEtiquetaResguardo(resguardo: string) {
  if (!resguardo) return;
  fetch(PUENTE_IMPRESORA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resguardo }),
  }).catch(() => {});
}
