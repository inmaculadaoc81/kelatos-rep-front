import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

// Configurable por env var (con el valor real de producción como
// predeterminado) para poder apuntar a un servidor local en pruebas sin
// arriesgarse a llamar al webhook real de n8n por accidente.
const N8N_PRESUPUESTO_WEBHOOK = process.env.N8N_PRESUPUESTO_WEBHOOK_URL
  || "https://sswebhookss.affirmatechnology.com/webhook/kelatos-enviar-presupuesto-whatsapp";
const PRECIO_REVISION = 20;

interface PresupuestoEnvio {
  numeroPresupuesto: string;
  opcion: string;
  manoObra: number;
  totalConIva: number;
  descripcion: string;
  diasEntrega: number;
  tipoPieza: string;
  piezas: { descripcion: string; precio: number }[];
}

interface ReparacionEnvio {
  resguardo: string;
  clienteNombre: string;
  clienteTelefono: string;
  equipoModelo: string;
  sintoma: string;
  revisionPagada: boolean;
  presupuestosModo: string;
}

/**
 * Reproduce enviarPresupuestosWhatsAppSql() (Code.js) exactamente: mismo
 * webhook, mismo payload, mismo orden de líneas (mano de obra, piezas con
 * precio > 0, descuento de revisión pagada). El original ejecuta este POST
 * DESDE Apps Script, entre iniciar-envio y confirmar-envio del mismo saga
 * SQL que ya existía aquí — este endpoint reproduce ese mismo orden.
 */
function construirLineasWhatsApp(p: PresupuestoEnvio, revisionPagada: boolean): { descripcion: string; precio: number }[] {
  const lineas: { descripcion: string; precio: number }[] = [];
  if (p.manoObra > 0) lineas.push({ descripcion: "Mano de obra", precio: p.manoObra });
  for (const pz of p.piezas || []) {
    const precio = Number(pz.precio) || 0;
    if (precio > 0 && pz.descripcion) lineas.push({ descripcion: pz.descripcion, precio });
  }
  if (revisionPagada && PRECIO_REVISION > 0) {
    lineas.push({ descripcion: "Dto. revisión pagada", precio: -PRECIO_REVISION });
  }
  return lineas;
}

async function enviarPorWhatsApp(
  resguardo: string,
  requestId: string,
  modo: string,
  rep: ReparacionEnvio,
  presupuestos: PresupuestoEnvio[]
): Promise<{ ok: true } | { ok: false; error: string; incierto: boolean }> {
  const telefono = (rep.clienteTelefono || "").trim();
  if (!telefono) return { ok: false, error: "El cliente no tiene teléfono registrado", incierto: false };
  const telNorm = telefono.startsWith("+") ? telefono : "+34" + telefono.replace(/\D/g, "");

  const presupuestosPayload = presupuestos.map((p) => ({
    numero_presupuesto: p.numeroPresupuesto,
    opcion: p.opcion,
    total: p.totalConIva,
    descripcion: p.descripcion,
    diasEntrega: p.diasEntrega,
    tipoPieza: p.tipoPieza,
    lineas: construirLineasWhatsApp(p, rep.revisionPagada),
  }));

  const token = process.env.N8N_WEBHOOK_TOKEN;
  if (!token) return { ok: false, error: "Falta configurar N8N_WEBHOOK_TOKEN en el servidor", incierto: false };

  try {
    const resp = await fetch(N8N_PRESUPUESTO_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        resguardo,
        nombre: rep.clienteNombre || "",
        telefono: telNorm,
        equipo: rep.equipoModelo || "",
        averia: rep.sintoma || "",
        modo,
        presupuestos: presupuestosPayload,
        requestId,
        eventId: requestId,
      }),
    });
    if (!resp.ok) {
      const texto = await resp.text().catch(() => "");
      return { ok: false, error: `Error al contactar con n8n (${resp.status}): ${texto.slice(0, 200)}`, incierto: false };
    }
    return { ok: true };
  } catch (error) {
    // Error de red/timeout: resultado AMBIGUO (no se sabe si n8n procesó el
    // mensaje) — igual que el original, NO se llama a fallar-envio aquí; el
    // registro queda en "enviando" y una próxima llamada a iniciar-envio lo
    // detectará como resultado_desconocido en vez de reintentar solo.
    const mensaje = error instanceof Error ? error.message : "Error desconocido";
    return { ok: false, error: `Error de red al contactar con n8n: ${mensaje}`, incierto: true };
  }
}

/**
 * Orquesta el saga completo de envío de presupuestos (preparar-envio →
 * iniciar-envio → [WhatsApp: POST real a n8n] → confirmar-envio) en una
 * sola llamada — mismo patrón que /api/reparaciones/[resguardo]/facturas/
 * route.ts. El backend decide qué presupuestos van (todos los "borrador"
 * de la reparación si no se especifican IDs) y genera/envía el email real
 * (canal "email") o hace la llamada real a WhatsApp vía n8n (canal
 * "whatsapp", mismo webhook y payload que usaba Apps Script).
 *
 * El requestId lo genera y conserva el CLIENTE, igual que el resto de
 * sagas de este proyecto, para que un reintento tras un fallo de red
 * reutilice la preparación ya hecha en vez de reservar números nuevos.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ resguardo: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;
  const body = (await req.json()) as { requestId: string; canal: "email" | "whatsapp"; modo?: string };
  const { requestId, canal, modo } = body;

  if (!requestId || !/^[0-9a-f-]{36}$/i.test(requestId)) {
    return NextResponse.json({ ok: false, error: "requestId inválido" }, { status: 400 });
  }
  if (canal !== "email" && canal !== "whatsapp") {
    return NextResponse.json({ ok: false, error: "canal debe ser 'email' o 'whatsapp'" }, { status: 400 });
  }

  try {
    await kelatosApiPost(`/v1/reparaciones/${encodeURIComponent(resguardo)}/presupuestos/preparar-envio`, {
      requestId, usuario, canal,
    });

    const iniciar = await kelatosApiPost<{
      ok: boolean; estado: string;
      presupuestos: PresupuestoEnvio[];
      reparacion: ReparacionEnvio;
    }>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/presupuestos/iniciar-envio`,
      { requestId, usuario, canal }
    );
    if (iniciar.estado === "resultado_desconocido") {
      return NextResponse.json({
        ok: false,
        error: "Un intento anterior quedó en un estado incierto. No se reintenta automáticamente — contacta con soporte para reconciliarlo manualmente."
      }, { status: 409 });
    }

    if (canal === "whatsapp") {
      const modoFinal = modo || iniciar.reparacion.presupuestosModo || "alternativas";
      const envio = await enviarPorWhatsApp(resguardo, requestId, modoFinal, iniciar.reparacion, iniciar.presupuestos);
      if (!envio.ok) {
        if (!envio.incierto) {
          await kelatosApiPost(`/v1/reparaciones/${encodeURIComponent(resguardo)}/presupuestos/fallar-envio`, {
            requestId, usuario, canal, error: envio.error.slice(0, 300),
          }).catch(() => { /* best-effort */ });
        }
        return NextResponse.json({ ok: false, error: envio.error }, { status: 502 });
      }
    }

    const confirmar = await kelatosApiPost<{
      ok: boolean;
      presupuestos: unknown[];
      reparacion: Record<string, unknown>;
    }>(`/v1/reparaciones/${encodeURIComponent(resguardo)}/presupuestos/confirmar-envio`, {
      requestId, usuario, canal, modo,
    });

    return NextResponse.json({ ok: true, presupuestos: confirmar.presupuestos, reparacion: confirmar.reparacion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
