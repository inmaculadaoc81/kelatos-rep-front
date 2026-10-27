import { NextResponse } from "next/server";
import { obtenerTodasLasFacturas } from "@/lib/obtener-facturas";

/** Documento (PDF en Drive) de una factura o ticket por su número, para ver el
    origen de un asiento contable. */
export async function GET(req: Request) {
  try {
    const numero = (new URL(req.url).searchParams.get("numero") || "").trim();
    if (!numero) return NextResponse.json({ ok: false, error: "Falta el número" }, { status: 400 });
    const facturas = await obtenerTodasLasFacturas();
    const f = facturas.find((x) => x.numero === numero && x.url);
    if (!f) return NextResponse.json({ ok: true, documento: null });
    return NextResponse.json({ ok: true, documento: { numero: f.numero, url: f.url, cliente: f.cliente } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
