import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { esSuperadmin } from "@/lib/superadmin";
import type { ProximosEnvios } from "@/lib/resenas";

/** Próximos envíos de reseña — solo administradores (repetido aquí y en src/proxy.ts). */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!email || (session?.user?.role !== "admin" && !esSuperadmin(email))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }
  try {
    const data = await kelatosApiGet<ProximosEnvios>("/v1/resenas-programadas", {});
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
