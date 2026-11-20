import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";

/** Acceso a la administración de usuarios y permisos: SOLO superadmins. Devuelve el correo de quien actúa (queda en el registro de cambios). */
export async function actorSuperadmin(): Promise<{ ok: true; email: string } | { ok: false; respuesta: NextResponse }> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!email) return { ok: false, respuesta: NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 }) };
  if (!esSuperadmin(email)) return { ok: false, respuesta: NextResponse.json({ ok: false, error: "Solo un superadmin puede gestionar usuarios y permisos" }, { status: 403 }) };
  return { ok: true, email };
}

export async function llamar(path: string, metodo: "GET" | "POST" | "PATCH" | "PUT", cuerpo: Record<string, unknown> | null, actor: string): Promise<NextResponse> {
  try {
    const resultado = metodo === "GET"
      ? await kelatosApiGet<Record<string, unknown>>(`/v1/usuarios-permisos${path}`)
      : await kelatosApiPost<Record<string, unknown>>(`/v1/usuarios-permisos${path}`, { ...(cuerpo || {}), actor }, metodo);
    return NextResponse.json(resultado);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
