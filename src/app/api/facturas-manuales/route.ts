import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import type { ClienteFactura, LineaFactura } from "@/lib/factura";

function fechaHoyEs(): string {
  return new Date().toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });
}

/**
 * Reproduce abrirVistaFacturaManual()/generarPdfFactura() (modo 'manual')
 * del original — botón verde "Nueva Factura Manual" junto a "Nueva
 * Reparación", sin resguardo de por medio. Orquesta el saga genérico
 * /v1/facturas/entidades/* (preparar→iniciar→generar-pdf, mismo patrón que
 * nuevo-pedido/route.ts) y termina con POST /v1/facturas-manuales/confirmar
 * (equivalente SQL de apiGuardarFacturaManual: reserva+persistencia en una
 * sola transacción, ya existente en el backend sin ningún llamador hasta
 * ahora).
 */
export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const body = (await req.json()) as {
    requestId: string;
    serie: "1" | "3";
    cliente: ClienteFactura;
    formaPago: string;
    banco: string;
    estadoFactura: string;
    lineas: LineaFactura[];
  };
  const { requestId, serie, cliente, formaPago, banco, estadoFactura, lineas } = body;

  if (!requestId || !/^[0-9a-f-]{36}$/i.test(requestId)) {
    return NextResponse.json({ ok: false, error: "requestId inválido" }, { status: 400 });
  }
  if (serie !== "1" && serie !== "3") return NextResponse.json({ ok: false, error: "serie debe ser '1' o '3'" }, { status: 400 });
  if (!cliente?.nombre?.trim()) return NextResponse.json({ ok: false, error: "El nombre del cliente es obligatorio" }, { status: 400 });
  if (!formaPago) return NextResponse.json({ ok: false, error: "Selecciona la forma de pago" }, { status: 400 });
  if (formaPago === "tarjeta" && !banco) return NextResponse.json({ ok: false, error: "Selecciona el banco" }, { status: 400 });
  if (!lineas?.length) return NextResponse.json({ ok: false, error: "Añade al menos un concepto" }, { status: 400 });

  const payloadHash = crypto.createHash("sha256").update(JSON.stringify({ tipo: "manual", serie, lineas })).digest("hex");

  try {
    const preparar = await kelatosApiPost<{ ok: boolean; numeroFactura: string }>("/v1/facturas/entidades/preparar", {
      requestId, usuario, tipo: "manual", serie, payloadHash, datos: { lineas },
    });

    const iniciar = await kelatosApiPost<{ ok: boolean; operacion: { estado: string } }>("/v1/facturas/entidades/iniciar", { requestId, usuario });
    if (iniciar.operacion.estado === "resultado_desconocido") {
      return NextResponse.json({
        ok: false,
        error: `El número ${preparar.numeroFactura} quedó en un estado incierto en un intento anterior. No se ha generado un PDF nuevo para evitar duplicar el número — contacta con soporte para reconciliarlo manualmente.`,
      }, { status: 409 });
    }

    let generado;
    try {
      generado = await kelatosApiPost<{ ok: boolean; url: string; total: number; baseImponible: number }>("/v1/facturas/entidades/generar-pdf", {
        datos: {
          numero: preparar.numeroFactura,
          fecha: fechaHoyEs(),
          cliente,
          formaPago,
          banco: formaPago === "tarjeta" ? banco : "",
          lineas,
          // Sin esto, generarFacturaPdfDesdeSheet() (server.js) nunca recibe
          // datos.estadoFactura y cae a su propio valor por defecto (serie
          // "1" → "Pendiente") — el PDF salía siempre "Pendiente" aunque se
          // eligiera "Cobrada" en el modal (bug real reportado; el estado sí
          // se guardaba bien en BD vía /confirmar más abajo, solo el PDF
          // impreso quedaba mal).
          estadoFactura,
        },
      });
    } catch (errorPdf) {
      const mensaje = errorPdf instanceof Error ? errorPdf.message : "Error desconocido generando el PDF";
      await kelatosApiPost("/v1/facturas/entidades/fallar", { requestId, errorTecnico: mensaje.slice(0, 500) }).catch(() => {});
      return NextResponse.json({
        ok: false,
        error: `El número de factura ${preparar.numeroFactura} ya ha sido reservado y no se puede reutilizar. Error generando el PDF: ${mensaje}`,
      }, { status: 502 });
    }

    const confirmar = await kelatosApiPost<{ ok: boolean; numeroFactura: string; entidadId: string; facturaManual: Record<string, unknown> }>(
      "/v1/facturas-manuales/confirmar",
      { requestId, usuario, urlPdf: generado.url, datosFactura: { cliente, lineas, formaPago, banco: formaPago === "tarjeta" ? banco : "", estadoFactura } }
    );

    return NextResponse.json({ ok: true, numeroFactura: preparar.numeroFactura, urlPdf: generado.url, entidadId: confirmar.entidadId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
