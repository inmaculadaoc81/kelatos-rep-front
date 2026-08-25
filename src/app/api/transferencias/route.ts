import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiGet } from "@/lib/kelatos-api";

export async function GET(req: Request) {
  const session = await auth();
  if (!esSuperadmin(session?.user?.email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const estado = new URL(req.url).searchParams.get("estado") || "Pendiente";
  try {
    const data = await kelatosApiGet<{ ok: boolean; items: unknown[] }>("/v1/lecturas/transferencias", { estado });
    return NextResponse.json({ ok: true, items: data.items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
