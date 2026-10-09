import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { TpvFotoApi } from "@/lib/tpv";

/** Sube una foto del ticket de cierre del datáfono para un día (varias por
    día). El frontend manda el archivo ya comprimido en base64 (lib/foto-
    captura.ts). `subidoPor` se resuelve aquí desde la sesión. */
export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email || "";
  if (!email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    const body = (await req.json()) as { fecha?: unknown; base64?: unknown; mimeType?: unknown; nombre?: unknown };
    if (!body.base64 || !body.mimeType) return NextResponse.json({ ok: false, error: "Faltan datos del archivo" }, { status: 400 });
    const data = await kelatosApiPost<{ ok: boolean; foto: TpvFotoApi }>("/v1/tpv/fotos", {
      subidoPor: email,
      fecha: body.fecha,
      base64: body.base64,
      mimeType: body.mimeType,
      nombre: body.nombre,
    });
    return NextResponse.json({ ok: true, foto: data.foto });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
