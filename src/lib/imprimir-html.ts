"use client";

/**
 * Imprime un documento HTML completo SIN abrir ventanas emergentes (2026-11-17): el botón «Imprimir resguardo» abría una pestaña con window.open()
 * y el navegador la bloqueaba («El navegador bloqueó la ventana de impresión»), o no llegaba a lanzar print() porque el onload no se disparaba.
 * Con un iframe oculto no hay bloqueador de ventanas y se espera a que carguen las imágenes (logo, QR) antes de imprimir.
 */
export async function imprimirHtml(html: string): Promise<void> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const ventana = iframe.contentWindow;
  if (!doc || !ventana) { iframe.remove(); throw new Error("No se pudo preparar la impresión"); }
  doc.open();
  doc.write(html);
  doc.close();
  const imagenes = Array.from(doc.images);
  await Promise.race([
    Promise.all(imagenes.map((img) => (img.complete ? Promise.resolve() : new Promise<void>((r) => { img.onload = () => r(); img.onerror = () => r(); })))),
    new Promise<void>((r) => setTimeout(r, 4000)),
  ]);
  ventana.focus();
  ventana.print();
  setTimeout(() => iframe.remove(), 120_000);
}
