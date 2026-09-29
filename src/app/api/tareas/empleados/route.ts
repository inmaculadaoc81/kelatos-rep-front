import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

/** Empleado para el selector "Asignar a" de Tareas — a propósito NO reutiliza
    /api/empleados (ese es el catálogo de TÉCNICOS de Reparaciones,
    kelatos_app.empleados). Tareas necesita el directorio completo de la
    empresa, incluidos los que trabajan en remoto (Carlo/Cielo/Gean, etc.),
    que solo existen en asistencia.empleados — petición del usuario,
    2026-09-29: "aquí tienes que añadir todos los empleados, solo remotos"
    (los remotos eran justo los que faltaban). */
export interface EmpleadoTareas {
  id: number;
  nombre: string;
  email: string;
  trabajaRemoto: boolean;
}

interface FilaEmpleadoAsistencia {
  id: number;
  nombre: string;
  email: string | null;
  activo: boolean;
  trabaja_remoto: boolean;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  try {
    const data = await kelatosApiGet<{ ok: boolean; empleados: FilaEmpleadoAsistencia[] }>("/v1/asistencia/empleados");
    const empleados: EmpleadoTareas[] = data.empleados
      .filter((e) => e.activo)
      .map((e) => ({ id: e.id, nombre: e.nombre, email: e.email || "", trabajaRemoto: e.trabaja_remoto === true }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    return NextResponse.json({ ok: true, empleados });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
