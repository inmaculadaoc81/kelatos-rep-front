import { NextResponse } from "next/server";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * POST público — sin sesión, la llama la pantalla del formulario en la
 * tablet antes de dejar pasar al cliente. El token del API real nunca
 * sale de este servidor, igual que el resto de rutas públicas
 * (/formulario-recogida).
 */
export async function POST(req: Request) {
  const { codigo } = (await req.json()) as { codigo?: string };
  if (!codigo || !codigo.trim()) {
    return NextResponse.json({ ok: false, valido: false, error: "Introduce el código" }, { status: 400 });
  }

  try {
    const data = await kelatosApiPost<{ ok: boolean; valido: boolean; visitaId?: number; error?: string }>(
      "/v1/formulario/codigo-acceso/validar",
      { codigo: codigo.trim() }
    );
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, valido: false, error: message }, { status: 502 });
  }
}
