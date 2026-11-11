import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";

export async function GET() {
  try {
    const data = await kelatosApiGet<{ ok: boolean; usuarios: { usuario: string; n: number }[]; categorias: { categoria: string; n: number }[] }>("/v1/lecturas/historial/filtros", {});
    return NextResponse.json({ ok: true, usuarios: data.usuarios, categorias: data.categorias });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
