import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generarTokenEntregaVenta } from "@/lib/token-entrega-venta";
import { origenPublico } from "@/lib/request-origin";

// Mismos servicios públicos de generación de QR que qr-recogida (reparaciones).
const APIS_QR = (url: string) => [
  `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`,
  `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=220&margin=1`,
];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ ventaId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { ventaId } = await params;

  let token: string;
  try {
    token = generarTokenEntregaVenta(ventaId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  const origin = origenPublico(req);
  const url = `${origin}/formulario-entrega-venta?ventaId=${encodeURIComponent(ventaId)}&token=${encodeURIComponent(token)}`;

  for (const apiUrl of APIS_QR(url)) {
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) continue;
      const mime = res.headers.get("content-type")?.split(";")[0] || "image/png";
      const buffer = await res.arrayBuffer();
      const dataUrl = `data:${mime};base64,${Buffer.from(buffer).toString("base64")}`;
      return NextResponse.json({ ok: true, url, dataUrl });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ ok: true, url, dataUrl: null });
}
