import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

// Registro interno (no se muestra): el kiosco avisa al abrir la ventana de firma de «Salida». Nunca debe estorbar al fichaje.
export async function POST() {
  const session = await auth();
  const empleadoId = session?.user?.asistenciaEmpleadoId;
  if (!empleadoId) return NextResponse.json({ ok: true });
  try {
    await kelatosApiPost(`/v1/asistencia/kiosk/${empleadoId}/salida-iniciada`, {});
  } catch {
    /* sin efecto para el usuario */
  }
  return NextResponse.json({ ok: true });
}
