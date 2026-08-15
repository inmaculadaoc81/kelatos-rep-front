import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import type { ClienteFactura, LineaFactura } from "@/lib/factura";

function fechaHoyEs(): string {
  return new Date().toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });
}

const TIPOS_VALIDOS = new Set(["manual_rectificativa", "manual_corregida"]);

/**
 * Reproduce mfaGenerarRectificativa()/_mfaAbrirFacturaCorregidaModal() en
 * su rama _esManualRect/_esManualCorr (apiGenerarDevolucionManual/
 * apiGenerarFacturaCorregidaManual del original) — misma forma de payload
 * que /api/reparaciones/:resguardo/facturas (para poder reutilizar
 * TabDevolucionRectificativo/FaseCorregida tal cual, solo cambiando la URL
 * a la que postean), pero orquestando el saga genérico de entidades
 * (/v1/facturas/entidades/*, entidadId = id de la factura manual) en vez
 * del saga con resguardo de reparación, y confirmando en
 * /v1/facturas-manuales/confirmar (ya existente, sin llamador hasta ahora).
 *
 * A diferencia de las reparaciones (sesión anterior: encadenamiento
 * indefinido rectificativa→corregida→rectificativa→...), aquí se mantiene
 * el límite de UN solo ciclo del original — facturas_manuales no guarda
 * fecha_factura_corregida, así que no hay forma de derivar de forma fiable
 * si un ciclo está "cerrado" para permitir uno nuevo; el guard del backend
 * (_validarGuardCorregidaTx-equivalente en /v1/facturas/entidades/preparar)
 * ya bloquea una segunda corregida igual que el original.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as {
    requestId: string;
    tipo: string;
    datos: {
      cliente?: ClienteFactura;
      formaPago?: string;
      banco?: string;
      motivo?: string;
      lineas: LineaFactura[];
      tipoDocumento?: string;
      rectificaDe?: string;
      estadoFactura?: string;
    };
  };
  const { requestId, tipo, datos } = body;

  if (!requestId || !/^[0-9a-f-]{36}$/i.test(requestId)) {
    return NextResponse.json({ ok: false, error: "requestId inválido" }, { status: 400 });
  }
  if (!TIPOS_VALIDOS.has(tipo)) {
    return NextResponse.json({ ok: false, error: `tipo debe ser uno de: ${[...TIPOS_VALIDOS].join(", ")}` }, { status: 400 });
  }
  if (!datos?.lineas?.length) {
    return NextResponse.json({ ok: false, error: "Debe incluir al menos una línea de factura" }, { status: 400 });
  }

  const payloadHash = crypto.createHash("sha256").update(JSON.stringify({ tipo, lineas: datos.lineas })).digest("hex");

  try {
    const preparar = await kelatosApiPost<{ ok: boolean; numeroFactura: string }>("/v1/facturas/entidades/preparar", {
      requestId, usuario, tipo, entidadId: id, payloadHash, datos: { lineas: datos.lineas },
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
          cliente: datos.cliente || {},
          formaPago: datos.formaPago || "",
          banco: datos.banco || "",
          lineas: datos.lineas,
          tipoDocumento: datos.tipoDocumento || "",
          rectificaDe: datos.rectificaDe || "",
          // Mismo bug que en la factura manual normal: sin esto el PDF
          // siempre caía al estado por defecto de generarFacturaPdfDesdeSheet()
          // en vez del elegido en el modal.
          estadoFactura: datos.estadoFactura || "",
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

    await kelatosApiPost("/v1/facturas-manuales/confirmar", {
      requestId, usuario, urlPdf: generado.url,
      datosFactura: {
        motivo: datos.motivo || "",
        cliente: datos.cliente || {},
        lineas: datos.lineas,
        formaPago: datos.formaPago || "",
        banco: datos.banco || "",
        estadoFactura: datos.estadoFactura || "",
      },
    });

    return NextResponse.json({ ok: true, numeroFactura: preparar.numeroFactura, url: generado.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
