import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { esSuperadmin } from "@/lib/superadmin";

interface RespuestaPreview {
  ok: boolean;
  tieneFacturaReal: boolean;
  resumen: { tabla: string; cantidad: number }[];
}

/** Solo lectura: cuenta las filas dependientes que se borrarían junto con esta reparación, para mostrarlas antes de confirmar. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ resguardo: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!esSuperadmin(email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const { resguardo } = await params;
  try {
    const data = await kelatosApiGet<RespuestaPreview>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/eliminar-preview`,
      { usuario: email || "" }
    );
    return NextResponse.json({ ok: true, tieneFacturaReal: data.tieneFacturaReal, resumen: data.resumen });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
