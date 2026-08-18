import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";

interface RestauracionHistorial {
  id: string;
  nombre_archivo: string;
  iniciado_en: string;
  finalizado_en: string | null;
  solicitado_por: string;
  backup_seguridad_previo: string | null;
  estado: "en_progreso" | "ok" | "error";
  error_detalle: string | null;
}

/** Historial de restauraciones (GET /v1/admin/restore) para el panel. */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!esSuperadmin(email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  try {
    const data = await kelatosApiGet<{ ok: boolean; restauraciones: RestauracionHistorial[] }>("/v1/admin/restore", { limit: 20 });
    return NextResponse.json({ ok: true, restauraciones: data.restauraciones });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

/**
 * Encola una restauración real (POST /v1/admin/restore/ejecutar). La API
 * no puede ejecutarla directamente (contenedor aislado) — un cron del VPS
 * la recoge y, antes de tocar la base de datos real, hace un backup de
 * seguridad y verifica la restauración en una copia aislada. La clave de
 * confirmación viaja al backend, que es quien realmente la valida contra
 * RESTORE_PASSPHRASE (variable de entorno, nunca en el código).
 */
export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!esSuperadmin(email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = (await req.json()) as { nombreArchivo?: string; clave?: string };
  const nombreArchivo = body.nombreArchivo?.trim() || "";
  const clave = body.clave || "";
  if (!nombreArchivo) return NextResponse.json({ ok: false, error: "Falta el archivo a restaurar" }, { status: 400 });
  if (!clave) return NextResponse.json({ ok: false, error: "Falta la clave de confirmación" }, { status: 400 });

  try {
    await kelatosApiPost<{ ok: boolean; encolado: boolean }>("/v1/admin/restore/ejecutar", { usuario: email, nombreArchivo, clave });
    return NextResponse.json({ ok: true, encolado: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
