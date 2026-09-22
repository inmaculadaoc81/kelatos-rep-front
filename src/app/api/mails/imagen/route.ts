import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { accesoMails } from "@/lib/mails-auth";
import { tokenImagenMailValido } from "@/lib/mails-image-token";

// SVG queda fuera a propósito (puede llevar <script>); todo lo demás que
// admite el backend (proxyImagen) se sirve tal cual.
const TIPOS_IMAGEN = /^image\/(png|jpe?g|gif|webp|bmp|avif)$/i;

/** Descarga (a través del backend) una imagen remota referenciada en el
    cuerpo de un correo, para que el navegador nunca la pida directamente al
    remitente — ver componentes-correo.tsx (reescribirImagenesRemotas).
    Esta petición sale de un iframe con srcDoc (origen opaco): la cookie de
    sesión no llega (SameSite la bloquea), así que además de la sesión
    normal se acepta un token de corta duración — ver mails-image-token.ts. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") || "";
  const tok = searchParams.get("tok") || "";
  const a = await accesoMails();
  if (!a.ok && !tokenImagenMailValido(tok)) return a.respuesta;
  if (!url) return NextResponse.json({ ok: false, error: "Falta la URL" }, { status: 400 });
  try {
    const data = await kelatosApiGet<{ ok: boolean; imagen: { tipo: string; base64: string } }>("/v1/mails/imagen", { url });
    const cuerpo = Buffer.from(data.imagen.base64, "base64");
    const tipo = TIPOS_IMAGEN.test(data.imagen.tipo) ? data.imagen.tipo : "application/octet-stream";
    return new NextResponse(cuerpo, {
      headers: {
        "Content-Type": tipo,
        "Content-Length": String(cuerpo.length),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
