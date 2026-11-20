import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { esSuperadmin } from "@/lib/superadmin";
import { tienePermiso } from "@/lib/permisos";

/** Pregunta en lenguaje natural sobre las llamadas — solo superadmins. */
export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!(await tienePermiso(email, "llamadas.ver", esSuperadmin(email)))) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { pregunta?: string };
  try {
    return NextResponse.json(await kelatosApiPost("/v1/llamadas/preguntar", { pregunta: String(b.pregunta || "").slice(0, 400) }));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
