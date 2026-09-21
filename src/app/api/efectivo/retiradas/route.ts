import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiPost } from "@/lib/kelatos-api";

/** Registra una retirada o un ingreso manual de efectivo (solo superadmin). */
export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!esSuperadmin(email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  try {
    const body = (await req.json()) as { importe?: unknown; motivo?: unknown; fechaHora?: unknown; tipo?: unknown };
    const data = await kelatosApiPost<{ ok: boolean; retirada: unknown }>("/v1/efectivo/retiradas", {
      usuario: email,
      tipo: body.tipo === "ingreso" ? "ingreso" : "retirada",
      importe: body.importe,
      motivo: body.motivo,
      fechaHora: body.fechaHora,
    });
    return NextResponse.json({ ok: true, retirada: data.retirada });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
