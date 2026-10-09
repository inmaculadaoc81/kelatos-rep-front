import { auth } from "@/auth";

const BASE_URL = process.env.KELATOS_API_BASE_URL;
const TOKEN = process.env.KELATOS_API_TOKEN;

/** GET — reenvía una foto de cierre de TPV. Reutiliza el mismo endpoint
    genérico del backend que ya sirve fotos/firmas por ID de Drive
    (GET /v1/formulario/archivo/:nombre) — aquí solo se exige sesión,
    igual que en facturas-recibidas/archivo. */
export async function GET(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return new Response("No autenticado", { status: 401 });

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
