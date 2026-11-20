import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { puedeVerCrm } from "@/lib/crm";
import { esSuperadmin } from "@/lib/superadmin";
import { tienePermiso } from "@/lib/permisos";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";

/** Acceso a las reuniones de N8N Labs: quien ve N8N Labs. `soloSuperadmin` para configuración y envíos reales. */
export async function accesoReuniones(soloSuperadmin = false): Promise<{ ok: true; email: string } | { ok: false; respuesta: NextResponse }> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!email) return { ok: false, respuesta: NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 }) };
  const puede = soloSuperadmin ? esSuperadmin(email) : await tienePermiso(email, "n8nlabs.ver", puedeVerCrm(session?.user));
  if (!puede) return { ok: false, respuesta: NextResponse.json({ ok: false, error: soloSuperadmin ? "Solo un superadmin puede hacer esto" : "Sin acceso a N8N Labs" }, { status: 403 }) };
  return { ok: true, email };
}

export async function reenviar(metodo: "GET" | "POST" | "PATCH" | "PUT", path: string, cuerpo?: unknown, quitar: string[] = []): Promise<NextResponse> {
  try {
    const r = metodo === "GET" ? await kelatosApiGet<Record<string, unknown>>(`/v1/n8nlabs/reuniones${path}`) : await kelatosApiPost<Record<string, unknown>>(`/v1/n8nlabs/reuniones${path}`, cuerpo ?? {}, metodo);
    for (const k of quitar) delete r[k];
    return NextResponse.json(r);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
