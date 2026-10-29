import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/** «Mejorar redacción»: corrige ortografía y pule el tono de un texto. Cualquier usuario con sesión; el texto no se guarda en ningún sitio. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  try {
    const b = (await req.json()) as { texto?: unknown; contexto?: unknown };
    const data = await kelatosApiPost<{ ok: boolean; texto: string; correcciones: string[]; igual: boolean }>("/v1/mails/mejorar-redaccion", {
      texto: typeof b.texto === "string" ? b.texto : "",
      contexto: typeof b.contexto === "string" ? b.contexto : "",
    });
    return NextResponse.json({ ok: true, texto: data.texto, correcciones: data.correcciones, igual: data.igual });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
