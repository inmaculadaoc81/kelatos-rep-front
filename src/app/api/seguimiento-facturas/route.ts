import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapearSeguimiento, DatosSeguimientoForm } from "@/lib/seguimiento-facturas";

interface RespuestaGenericaSeguimiento {
  ok: boolean;
  rows: Parameters<typeof mapearSeguimiento>[0][];
}

function hashCanonico(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function GET() {
  try {
    const data = await kelatosApiGet<RespuestaGenericaSeguimiento>("/v1/seguimiento_facturas", {
      limit: 2000,
      order: "fecha",
      direction: "desc",
    });
    return NextResponse.json({ ok: true, entradas: data.rows.map(mapearSeguimiento) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const datos = (await req.json()) as DatosSeguimientoForm;
  if (!datos.proveedor?.trim() && !datos.plataforma?.trim()) {
    return NextResponse.json({ ok: false, error: "Indica al menos plataforma o proveedor" }, { status: 400 });
  }

  const requestId = crypto.randomUUID();
  const payloadHash = hashCanonico({ requestId, datos });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; seguimiento: Parameters<typeof mapearSeguimiento>[0] }>(
      "/v1/seguimiento_facturas/crear",
      {
        requestId,
        usuario,
        payloadHash,
        fecha: datos.fecha,
        plataforma: datos.plataforma.trim(),
        proveedor: datos.proveedor.trim(),
        numeroPedido: datos.numeroPedido.trim(),
        modelo: datos.modelo.trim(),
        importe: datos.importe,
        moneda: datos.moneda.trim() || "EUR",
        numeroFactura: datos.numeroFactura.trim(),
        facturaRecibida: datos.facturaRecibida,
        observaciones: datos.observaciones.trim(),
      }
    );

    return NextResponse.json({ ok: true, entrada: mapearSeguimiento(resultado.seguimiento) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
