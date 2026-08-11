import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

export interface Empleado {
  empleadoId: string;
  nombre: string;
  email: string;
  rol: string;
  esTecnico: boolean;
  activo: boolean;
}

interface FilaEmpleadoSql {
  empleado_id: string;
  nombre: string;
  email: string | null;
  rol: string | null;
  es_tecnico: boolean | null;
  activo: boolean | null;
}

/** GET — lista de empleados, para el desplegable "Responsable" del presupuesto inmediato ("Aceptar ahora"). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    const data = await kelatosApiGet<{ ok: boolean; rows: FilaEmpleadoSql[] }>("/v1/empleados", { activo: true, limit: 200 });
    const empleados: Empleado[] = data.rows.map((row) => ({
      empleadoId: row.empleado_id,
      nombre: row.nombre,
      email: row.email || "",
      rol: row.rol || "",
      esTecnico: row.es_tecnico === true,
      activo: row.activo !== false,
    }));
    return NextResponse.json({ ok: true, empleados });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
