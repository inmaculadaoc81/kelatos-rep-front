import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Botón "Ticket Manual" (Reparaciones) — prueba explícita del usuario,
 * 2026-08-26: genera el PDF desde la plantilla nueva de tickets de venta
 * (sin cliente, solo empresa + líneas + IVA) pero no persiste nada. El
 * backend devuelve el PDF binario directo; aquí solo se retransmite.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const datos = await req.json();
  const lineas = Array.isArray(datos?.lineas) ? datos.lineas : [];
  if (!lineas.length) return NextResponse.json({ ok: false, error: "Debe incluir al menos una línea" }, { status: 400 });
  const estado = datos?.estado === "Pendiente" ? "Pendiente" : "Cobrada";

  try {
    const res = await fetch(`${process.env.KELATOS_API_BASE_URL}/v1/tickets/generar-prueba`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.KELATOS_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lineas, estado }),
      cache: "no-store",
    });

    if (!res.ok) {
      const texto = await res.text();
      let mensaje = `API HTTP ${res.status}`;
      try {
        mensaje = JSON.parse(texto)?.error || mensaje;
      } catch {
        // respuesta no era JSON, se usa el mensaje genérico
      }
      return NextResponse.json({ ok: false, error: mensaje }, { status: 502 });
    }

    const pdfBuffer = await res.arrayBuffer();
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="ticket-prueba.pdf"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
