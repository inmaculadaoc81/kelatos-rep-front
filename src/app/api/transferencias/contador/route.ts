import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiGet } from "@/lib/kelatos-api";

export async function GET() {
  const session = await auth();
  if (!esSuperadmin(session?.user?.email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  try {
    const data = await kelatosApiGet<{ ok: boolean; pendientes: number; conciliadas: number }>("/v1/lecturas/transferencias/contador");
    return NextResponse.json({ ok: true, pendientes: data.pendientes, conciliadas: data.conciliadas });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
