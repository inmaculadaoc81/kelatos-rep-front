import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiPost } from "@/lib/kelatos-api";

export async function POST(req: Request) {
  const session = await auth();
  if (!esSuperadmin(session?.user?.email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const { id1, id2 } = await req.json();
  try {
    const data = await kelatosApiPost<{ ok: boolean; error?: string }>("/v1/transferencias/conciliar-par", {
      id1, id2, usuario: session?.user?.email,
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
