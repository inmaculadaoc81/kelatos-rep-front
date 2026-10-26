import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

export interface ResultadoNifIva {
  estado: "valido" | "invalido" | "no_verificado" | "no_aplica" | "sin_dato";
  mensaje?: string;
  nombre?: string | null;
  pais?: string;
  fuente?: string;
}

/** Proxy de POST /v1/facturas-recibidas/validar-iva — comprueba el NIF/CIF español (dígito de control) o el NIF-IVA de la UE (VIES). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { nif?: string; tipo?: string };
  try {
    const r = await kelatosApiPost<ResultadoNifIva & { ok: boolean }>("/v1/facturas-recibidas/validar-iva", { nif: body.nif || "", tipo: body.tipo || "nacional" });
    return NextResponse.json({ ok: true, resultado: { estado: r.estado, mensaje: r.mensaje, nombre: r.nombre ?? null, pais: r.pais, fuente: r.fuente } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No se pudo comprobar el NIF-IVA" }, { status: 502 });
  }
}
