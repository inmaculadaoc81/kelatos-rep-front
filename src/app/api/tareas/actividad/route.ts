import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

export interface ActividadTarea {
  tipo: "nota" | "finalizada";
  momento: string;
  detalle: string | null;
  creadoPor: string | null;
  tareaId: number;
  titulo: string;
}

interface FilaActividad {
  tipo: "nota" | "finalizada";
  momento: string;
  detalle: string | null;
  creado_por: string | null;
  tarea_id: number | string;
  titulo: string;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  try {
    const limit = new URL(req.url).searchParams.get("limit") || "20";
    const data = await kelatosApiGet<{ ok: boolean; actividad: FilaActividad[] }>("/v1/tareas/actividad", { limit });
    const actividad: ActividadTarea[] = data.actividad.map((a) => ({
      tipo: a.tipo, momento: a.momento, detalle: a.detalle, creadoPor: a.creado_por, tareaId: Number(a.tarea_id), titulo: a.titulo,
    }));
    return NextResponse.json({ ok: true, actividad });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
