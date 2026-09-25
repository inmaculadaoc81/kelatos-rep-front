import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { esSuperadmin } from "@/lib/superadmin";

function hashCanonico(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/** Campos de la ficha del equipo que se pueden editar (el estado tiene su propia ruta). */
const CAMPOS_TEXTO = ["marca", "modelo", "serie", "sistemaOperativo", "caracteristicas", "defectos", "observaciones", "enlaceRepuesto", "imagenUrl"] as const;
const CAMPOS_NUMERO = ["fianza", "precioDia", "precioSemana", "precioMes"] as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const entrada = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const datos: Record<string, string | number> = {};
  for (const c of CAMPOS_TEXTO) if (typeof entrada[c] === "string") datos[c] = entrada[c] as string;
  for (const c of CAMPOS_NUMERO) if (entrada[c] !== undefined) datos[c] = Number(entrada[c]);
  if ("marca" in datos && !String(datos.marca).trim()) return NextResponse.json({ ok: false, error: "La marca es obligatoria" }, { status: 400 });
  if ("modelo" in datos && !String(datos.modelo).trim()) return NextResponse.json({ ok: false, error: "El modelo es obligatorio" }, { status: 400 });
  if (!Object.keys(datos).length) return NextResponse.json({ ok: false, error: "No hay nada que guardar" }, { status: 400 });
  const esAdmin = session?.user?.role === "admin" || esSuperadmin(usuario);
  if (!esAdmin && CAMPOS_NUMERO.some((c) => c in datos)) {
    return NextResponse.json({ ok: false, error: "Solo un administrador puede cambiar las tarifas y la fianza" }, { status: 403 });
  }

  const requestId = crypto.randomUUID();
  const payloadHash = hashCanonico({ requestId, id, datos });
  try {
    const r = await kelatosApiPost<{ ok: boolean; sinCambios?: boolean; campos?: string[]; equipo: Record<string, unknown> }>(`/v1/equipos/${encodeURIComponent(id)}/editar`, {
      requestId,
      usuario,
      payloadHash,
      ...datos,
    });
    return NextResponse.json({ ok: true, sinCambios: r.sinCambios === true, campos: r.campos ?? [], equipo: r.equipo });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
