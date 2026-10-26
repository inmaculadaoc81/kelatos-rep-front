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

/** Número del equipo de alquiler dentro de su id ("EQ-0036" → 36); null si no tiene la forma EQ-n. */
export function numeroDeEquipo(id: string): number | null {
  const m = /^EQ-0*(\d{1,8})$/i.exec(id.trim());
  return m ? Number(m[1]) : null;
}

/** Código de barras de un equipo de alquiler: solo dígitos ("8" + número con ceros hasta 8 → EQ-0036 = 800000036), como las
    piezas ("7"+...), porque el escáner global solo recoge dígitos. */
export function codigoBarrasEquipo(id: string): string | null {
  const n = numeroDeEquipo(id);
  return n === null || n === 0 ? null : "8" + String(n).padStart(8, "0");
}

const PUENTE_IMPRESORA_PIEZA_URL = "http://127.0.0.1:9876/imprimir-etiqueta-pieza";

/** Etiqueta de una pieza de Stock (p. ej. un cargador) para pegar en el
    objeto físico — código de barras de su referencia, para luego
    escanearla y precargarla en un Ticket/Factura (ver
    escaner-codigo-barras.tsx). Botón manual en Stock de Piezas. */
export async function imprimirEtiquetaPieza(referencia: string, nombre: string): Promise<boolean> {
  if (!referencia) return false;
  try {
    const res = await fetch(PUENTE_IMPRESORA_PIEZA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referencia, nombre }),
    });
    const data = await res.json();
    return !!data.ok;
  } catch {
    return false;
  }
}

/** Etiqueta de un equipo de alquiler para pegar en el portátil: al escanearla (en cualquier pantalla) se abre el equipo para
    alquilarlo si está disponible o devolverlo si está alquilado (ver escaner-codigo-barras.tsx). Usa el mismo endpoint del
    puente que las piezas (cualquier versión del puente lo admite): el código de 9 dígitos va como "referencia" y el
    texto (id + marca y modelo) como "nombre". */
export async function imprimirEtiquetaEquipo(id: string, descripcion: string): Promise<boolean> {
  const codigo = codigoBarrasEquipo(id);
  if (!codigo) return false;
  // La etiqueta tiene una sola línea de 30 caracteres para el nombre: más largo se desbordaría con un "." del puente.
  return imprimirEtiquetaPieza(codigo, `${id} ${descripcion}`.slice(0, 30).trim());
}
