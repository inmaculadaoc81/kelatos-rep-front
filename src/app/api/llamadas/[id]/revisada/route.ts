import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { esSuperadmin } from "@/lib/superadmin";

/** Marca una queja como revisada — solo superadmins. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!esSuperadmin(email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const { id } = await params;
  try {
    return NextResponse.json(await kelatosApiPost(`/v1/llamadas/${encodeURIComponent(id)}/revisada`, { usuario: email }));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
