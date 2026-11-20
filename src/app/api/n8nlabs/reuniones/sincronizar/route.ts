import { accesoReuniones, reenviar } from "@/lib/n8nlabs-reuniones-api";

export async function POST() {
  const a = await accesoReuniones();
  if (!a.ok) return a.respuesta;
  return reenviar("POST", "/sincronizar", {});
}
