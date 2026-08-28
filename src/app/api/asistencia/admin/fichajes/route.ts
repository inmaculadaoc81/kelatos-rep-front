import { NextResponse } from "next/server";
import { auth, esDominioKelatos } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiGet } from "@/lib/kelatos-api";

function esManager(email: string | null | undefined, role: string | undefined) {
  return !!email && esDominioKelatos(email) && (role === "admin" || esSuperadmin(email));
}

export async function GET(req: Request) {
  const session = await auth();
  if (!esManager(session?.user?.email, session?.user?.role)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId") || undefined;
  const desde = searchParams.get("desde") || undefined;
  const hasta = searchParams.get("hasta") || undefined;

  try {
    const data = await kelatosApiGet("/v1/asistencia/admin/fichajes", { employeeId, desde, hasta });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
