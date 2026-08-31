import { NextResponse } from "next/server";
import { auth, esDominioKelatos } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  const esManager = !!email && esDominioKelatos(email) && (session?.user?.role === "admin" || esSuperadmin(email));
  if (!esManager) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  try {
    const data = await kelatosApiGet("/v1/asistencia/empleados");
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

// Alta de empleados (quién puede fichar) — restringido a superadmin, no a
// cualquier manager: es un cambio de acceso real, no una tarea admin
// normal de aprobar/rechazar solicitudes.
export async function POST(req: Request) {
  const session = await auth();
  if (!esSuperadmin(session?.user?.email)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }
  const body = await req.json();
  try {
    const data = await kelatosApiPost("/v1/asistencia/admin/empleados", body, "POST");
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
