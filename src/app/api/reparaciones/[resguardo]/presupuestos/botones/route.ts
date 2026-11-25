import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

/** ¿Los correos de presupuesto de esta reparación llevarán botones para responder? */
export async function GET(_req: Request, { params }: { params: Promise<{ resguardo: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { resguardo } = await params;
  try {
    return NextResponse.json(await kelatosApiGet<{ ok: boolean; activo: boolean }>("/v1/ppto-botones/estado", { resguardo }));
  } catch {
    return NextResponse.json({ ok: true, activo: false });
  }
}
