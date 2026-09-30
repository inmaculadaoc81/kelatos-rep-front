import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiPost } from "@/lib/kelatos-api";

/** Registra un conteo físico de caja (solo superadmin): compara lo contado
    en el local contra el saldo del sistema en ese momento. No mueve dinero. */
export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!esSuperadmin(email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  try {
    const body = (await req.json()) as { importeContado?: unknown; saldoSistema?: unknown; motivo?: unknown; fechaHora?: unknown };
    const data = await kelatosApiPost<{ ok: boolean; conteo: unknown }>("/v1/efectivo/conteos", {
      usuario: email,
      importeContado: body.importeContado,
      saldoSistema: body.saldoSistema,
      motivo: body.motivo,
      fechaHora: body.fechaHora,
    });
    return NextResponse.json({ ok: true, conteo: data.conteo });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
