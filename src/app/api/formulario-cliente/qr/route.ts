import { NextResponse } from "next/server";
import { origenPublico } from "@/lib/request-origin";

// Mismos servicios públicos de generación de QR que ya usa el QR de
// recogida (ver qr-recogida/route.ts) — sin token ni datos sensibles
// aquí: la URL apunta sin más al formulario público, la protección real
// es el código de acceso que se pide al llegar.
const APIS_QR = (url: string) => [
  `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`,
  `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=220&margin=1`,
];

export async function GET(req: Request) {
  const origin = origenPublico(req);
  const url = `${origin}/formulario`;

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
