import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";

/** Reproduce la grabación de una llamada — solo superadmins (repetido aquí y en src/proxy.ts). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!esSuperadmin(email)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const base = process.env.KELATOS_API_BASE_URL;
  const token = process.env.KELATOS_API_TOKEN;
  if (!base || !token) return NextResponse.json({ ok: false, error: "API no configurada" }, { status: 500 });
  const res = await fetch(`${base}/v1/llamadas/${encodeURIComponent(id)}/audio`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) return NextResponse.json({ ok: false, error: "Sin grabación" }, { status: res.status });
  return new NextResponse(await res.arrayBuffer(), { headers: { "Content-Type": res.headers.get("content-type") || "audio/webm", "Cache-Control": "private, max-age=300" } });
}
