import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import type { LineaFactura, ClienteFactura } from "@/lib/factura";

function fechaHoyEs(): string {
  return new Date().toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

interface FilaVentaFactura {
  venta_id: string;
  numero_factura: string | null;
  lineas_factura: unknown;
  cliente_factura: unknown;
  numero_factura_rectificativa: string | null;
  fecha_factura_rectificativa: string | null;
  numero_factura_corregida: string | null;
  fecha_factura_corregida: string | null;
}

interface FilaItemFactura {
  descripcion: string | null;
  precio: string | number | null;
}

/**
 * Orquesta el ciclo de Devolución (rectificativa) / Rectificativo
 * (rectificativa + corregida) de la Factura REAL de un pedido de piezas —
 * mismo mecanismo que /api/reparaciones/[resguardo]/facturas y
 * /api/alquileres/[id]/facturas: saga genérico /v1/facturas/entidades/*
 * (preparar→iniciar→generar-pdf, ya existente sin llamador para tipo
 * 'pedido') + persistencia dedicada en /v1/ventas/facturas/confirmar.
 * TabDevolucionRectificativo/TabRectificativo/FaseCorregida
 * (factura-acciones-tabs.tsx, compartidos con reparaciones) mandan
 * {requestId, tipo, datos:{...}} a esta misma URL para las 3 fases —
 * tipo distingue cuál.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ ventaId: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { ventaId } = await params;
  const raw = (await req.json()) as Record<string, unknown> & { requestId?: string; tipo?: string; datos?: Record<string, unknown> };
  const requestId = typeof raw.requestId === "string" ? raw.requestId : "";
  if (!requestId || !/^[0-9a-f-]{36}$/i.test(requestId)) {
    return NextResponse.json({ ok: false, error: "requestId inválido" }, { status: 400 });
  }
  const tipo = raw.tipo === "pedido_corregida" ? "pedido_corregida" : "pedido_rectificativa";
  const datos = raw.datos && typeof raw.datos === "object" ? (raw.datos as Record<string, unknown>) : {};

  try {
    const { venta: v, items } = await kelatosApiGet<{ ok: boolean; venta: FilaVentaFactura; items: FilaItemFactura[] }>(
      `/v1/lecturas/ventas/${encodeURIComponent(ventaId)}`
    );
    if (!v.numero_factura) {
      return NextResponse.json({ ok: false, error: "Este pedido no tiene ninguna factura real generada" }, { status: 409 });
    }

    async function generarUnDocumento(opts: {
      tipoOp: string;
      lineas: LineaFactura[];
      cliente: ClienteFactura;
      formaPago: unknown;
      banco: unknown;
      rectificaDe: string;
      estadoFactura: string;
    }): Promise<{ numero: string; url: string; total: number }> {
      const preparar = await kelatosApiPost<{ ok: boolean; numeroFactura: string }>("/v1/facturas/entidades/preparar", {
        requestId,
        usuario,
        tipo: opts.tipoOp,
        payloadHash: crypto.createHash("sha256").update(JSON.stringify({ tipo: opts.tipoOp, lineas: opts.lineas })).digest("hex"),
        entidadId: ventaId,
        datos: { lineas: opts.lineas },
      });

      const iniciar = await kelatosApiPost<{ ok: boolean; operacion: { estado: string } }>("/v1/facturas/entidades/iniciar", {
        requestId,
        usuario,
      });
      if (iniciar.operacion.estado === "resultado_desconocido") {
        throw new Error(
          `El número ${preparar.numeroFactura} quedó en un estado incierto en un intento anterior. No se ha generado un PDF nuevo para evitar duplicar el número — contacta con soporte para reconciliarlo manualmente.`
        );
      }

      let generado;
      try {
        generado = await kelatosApiPost<{ ok: boolean; url: string; total: number; baseImponible: number }>("/v1/facturas/entidades/generar-pdf", {
          datos: {
            numero: preparar.numeroFactura,
            fecha: fechaHoyEs(),
            rectificaDe: opts.rectificaDe,
            cliente: opts.cliente,
            formaPago: opts.formaPago,
            banco: opts.banco || "",
            lineas: opts.lineas,
            estadoFactura: opts.estadoFactura,
          },
        });
      } catch (errorPdf) {
        const mensaje = errorPdf instanceof Error ? errorPdf.message : "Error desconocido generando el PDF";
        await kelatosApiPost("/v1/facturas/entidades/fallar", { requestId, errorTecnico: mensaje.slice(0, 500) }).catch(() => {});
        throw new Error(`El número de factura ${preparar.numeroFactura} ya ha sido reservado y no se puede reutilizar. Error generando el PDF: ${mensaje}`);
      }

      return { numero: preparar.numeroFactura, url: generado.url, total: generado.baseImponible };
    }

    const clienteInput = (datos.cliente && typeof datos.cliente === "object" ? datos.cliente : v.cliente_factura || {}) as ClienteFactura;

    if (tipo === "pedido_rectificativa") {
      const rectExistente = (v.numero_factura_rectificativa || "").trim();
      const corrExistente = (v.numero_factura_corregida || "").trim();
      const cicloCerrado =
        !rectExistente ||
        (!!corrExistente &&
          !!v.fecha_factura_corregida &&
          (!v.fecha_factura_rectificativa || v.fecha_factura_corregida >= v.fecha_factura_rectificativa));
      if (!cicloCerrado) {
        return NextResponse.json({ ok: false, error: `Ya existe una rectificativa pendiente de su corregida: ${rectExistente}` }, { status: 409 });
      }

      const motivo = typeof datos.motivo === "string" ? datos.motivo.trim() : "";
      if (!motivo) return NextResponse.json({ ok: false, error: "El motivo es obligatorio" }, { status: 400 });

      // Reproduce EXACTAMENTE lo facturado (lineas_factura, foto tomada al
      // generar la Factura real) — items_venta puede haber cambiado desde
      // entonces (Agregar/Editar pieza). Solo cae a items_venta cuando la
      // Factura es anterior a esta migración y nunca guardó la foto.
      const lineasBase: LineaFactura[] =
        Array.isArray(v.lineas_factura) && (v.lineas_factura as LineaFactura[]).length > 0
          ? (v.lineas_factura as LineaFactura[])
          : items.map((it) => ({ descripcion: it.descripcion || "", cantidad: 1, precio: num(it.precio) }));
      const lineasRect = lineasBase.map((l) => ({ ...l, precio: -(num(l.precio)) }));

      const doc = await generarUnDocumento({
        tipoOp: "pedido_rectificativa",
        lineas: lineasRect,
        cliente: clienteInput,
        formaPago: datos.formaPago,
        banco: datos.banco,
        rectificaDe: `Rectifica a: ${v.numero_factura}`,
        estadoFactura: "Devolución",
      });

      await kelatosApiPost("/v1/ventas/facturas/confirmar", {
        requestId,
        usuario,
        dryRun: false,
        urlPdf: doc.url,
        ventaId,
        columnas: {
          numero_factura_rectificativa: doc.numero,
          url_factura_rectificativa: doc.url,
          total_factura_rectificativa: doc.total,
          fecha_factura_rectificativa: new Date().toISOString(),
          motivo_factura_rectificativa: motivo,
          cliente_factura: clienteInput,
        },
      });

      return NextResponse.json({ ok: true, numeroFactura: doc.numero, url: doc.url });
    }

    // tipo === "pedido_corregida"
    const rectExistente = (v.numero_factura_rectificativa || "").trim();
    if (!rectExistente) return NextResponse.json({ ok: false, error: "Primero genera la factura rectificativa" }, { status: 409 });

    const lineasCorr = Array.isArray(datos.lineas) ? (datos.lineas as LineaFactura[]) : [];
    if (!lineasCorr.length) return NextResponse.json({ ok: false, error: "Añade al menos un concepto" }, { status: 400 });
    const estadoFacturaCorr = typeof datos.estadoFactura === "string" ? datos.estadoFactura : "Cobrada";

    const doc = await generarUnDocumento({
      tipoOp: "pedido_corregida",
      lineas: lineasCorr,
      cliente: clienteInput,
      formaPago: datos.formaPago,
      banco: datos.banco,
      rectificaDe: `Factura corregida. Sustituye a: ${v.numero_factura}`,
      estadoFactura: estadoFacturaCorr,
    });

    await kelatosApiPost("/v1/ventas/facturas/confirmar", {
      requestId,
      usuario,
      dryRun: false,
      urlPdf: doc.url,
      ventaId,
      columnas: {
        numero_factura_corregida: doc.numero,
        url_factura_corregida: doc.url,
        total_factura_corregida: doc.total,
        fecha_factura_corregida: new Date().toISOString(),
        estado_factura_corregida: estadoFacturaCorr,
        cliente_factura: clienteInput,
      },
    });

    return NextResponse.json({ ok: true, numeroFactura: doc.numero, url: doc.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
