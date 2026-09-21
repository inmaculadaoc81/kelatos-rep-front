import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { accesoMails } from "@/lib/mails-auth";

// Tipos que se sirven tal cual; cualquier otro (html, svg, xml, js…) sale como binario
// genérico y siempre como descarga, para que un adjunto nunca se ejecute en nuestro dominio.
const TIPOS_SEGUROS = /^(application\/(pdf|zip|json|msword|vnd\.[\w.+-]+|x-zip-compressed|octet-stream)|image\/(png|jpe?g|gif|webp|bmp)|text\/(plain|csv)|audio\/[\w.+-]+|video\/[\w.+-]+)$/i;

/** Descarga un adjunto guardado de un correo. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await accesoMails();
  if (!a.ok) return a.respuesta;
  try {
    const { id } = await params;
    const data = await kelatosApiGet<{ ok: boolean; adjunto: { nombre: string; tipo: string | null; base64: string } }>(`/v1/mails/adjuntos/${encodeURIComponent(id)}`);
    const cuerpo = Buffer.from(data.adjunto.base64, "base64");
    const tipo = data.adjunto.tipo && TIPOS_SEGUROS.test(data.adjunto.tipo) ? data.adjunto.tipo : "application/octet-stream";
    const nombre = (data.adjunto.nombre || "adjunto").replace(/[\r\n"]/g, "_");
    const nombreAscii = nombre.replace(/[^\x20-\x7e]/g, "_");
    return new NextResponse(cuerpo, {
      headers: {
        "Content-Type": tipo,
        "Content-Length": String(cuerpo.length),
        "Content-Disposition": `attachment; filename="${nombreAscii}"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 404 });
  }
}
