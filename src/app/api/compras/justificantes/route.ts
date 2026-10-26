import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

export const maxDuration = 60;

/** Proxy de POST /v1/compras/justificantes — guarda en Drive (carpeta "Justificantes de pedidos") las capturas, facturas o
    fotos originales con las que se registraron pedidos en "Subir pedido con IA", enlazadas a cada pedido creado. */
export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    archivos?: { base64: string; mimeType: string }[];
    pedidos?: string[];
    proveedor?: string;
    plataforma?: string;
    numeroPedido?: string | null;
  };
  try {
    const r = await kelatosApiPost<{ ok: boolean; archivos: number; carpeta: string }>("/v1/compras/justificantes", {
      usuario,
      archivos: body.archivos || [],
      pedidos: body.pedidos || [],
      proveedor: body.proveedor || "",
      plataforma: body.plataforma || "",
      numeroPedido: body.numeroPedido || "",
    });
    return NextResponse.json({ ok: true, archivos: r.archivos });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
