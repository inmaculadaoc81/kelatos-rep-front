import { accesoReuniones, reenviar } from "@/lib/n8nlabs-reuniones-api";

export async function GET() {
  const a = await accesoReuniones(true);
  if (!a.ok) return a.respuesta;
  return reenviar("GET", "/config", undefined, ["tokenWebhook"]);
}

export async function PUT(req: Request) {
  const a = await accesoReuniones(true);
  if (!a.ok) return a.respuesta;
  return reenviar("PUT", "/config", await req.json().catch(() => ({})));
}
