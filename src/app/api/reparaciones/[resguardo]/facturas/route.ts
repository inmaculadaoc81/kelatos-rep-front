import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import type { TipoFactura, DatosFactura, ResultadoFactura } from "@/lib/factura";

/**
 * Orquesta el saga completo de facturación (preparar → iniciar →
 * generar-pdf → confirmar) en una sola llamada — los 4 pasos ya existen
 * en el backend (kelatos-rep-back), esto solo los encadena. NUNCA se
 * reintenta "iniciar" automáticamente con el mismo requestId si ya
 * devolvió "resultado_desconocido": eso significa que una llamada
 * anterior llegó a ese punto sin confirmar/fallar, y la numeración fiscal
 * es irreversible — se corta y se pide reconciliación manual antes de
 * generar un PDF que podría duplicar el número.
 *
 * El requestId lo genera y conserva el CLIENTE (ver reparacion-sheet.tsx
 * y estados-especiales-panel.tsx para el mismo patrón) — así un reintento
 * tras un fallo de red reutiliza la operación ya "preparada" en vez de
 * reservar un número nuevo.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ resguardo: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;
  const body = (await req.json()) as {
    requestId: string; tipo: TipoFactura; datos: DatosFactura;
    /** Combina la entrega en la misma transacción que /confirmar (ver _aplicarMarcarEntregadoTx en server.js) — usado por abrirModalEntregarEquipo('ENTREGADO'|'ENVIO') en el original, cuando la factura y la salida se registran en un único paso. */
    incluirEntrega?: boolean;
    entregaDatos?: { fecha: string; tipoEntrega: "ENTREGADO" | "ENVIO" | "RECICLAJE"; resena?: string; observaciones?: string };
  };
  const { requestId, tipo, datos, incluirEntrega, entregaDatos } = body;

  if (!requestId || !/^[0-9a-f-]{36}$/i.test(requestId)) {
    return NextResponse.json({ ok: false, error: "requestId inválido" }, { status: 400 });
  }
  if (!datos?.lineas?.length) {
    return NextResponse.json({ ok: false, error: "Debe incluir al menos una línea de factura" }, { status: 400 });
  }

  const payloadHash = crypto.createHash("sha256").update(JSON.stringify({ tipo, lineas: datos.lineas })).digest("hex");

  try {
    // 1) Reservar el número fiscal (o recuperar la operación ya preparada
    //    con este mismo requestId, si es un reintento).
    const preparar = await kelatosApiPost<{
      ok: boolean; numeroFactura: string; reused: boolean;
      operacion: { estado: string };
    }>(`/v1/reparaciones/${encodeURIComponent(resguardo)}/facturas/preparar`, {
      requestId, usuario, tipo, payloadHash, datos: { lineas: datos.lineas }
    });

    // 2) Marcar "generando". Si el backend devuelve "resultado_desconocido"
    //    es porque una llamada previa con este requestId ya pasó por aquí
    //    sin confirmar ni fallar — no se sigue: requiere revisión manual
    //    vía GET /v1/facturas/operaciones/:requestId antes de reintentar.
    const iniciar = await kelatosApiPost<{ ok: boolean; operacion: { estado: string } }>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/facturas/iniciar`,
      { requestId, usuario }
    );
    if (iniciar.operacion.estado === "resultado_desconocido") {
      return NextResponse.json({
        ok: false,
        error: `El número ${preparar.numeroFactura} quedó en un estado incierto en un intento anterior. No se ha generado un PDF nuevo para evitar duplicar el número — contacta con soporte para reconciliarlo manualmente.`
      }, { status: 409 });
    }

    // 3) Generar el PDF real desde la plantilla de Sheets (no toca Postgres).
    let generado;
    try {
      generado = await kelatosApiPost<{ ok: boolean; url: string; fileId: string; total: number; baseImponible: number }>(
        `/v1/reparaciones/${encodeURIComponent(resguardo)}/facturas/generar-pdf`,
        { datos: { ...datos, numero: preparar.numeroFactura } }
      );
    } catch (errorPdf) {
      // El número ya está reservado y no se libera (numeración irreversible)
      // — se marca "fallida" para que quede claro que esa operación no
      // llegó a tener PDF, en vez de dejarla colgada en "generando".
      const mensaje = errorPdf instanceof Error ? errorPdf.message : "Error desconocido generando el PDF";
      await kelatosApiPost(`/v1/reparaciones/${encodeURIComponent(resguardo)}/facturas/fallar`, {
        requestId, errorTecnico: mensaje.slice(0, 500)
      }).catch(() => { /* best-effort */ });
      return NextResponse.json({
        ok: false,
        error: `El número de factura ${preparar.numeroFactura} ya ha sido reservado y no se puede reutilizar. Error generando el PDF: ${mensaje}`
      }, { status: 502 });
    }

    // 4) Confirmar: persiste número/PDF/cliente en la reparación. Se pasa
    //    "datos" completo (no una lista fija de campos) porque cada tipo
    //    lee campos distintos: normal/revision usan cliente/formaPago/
    //    banco/estadoFactura, rectificativa usa motivo/numeroOriginal,
    //    corregida usa numeroFacturaOriginal/cliente — server.js ignora
    //    los campos que no le correspondan a su tipo.
    const confirmar = await kelatosApiPost<{ ok: boolean; reparacion: Record<string, unknown>; diasTotales?: number }>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/facturas/confirmar`,
      {
        requestId, usuario, urlPdf: generado.url, datos,
        ...(incluirEntrega ? { incluirEntrega: true, entregaDatos } : {}),
      }
    );

    const resultado: ResultadoFactura = {
      numeroFactura: preparar.numeroFactura,
      url: generado.url,
      total: generado.total,
      baseImponible: generado.baseImponible,
      reparacion: confirmar.reparacion,
      diasTotales: confirmar.diasTotales
    };
    return NextResponse.json({ ok: true, ...resultado });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
