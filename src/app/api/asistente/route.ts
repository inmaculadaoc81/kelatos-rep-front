import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { buscarFragmentos } from "@/lib/asistente/buscar";
import { areasAsistente, puedeUsarAsistente } from "@/lib/asistente/permisos";

export const dynamic = "force-dynamic";

interface MensajeHistorial {
  rol: "usuario" | "asistente";
  texto: string;
}

/** Asistente de ayuda (burbuja del dashboard). Busca en el código de la aplicación los fragmentos relacionados
    con la pregunta y se los pasa, junto con la pregunta, al servidor, que consulta a la IA local. Responde al
    instante con { jobId }; el texto se va consultando en GET /api/asistente/[jobId]. */
export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (!puedeUsarAsistente(session.user)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  // Lo que la cuenta puede ver: acota tanto el código que se le explica como las tablas que se consultan.
  const areas = areasAsistente(session.user);
  if (!areas.length) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { pregunta?: unknown; historial?: unknown; ruta?: unknown; contextoPantalla?: unknown };
  const pregunta = typeof body.pregunta === "string" ? body.pregunta.trim().slice(0, 1200) : "";
  if (!pregunta) return NextResponse.json({ ok: false, error: "Escribe una pregunta." }, { status: 400 });
  const ruta = typeof body.ruta === "string" ? body.ruta.slice(0, 120) : "";
  // Elemento que el usuario tiene abierto (p. ej. { tipo: "resguardo", id: "18453" }); el servidor lo valida de nuevo.
  const cp = body.contextoPantalla as { tipo?: unknown; id?: unknown } | null | undefined;
  const contextoPantalla = cp && typeof cp.tipo === "string" && typeof cp.id === "string" ? { tipo: cp.tipo.slice(0, 30), id: cp.id.slice(0, 60) } : null;
  const historial: MensajeHistorial[] = Array.isArray(body.historial)
    ? (body.historial as MensajeHistorial[])
        .filter((m) => m && (m.rol === "usuario" || m.rol === "asistente") && typeof m.texto === "string")
        .slice(-6)
        .map((m) => ({ rol: m.rol, texto: m.texto.slice(0, 1500) }))
    : [];

  try {
    // La búsqueda incluye la última pregunta anterior: "¿y eso cómo se calcula?" solo se entiende con ella.
    const ultimaPregunta = [...historial].reverse().find((m) => m.rol === "usuario")?.texto ?? "";
    const contextoFront = await buscarFragmentos(`${ultimaPregunta} ${pregunta}`, ruta, 6, areas);
    const r = await kelatosApiPost<{ ok: boolean; jobId: string }>("/v1/asistente/chat", {
      usuario,
      pregunta,
      historial,
      ruta,
      contextoFront,
      contextoPantalla,
      areas,
    });
    return NextResponse.json({ ok: true, jobId: r.jobId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
