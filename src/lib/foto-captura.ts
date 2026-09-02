// Compresión de fotos de cámara de móvil antes de mandarlas como base64 en
// un JSON — sin esto, 2-3 fotos sin comprimir (a menudo 3-8 MB cada una)
// superaban de sobra el límite de tamaño de petición y el envío fallaba con
// un error que ni siquiera era JSON. 1600px de lado mayor y calidad 0.72
// deja fotos de sobra legibles para diagnóstico y normalmente por debajo de
// 500 KB cada una. Extraído de formulario/page.tsx (formulario de
// recepción) para reutilizarlo también en formulario-recogida/page.tsx.
export const FOTO_LADO_MAXIMO = 1600;
export const FOTO_CALIDAD_JPEG = 0.72;

const HEIC_RE = /\.(heic|heif)$/i;

export function esHeic(file: File): boolean {
  return file.type === "image/heic" || file.type === "image/heif" || HEIC_RE.test(file.name);
}

// Chrome/Android (y la mayoría de navegadores fuera de Safari) no saben
// decodificar HEIC en <img>/canvas — el formato por defecto de la cámara en
// muchos iPhone y algunos Android. Conversión con carga diferida (import
// dinámico): los formatos normales (jpg/png/webp, la inmensa mayoría) nunca
// descargan esta librería.
export async function resolverBlobImagen(file: File): Promise<Blob> {
  if (!esHeic(file)) return file;
  const heic2any = (await import("heic2any")).default;
  const resultado = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.8 });
  return Array.isArray(resultado) ? resultado[0] : resultado;
}

export function comprimirImagen(file: Blob): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, FOTO_LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight));
      const ancho = Math.max(1, Math.round(img.naturalWidth * escala));
      const alto = Math.max(1, Math.round(img.naturalHeight * escala));
      const canvas = document.createElement("canvas");
      canvas.width = ancho;
      canvas.height = alto;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No se pudo procesar la imagen")); return; }
      ctx.drawImage(img, 0, 0, ancho, alto);
      const dataUrl = canvas.toDataURL("image/jpeg", FOTO_CALIDAD_JPEG);
      const base64 = dataUrl.split(",")[1] || "";
      if (!base64) { reject(new Error("No se pudo procesar la imagen")); return; }
      resolve({ base64, mime: "image/jpeg" });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen")); };
    img.src = url;
  });
}
