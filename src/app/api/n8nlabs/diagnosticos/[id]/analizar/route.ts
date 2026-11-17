import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { puedeVerCrm } from "@/lib/crm";

type Params = { params: Promise<{ id: string }> };

/** Pide a la IA local que (re)redacte el resumen y el mensaje sugerido del lead. Tarda cerca de un minuto, en segundo plano. */
export async function POST(_req: Request, { params }: Params) {
  const session = await auth();
  if (!puedeVerCrm(session?.user)) return NextResponse.json({ ok: false, error: "Sin acceso al CRM" }, { status: 403 });
  const { id } = await params;
  try {
    return NextResponse.json(await kelatosApiPost(`/v1/n8nlabs/diagnosticos/${encodeURIComponent(id)}/analizar`, {}));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 400 });
  }
}
