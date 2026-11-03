import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

export const dynamic = "force-dynamic";

/** Buscador global del header: clientes del catálogo y los de reparaciones, ventas y alquileres. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  try {
    return NextResponse.json(await kelatosApiGet("/v1/lecturas/buscar-clientes", { q }));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
