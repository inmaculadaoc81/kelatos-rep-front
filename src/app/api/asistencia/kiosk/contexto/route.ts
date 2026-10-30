import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

// Contexto interno de cada acción de fichaje (dispositivo, ubicación con permiso del navegador, IP real del cliente).
// La IP sale de las cabeceras del proxy: la que guardaba antes el backend era la de este servidor. Nunca debe estorbar al fichaje.
export async function POST(req: Request) {
  const session = await auth();
  const empleadoId = session?.user?.asistenciaEmpleadoId;
  if (!empleadoId) return NextResponse.json({ ok: true });
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || null;
    await kelatosApiPost(`/v1/asistencia/kiosk/${empleadoId}/contexto`, { ...body, ip });
  } catch {
    /* sin efecto para el usuario */
  }
  return NextResponse.json({ ok: true });
}
