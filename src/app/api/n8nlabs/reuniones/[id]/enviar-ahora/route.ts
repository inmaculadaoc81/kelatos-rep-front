import { accesoReuniones, reenviar } from "@/lib/n8nlabs-reuniones-api";

/** Envía ahora el recordatorio de WhatsApp de una reunión (acción explícita; solo superadmin). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await accesoReuniones(true);
  if (!a.ok) return a.respuesta;
  const { id } = await params;
  return reenviar("POST", `/${encodeURIComponent(id)}/enviar-ahora`, {});
}
