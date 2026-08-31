import { NextResponse } from "next/server";
import { auth, esDominioKelatos } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";

function esManager(email: string | null | undefined, role: string | undefined) {
  return !!email && esDominioKelatos(email) && (role === "admin" || esSuperadmin(email));
}

export async function GET() {
  const session = await auth();
  if (!esManager(session?.user?.email, session?.user?.role)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }
  try {
    return NextResponse.json(await kelatosApiGet("/v1/asistencia/admin/calendarios"));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!esManager(session?.user?.email, session?.user?.role)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }
  const body = await req.json();
  try {
    return NextResponse.json(await kelatosApiPost("/v1/asistencia/admin/calendarios", body, "POST"));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
