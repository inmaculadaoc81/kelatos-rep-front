import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";

interface BackupHistorial {
  id: string;
  nombre_archivo: string;
  tamano_bytes: string | null;
  creado_en: string;
  destino: string;
  origen: "programado" | "manual";
  solicitado_por: string | null;
  estado: "ok" | "error";
  error_detalle: string | null;
}

/** Lista el historial de backups (GET /v1/admin/backups) para el panel Admin > Backups. */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!esSuperadmin(email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  try {
    const data = await kelatosApiGet<{ ok: boolean; backups: BackupHistorial[] }>("/v1/admin/backups", { limit: 100 });
    return NextResponse.json({ ok: true, backups: data.backups });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

/**
 * Encola un backup manual (POST /v1/admin/backups/ejecutar) — la API no
 * puede ejecutar pg_dump/rclone por su cuenta (contenedor aislado), así
 * que esto solo inserta una fila en backup_triggers; un cron del VPS la
 * recoge en menos de un minuto y ejecuta el backup real.
 */
export async function POST() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!esSuperadmin(email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  try {
    await kelatosApiPost<{ ok: boolean; encolado: boolean }>("/v1/admin/backups/ejecutar", { usuario: email });
    return NextResponse.json({ ok: true, encolado: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
