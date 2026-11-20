import { accesoReuniones, reenviar } from "@/lib/n8nlabs-reuniones-api";

/** Prueba de envío a un número concreto (acción explícita; solo superadmin). */
export async function POST(req: Request) {
  const a = await accesoReuniones(true);
  if (!a.ok) return a.respuesta;
  return reenviar("POST", "/probar", await req.json().catch(() => ({})));
}
