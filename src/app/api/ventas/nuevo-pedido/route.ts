import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import type { DatosNuevoPedido, ResultadoNuevoPedido } from "@/lib/ventas";

const LABELS_PAGO: Record<string, string> = { efectivo: "Efectivo", tarjeta: "Tarjeta bancaria", transferencia: "Transferencia bancaria", bizum: "Bizum" };

function fechaHoyEs(): string {
  return new Date().toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });
}

/**
 * POST /v1/ventas nunca toca kelatos_app.clientes (a diferencia de
 * /v1/reparaciones/altas/confirmar, que sí registra/actualiza el cliente
 * como parte de la misma transacción) — un pedido de piezas para un
 * cliente nuevo no dejaba ningún rastro en el directorio de clientes. Bug
 * real reportado por el usuario, 2026-08-27: "los clientes registrados
 * para los pedido de piezas no se están registrando en el listado de
 * clientes". POST /v1/clientes/upsert ya existía para exactamente este
 * caso ("cliente asociado a una operación que no lo crea por sí misma")
 * pero no tenía ningún llamador — mismas reglas de coincidencia que el
 * alta de reparación (por DNI, o ≥2 de teléfono/email/nombre), así que
 * un cliente que ya existe se actualiza en vez de duplicarse. Best-effort:
 * si falla, no bloquea la creación del pedido (el directorio de clientes
 * es secundario respecto al pedido en sí).
 */
async function registrarClienteVenta(usuario: string, datos: { clienteNombre: string; clienteTelefono: string; clienteEmail: string; clienteDni?: string; clienteDireccion?: string }) {
  const nombre = datos.clienteNombre.trim();
  const telefono = datos.clienteTelefono.trim();
  const email = datos.clienteEmail.trim();
  const dniCif = (datos.clienteDni || "").trim();
  const direccion = (datos.clienteDireccion || "").trim();
  if (!nombre && !telefono && !email && !dniCif) return;
  try {
    const payloadHash = crypto.createHash("sha256").update(JSON.stringify({ nombre, telefono, email, dniCif, direccion })).digest("hex");
    await kelatosApiPost("/v1/clientes/upsert", {
      requestId: crypto.randomUUID(),
      usuario,
      payloadHash,
      nombre, telefono, email, dniCif, direccion,
    });
  } catch (error) {
    console.error("No se pudo registrar/actualizar el cliente del pedido en el directorio:", error);
  }
}

/**
 * Orquesta generarFacturaPedido() del original — reproduce el saga
 * genérico /v1/facturas/entidades/* (preparar→iniciar→generar-pdf→
 * confirmar, ya existente sin ningún llamador) + POST /v1/ventas, en el
 * mismo orden que el original: primero reserva el número fiscal real y
 * genera el PDF, y solo entonces crea la venta con ese número. En modo
 * garantía no hay saga fiscal — se crea la venta directamente, igual que
 * el original.
 */
