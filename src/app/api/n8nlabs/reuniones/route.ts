import { accesoReuniones, reenviar } from "@/lib/n8nlabs-reuniones-api";

/** GET /api/n8nlabs/reuniones — reuniones de Cal.com (últimos 30 días y próximos 180) con el estado de sus recordatorios. */
export async function GET() {
  const a = await accesoReuniones();
  if (!a.ok) return a.respuesta;
  return reenviar("GET", "/");
}
