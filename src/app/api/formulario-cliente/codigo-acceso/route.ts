import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapearCodigoAcceso } from "@/lib/formulario-acceso";

/** GET — código activo actual, para el panel de administración. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    const data = await kelatosApiGet<{ ok: boolean; activo: Parameters<typeof mapearCodigoAcceso>[0] | null }>(
      "/v1/lecturas/formulario/codigo-acceso"
    );
    return NextResponse.json({ ok: true, activo: data.activo ? mapearCodigoAcceso(data.activo) : null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

/** POST — genera un código nuevo, sustituyendo al activo. */
export async function POST() {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    const data = await kelatosApiPost<{ ok: boolean } & Parameters<typeof mapearCodigoAcceso>[0]>(
      "/v1/formulario/codigo-acceso",
      { usuario }
    );
    return NextResponse.json({ ok: true, codigo: mapearCodigoAcceso(data) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