export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const body = (await req.json()) as { requestId: string; datos: DatosNuevoPedido };
  const { requestId, datos } = body;
  if (!requestId || !/^[0-9a-f-]{36}$/i.test(requestId)) {
    return NextResponse.json({ ok: false, error: "requestId inválido" }, { status: 400 });
  }
  if (!datos.clienteNombre.trim()) return NextResponse.json({ ok: false, error: "El nombre del cliente es obligatorio" }, { status: 400 });
  if (datos.items.length === 0) return NextResponse.json({ ok: false, error: "Añade al menos una pieza" }, { status: 400 });
  for (const [i, it] of datos.items.entries()) {
    if (!it.descripcion.trim()) return NextResponse.json({ ok: false, error: `La descripción de la pieza ${i + 1} es obligatoria` }, { status: 400 });
    if (!datos.esGarantia && it.precioUnitario <= 0) return NextResponse.json({ ok: false, error: `El precio de la pieza ${i + 1} debe ser mayor que 0` }, { status: 400 });
  }

  try {
    // ── Modo garantía: sin saga fiscal ──────────────────────────────────
    if (datos.esGarantia) {
      await registrarClienteVenta(usuario, datos);
      const itemsVenta = datos.items.map((it) => ({ descripcion: it.descripcion.trim(), costo: 0, precio: 0 }));
      const resVenta = await kelatosApiPost<{ ok: boolean; venta_id: string }>("/v1/ventas", {
        requestId,
        usuario,
        es_garantia: true,
        cliente_nombre: datos.clienteNombre.trim(),
        cliente_telefono: datos.clienteTelefono.trim(),
        cliente_email: datos.clienteEmail.trim(),
        observaciones: datos.observaciones.trim(),
        items: itemsVenta,
      });
      const resultado: ResultadoNuevoPedido = { ventaId: resVenta.venta_id, numeroFactura: "", urlPdf: "" };
      return NextResponse.json({ ok: true, ...resultado });
    }

    // ── Modo normal: reservar número real + generar PDF + crear venta ───
    if (!datos.formaPago) return NextResponse.json({ ok: false, error: "Selecciona la forma de pago" }, { status: 400 });
    if (datos.formaPago === "tarjeta" && !datos.banco) return NextResponse.json({ ok: false, error: "Selecciona el banco" }, { status: 400 });

    await registrarClienteVenta(usuario, datos);

    const descuentoPct = Math.min(100, Math.max(0, Number(datos.descuentoPct) || 0));
    const lineas = datos.items.map((it) => ({
      descripcion: it.descripcion.trim(),
      cantidad: it.cantidad,
      precio: it.precioUnitario,
      descuento: descuentoPct,
    }));

    const payloadHash = crypto.createHash("sha256").update(JSON.stringify({ tipo: "pedido", lineas })).digest("hex");
    const preparar = await kelatosApiPost<{ ok: boolean; numeroFactura: string }>("/v1/facturas/entidades/preparar", {
      requestId,
      usuario,
      tipo: "pedido",
      payloadHash,
      datos: { lineas },
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
          cliente: {
            nombre: datos.clienteNombre.trim(),
            dni: datos.clienteDni.trim(),
            telefono: datos.clienteTelefono.trim(),
            email: datos.clienteEmail.trim(),
            direccion: datos.clienteDireccion.trim(),
            codigo: "",
          },
          formaPago: datos.formaPago,
          banco: datos.formaPago === "tarjeta" ? datos.banco : "",
          lineas,
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

    // El original guarda cada item con el precio ANTES de aplicar el
    // descuento (el descuento solo afecta a las líneas de la factura, no
    // a los items de la venta) — se replica esa misma inconsistencia real.
    const metodoPagoFinal = datos.formaPago === "tarjeta" && datos.banco ? `${datos.banco} · Tarjeta bancaria` : LABELS_PAGO[datos.formaPago] || datos.formaPago;
    const itemsVenta = datos.items.map((it) => ({ descripcion: it.descripcion.trim(), costo: 0, precio: it.cantidad * it.precioUnitario }));

    let resVenta: { ok: boolean; venta_id: string };
    try {
      resVenta = await kelatosApiPost<{ ok: boolean; venta_id: string }>("/v1/ventas", {
        requestId,
        usuario,
        es_garantia: false,
        cliente_nombre: datos.clienteNombre.trim(),
        cliente_telefono: datos.clienteTelefono.trim(),
        cliente_email: datos.clienteEmail.trim(),
        observaciones: datos.observaciones.trim(),
        numero_factura: preparar.numeroFactura,
        metodo_pago: metodoPagoFinal,
        items: itemsVenta,
      });
    } catch (errorVenta) {
      const mensaje = errorVenta instanceof Error ? errorVenta.message : "Error desconocido creando la venta";
      return NextResponse.json({
        ok: false,
        error: `La factura ${preparar.numeroFactura} ya se generó (PDF: ${generado.url}) pero no se pudo registrar el pedido: ${mensaje}. Reintenta — el mismo requestId no reservará un número nuevo.`,
      }, { status: 502 });
    }

    try {
      await kelatosApiPost("/v1/facturas/entidades/confirmar", { requestId, usuario, urlPdf: generado.url, entidadId: resVenta.venta_id });
    } catch (errorConfirmar) {
      console.error("No se pudo confirmar la reserva fiscal del pedido (resultado desconocido):", errorConfirmar);
    }

    const resultado: ResultadoNuevoPedido = { ventaId: resVenta.venta_id, numeroFactura: preparar.numeroFactura, urlPdf: generado.url };
    return NextResponse.json({ ok: true, ...resultado });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
