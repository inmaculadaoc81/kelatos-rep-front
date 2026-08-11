import { auth } from "@/auth";

const BASE_URL = process.env.KELATOS_API_BASE_URL;
const TOKEN = process.env.KELATOS_API_TOKEN;

/**
 * GET — reenvía el contenido de una foto/firma del formulario. El backend
 * exige el token compartido de la API; aquí es donde se comprueba que
 * quien la pide es un admin con sesión — así las fotos de clientes nunca
 * quedan accesibles por URL directa sin login (a diferencia del "cualquiera
 * con el enlace" que usaba Drive en el original).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ nombre: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return new Response("No autenticado", { status: 401 });

  const { nombre } = await params;
  const res = await fetch(`${BASE_URL}/v1/formulario/archivo/${encodeURIComponent(nombre)}`, {
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
