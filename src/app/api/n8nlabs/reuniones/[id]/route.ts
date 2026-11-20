import { accesoReuniones, reenviar } from "@/lib/n8nlabs-reuniones-api";

/** PATCH: corregir el teléfono o activar/desactivar los recordatorios de una reunión. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await accesoReuniones();
  if (!a.ok) return a.respuesta;
  const { id } = await params;
  return reenviar("PATCH", `/${encodeURIComponent(id)}`, await req.json().catch(() => ({})));
}
