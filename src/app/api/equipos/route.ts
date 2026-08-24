import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { Equipo, DatosNuevoEquipo, TARIFAS_EQUIPO } from "@/lib/equipos";

function hashCanonico(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function GET() {
  try {
    const data = await kelatosApiGet<{ ok: boolean; equipos: Equipo[] }>("/v1/equipos");
    return NextResponse.json({ ok: true, equipos: data.equipos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const datos = (await req.json()) as DatosNuevoEquipo;
  if (!datos.marca?.trim()) return NextResponse.json({ ok: false, error: "La marca es obligatoria" }, { status: 400 });
  if (!datos.modelo?.trim()) return NextResponse.json({ ok: false, error: "El modelo es obligatorio" }, { status: 400 });
  if (!datos.sistemaOperativo?.trim()) return NextResponse.json({ ok: false, error: "El sistema operativo es obligatorio" }, { status: 400 });
  if (!datos.caracteristicas?.trim()) return NextResponse.json({ ok: false, error: "Las características son obligatorias" }, { status: 400 });
  if (!datos.imagenUrl?.trim()) return NextResponse.json({ ok: false, error: "La imagen URL es obligatoria para el catálogo web" }, { status: 400 });
  if (!/^https?:\/\/.+/.test(datos.imagenUrl.trim())) {
    return NextResponse.json({ ok: false, error: "La Imagen URL debe ser una URL válida (debe empezar por https://)" }, { status: 400 });
  }
  if (!TARIFAS_EQUIPO[datos.tipo]) return NextResponse.json({ ok: false, error: "Tipo inválido" }, { status: 400 });

  const requestId = crypto.randomUUID();
  const payloadHash = hashCanonico({ requestId, datos });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; equipo: Record<string, unknown> }>("/v1/equipos/crear", {
      requestId,
      usuario,
      payloadHash,
      tipo: datos.tipo,
      marca: datos.marca.trim(),
      modelo: datos.modelo.trim(),
      serie: datos.serie.trim(),
      sistemaOperativo: datos.sistemaOperativo.trim(),
      caracteristicas: datos.caracteristicas.trim(),
      defectos: datos.defectos.trim(),
      observaciones: datos.observaciones.trim(),
      enlaceRepuesto: datos.enlaceRepuesto.trim(),
      imagenUrl: datos.imagenUrl.trim(),
      origenResguardo: datos.origenResguardo?.trim() || undefined,
    });

    return NextResponse.json({ ok: true, equipo: resultado.equipo });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
