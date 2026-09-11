import { adminGet, adminPost } from "@/lib/asistencia-proxy";

export async function GET() {
  return adminGet("/v1/asistencia/admin/remote-workers/categorias");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return adminPost("/v1/asistencia/admin/remote-workers/categorias", {
    applicationName: body?.applicationName,
    category: body?.category,
    productive: body?.productive,
  });
}
