"use client";

/**
 * Avisa al puente local de impresión de etiquetas (KelatosImpresoraBridge,
 * un servicio en localhost:9876 que corre en el PC donde esté conectada la
 * TSC TE200 — ver C:\KelatosImpresoraBridge\INSTALAR.md) para que imprima
 * la etiqueta del resguardo recién confirmado/creado, o a petición manual
 * desde el detalle de la reparación.
 */
const PUENTE_IMPRESORA_URL = "http://127.0.0.1:9876/imprimir-etiqueta";

async function enviarAImprimir(resguardo: string): Promise<boolean> {
  const res = await fetch(PUENTE_IMPRESORA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resguardo }),
  });
  const data = await res.json();
  if (!data.ok) return false;
  // Solo se marca "impresa" en el sistema si el puente confirmó que mandó
  // los bytes de verdad — nunca al disparar la llamada.
  await fetch(`/api/reparaciones/${resguardo}/etiqueta-impresa`, { method: "POST" }).catch(() => {});
  return true;
}

/** Fire-and-forget a propósito: si el puente no está corriendo en este PC
    (cualquier PC sin impresora conectada), falla en silencio — nunca
    bloquea el alta/confirmación ni muestra un error al empleado por esto. */
export function imprimirEtiquetaResguardo(resguardo: string, alImprimir?: () => void) {
  if (!resguardo) return;
  enviarAImprimir(resguardo)
    .then((ok) => { if (ok) alImprimir?.(); })
    .catch(() => {});
}

/** Versión para el botón manual "Imprimir etiqueta": sí informa de si
    funcionó o no, a diferencia de la automática. */
export async function imprimirEtiquetaResguardoConFeedback(resguardo: string): Promise<boolean> {
  if (!resguardo) return false;
  try {
    return await enviarAImprimir(resguardo);
  } catch {
    return false;
  }
}
