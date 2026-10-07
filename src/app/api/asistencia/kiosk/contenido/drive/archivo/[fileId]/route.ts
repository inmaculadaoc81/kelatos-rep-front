import { auth } from "@/auth";
import { puedeVerContenido } from "@/lib/contenido-acceso";

const BASE_URL = process.env.KELATOS_API_BASE_URL;
const TOKEN = process.env.KELATOS_API_TOKEN;

/**
 * GET — reenvía el contenido de un archivo del material de Contenido
 * (imagen/vídeo/sonido en Drive). Reutiliza el mismo endpoint genérico
 * del backend que ya sirve fotos/firmas por ID (GET /v1/formulario/
 * archivo/:nombre) — no se duplica esa ruta, solo cambia quién puede
 * pedirla: aquí se exige puedeVerContenido(), no cualquier sesión admin.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const session = await auth();
  if (!puedeVerContenido(session)) return new Response("No autorizado", { status: 403 });

  const { fileId } = await params;
  const res = await fetch(`${BASE_URL}/v1/formulario/archivo/${encodeURIComponent(fileId)}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return new Response("No encontrado", { status: 404 });

  const buffer = await res.arrayBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": res.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
