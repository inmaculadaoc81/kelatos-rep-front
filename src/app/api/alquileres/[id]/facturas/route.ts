import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import type { SolicitudFacturaAlquiler, ResultadoFacturaAlquiler, LineaFacturaAlquiler } from "@/lib/alquiler-factura";

interface FilaAlquilerSql {
  equipo_id: string | null;
  numero_factura: string | null;
  url_factura: string | null;
  total_cobrado: string | number | null;
  total_previsto: string | number | null;
  total_factura_inicial: string | number | null;
  fianza_cobrada: string | number | null;
  meses: number | null;
  semanas: number | null;
  dias: number | null;
  precio_dia: string | number | null;
  precio_semana: string | number | null;
  precio_mes: string | number | null;
  fecha_inicio: string | null;
  numero_factura_rectificativa: string | null;
  numero_factura_inicial: string | null;
  numero_factura_corregida: string | null;
  estado_factura: string | null;
}

function derivarUuidHijo(uuidPadre: string, sufijo: string): string {
  const hex = crypto.createHash("sha256").update(`${uuidPadre}:${sufijo}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function fechaHoyEs(): string {
  return new Date().toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function lineasAlquiler(equipoNombre: string, meses: number, semanas: number, dias: number, signo: 1 | -1, tarifas: { precioDia: number; precioSemana: number; precioMes: number }): LineaFacturaAlquiler[] {
  const lineas: LineaFacturaAlquiler[] = [];
  if (meses > 0) lineas.push({ descripcion: `Alquiler ${equipoNombre} (${meses} ${meses > 1 ? "meses" : "mes"})`, cantidad: signo * meses, precio: tarifas.precioMes });
  if (semanas > 0) lineas.push({ descripcion: `Alquiler ${equipoNombre} (${semanas} ${semanas > 1 ? "semanas" : "semana"})`, cantidad: signo * semanas, precio: tarifas.precioSemana });
  if (dias > 0) lineas.push({ descripcion: `Alquiler ${equipoNombre} (${dias} ${dias > 1 ? "días" : "día"})`, cantidad: signo * dias, precio: tarifas.precioDia });
  if (!lineas.length) lineas.push({ descripcion: `Alquiler ${equipoNombre}`, cantidad: signo, precio: 0 });
  return lineas;
}

/**
 * Orquesta el saga de facturación de la devolución de un alquiler —
 * reproduce apiGenerarRectificativaFianza()/apiGenerarFacturasAjusteDuracion()
 * del original, usando el saga genérico /v1/facturas/entidades/* que ya
 * existía en el backend sin ningún llamador (preparar/iniciar/generar-pdf)
 * más /v1/alquileres/facturas/confirmar (idem). Nunca libera un número ya
 * reservado si algo falla después — la numeración fiscal es irreversible.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  // TabDevolucionRectificativo/FaseCorregida (factura-acciones-tabs.tsx,
  // compartidos con reparaciones) mandan {requestId, tipo, datos:{...}} —
  // esta ruta históricamente leía los campos en plano (solicitud.cliente,
  // solicitud.formaPago...), así que alquiler_rectificativa (el tab
  // "Devolución" del modal de Facturas de Clientes) llegaba con cliente/
  // forma de pago/líneas vacíos sin que nada lo detectara (bug real: el PDF
  // de la rectificativa salía con el cliente en blanco). Se aceptan ambas
  // formas fusionando datos.* sobre el nivel superior.
  const raw = (await req.json()) as Record<string, unknown> & { datos?: Record<string, unknown> };
  const solicitud = { ...raw, ...(raw.datos && typeof raw.datos === "object" ? raw.datos : {}) } as SolicitudFacturaAlquiler & { requestId: string };
  if (!solicitud?.requestId || !/^[0-9a-f-]{36}$/i.test(solicitud.requestId)) {
    return NextResponse.json({ ok: false, error: "requestId inválido" }, { status: 400 });
  }

  try {
    const { alquiler: a } = await kelatosApiGet<{ ok: boolean; alquiler: FilaAlquilerSql }>(`/v1/alquileres/${encodeURIComponent(id)}`);

    const tarifas = { precioDia: num(a.precio_dia), precioSemana: num(a.precio_semana), precioMes: num(a.precio_mes) };
    const numOriginal = (a.numero_factura || "").trim();
    const fechaHoy = fechaHoyEs();

    // El modal genérico de Facturas de Clientes nunca conoce el nombre del
    // equipo (AlquilerFacturaDetalle no lo trae) — se resuelve aquí por
    // equipo_id solo cuando el llamador no lo manda ya (alquiler/
    // ajuste_duracion sí lo mandan desde sus propios diálogos).
    async function obtenerEquipoNombre(): Promise<string> {
      if (!a.equipo_id) return "Equipo";
      try {
        const { row } = await kelatosApiGet<{ ok: boolean; row: { marca?: string; modelo?: string } }>(`/v1/equipos/${encodeURIComponent(a.equipo_id)}`);
        return `${row.marca || ""} ${row.modelo || ""}`.trim() || "Equipo";
      } catch {
        return "Equipo";
      }
    }

    async function generarUnDocumento(opts: {
      tipo: string;
      requestId: string;
      lineasParaReserva: LineaFacturaAlquiler[];
      lineasParaPdf: LineaFacturaAlquiler[];
      fianza?: number;
      fianzaDescripcion?: string;
      rectificaDe?: string;
      estadoFactura?: string;
    }): Promise<{ numero: string; url: string; total: number }> {
      const preparar = await kelatosApiPost<{ ok: boolean; numeroFactura: string }>("/v1/facturas/entidades/preparar", {
        requestId: opts.requestId,
        usuario,
        tipo: opts.tipo,
        payloadHash: crypto.createHash("sha256").update(JSON.stringify({ tipo: opts.tipo, lineas: opts.lineasParaReserva })).digest("hex"),
        entidadId: id,
        datos: { lineas: opts.lineasParaReserva },
      });

      const iniciar = await kelatosApiPost<{ ok: boolean; operacion: { estado: string } }>("/v1/facturas/entidades/iniciar", {
        requestId: opts.requestId,
        usuario,
      });
      if (iniciar.operacion.estado === "resultado_desconocido") {
        throw new Error(
          `El número ${preparar.numeroFactura} quedó en un estado incierto en un intento anterior. No se ha generado un PDF nuevo para evitar duplicar el número — contacta con soporte para reconciliarlo manualmente.`
        );
      }

      let generado;
      try {
        generado = await kelatosApiPost<{ ok: boolean; url: string; fileId: string; total: number }>("/v1/facturas/entidades/generar-pdf", {
          datos: {
            numero: preparar.numeroFactura,
            fecha: fechaHoy,
            rectificaDe: opts.rectificaDe || "",
            cliente: solicitud.cliente,
            formaPago: solicitud.formaPago,
            banco: solicitud.banco || "",
            lineas: opts.lineasParaPdf,
            fianza: opts.fianza || 0,
            fianzaDescripcion: opts.fianzaDescripcion || "",
            estadoFactura: opts.estadoFactura || "",
          },
        });
      } catch (errorPdf) {
        const mensaje = errorPdf instanceof Error ? errorPdf.message : "Error desconocido generando el PDF";
        await kelatosApiPost("/v1/facturas/entidades/fallar", { requestId: opts.requestId, errorTecnico: mensaje.slice(0, 500) }).catch(() => {});
        throw new Error(`El número de factura ${preparar.numeroFactura} ya ha sido reservado y no se puede reutilizar. Error generando el PDF: ${mensaje}`);
      }

      return { numero: preparar.numeroFactura, url: generado.url, total: generado.total };
    }

    if (solicitud.tipo === "alquiler") {
      const lineas = lineasAlquiler(solicitud.equipoNombre, a.meses || 0, a.semanas || 0, a.dias || 0, 1, tarifas);
      const fianza = num(a.fianza_cobrada);
      if (fianza > 0) lineas.push({ descripcion: "Fianza", cantidad: 1, precio: fianza });
      if (solicitud.envioLinea !== undefined) lineas.push({ descripcion: "Envío a domicilio", cantidad: 1, precio: solicitud.envioLinea });
      if (solicitud.recogidaLinea !== undefined) lineas.push({ descripcion: "Recogida a domicilio", cantidad: 1, precio: solicitud.recogidaLinea });

      const doc = await generarUnDocumento({
        tipo: "alquiler",
        requestId: solicitud.requestId,
        lineasParaReserva: lineas,
        lineasParaPdf: lineas,
        // Sin esto el PDF caía siempre al "Pendiente" por defecto de
        // generarFacturaPdfDesdeSheet() aunque se eligiera "Cobrada" en el
        // paso 2 de "Nuevo Alquiler" — solo se guardaba bien en BD (columnas
        // más abajo), nunca se imprimía en el documento real.
        estadoFactura: solicitud.estadoFactura || "Pendiente",
      });

      await kelatosApiPost(`/v1/alquileres/facturas/confirmar`, {
        requestId: solicitud.requestId,
        usuario,
        dryRun: false,
        urlPdf: doc.url,
        alquilerId: id,
        columnas: {
          numero_factura: doc.numero, url_factura: doc.url, total_cobrado: doc.total,
          estado_factura: solicitud.estadoFactura || "Pendiente",
          cliente_factura: JSON.stringify(solicitud.cliente),
        },
      });

      const resultado: ResultadoFacturaAlquiler = { numeroFactura: doc.numero, url: doc.url };
      return NextResponse.json({ ok: true, ...resultado });
    }

    if (solicitud.tipo === "rectificativa_fianza") {
      const fianza = num(a.fianza_cobrada);
      if (fianza <= 0) return NextResponse.json({ ok: false, error: "Este alquiler no tiene fianza registrada" }, { status: 400 });

      const fechaOrig = a.fecha_inicio ? new Date(a.fecha_inicio).toLocaleDateString("es-ES") : "";
      const doc = await generarUnDocumento({
        tipo: "alquiler_rectificativa_fianza",
        requestId: solicitud.requestId,
        lineasParaReserva: [{ descripcion: "Devolución fianza", cantidad: 1, precio: fianza }],
        lineasParaPdf: [],
        fianza: -fianza,
        fianzaDescripcion: `Devolución fianza — ${solicitud.equipoNombre}`,
        rectificaDe: `Rectifica La factura ${numOriginal}${fechaOrig ? ` emitida el ${fechaOrig}` : ""}`,
      });

      await kelatosApiPost(`/v1/alquileres/facturas/confirmar`, {
        requestId: solicitud.requestId,
        usuario,
        dryRun: false,
        urlPdf: doc.url,
        alquilerId: id,
        columnas: {
          numero_factura_rectificativa: doc.numero, url_factura_rectificativa: doc.url, total_factura_rectificativa: -fianza,
          cliente_factura: JSON.stringify(solicitud.cliente),
        },
      });

      const resultado: ResultadoFacturaAlquiler = { numeroFactura: doc.numero, url: doc.url };
      return NextResponse.json({ ok: true, ...resultado });
    }

    if (solicitud.tipo === "alquiler_rectificativa") {
      // Guard de _apiGenerarDevolucionAlquilerModal(): bloquea solo si la
      // rectificativa existente es de una devolución anterior — no si ya
      // hay una corregida (factura nueva, ciclo distinto) ni si el
      // alquiler viene de un ajuste de duración ya cerrado.
      const rectExistente = (a.numero_factura_rectificativa || "").trim();
      const corrExistente = (a.numero_factura_corregida || "").trim();
      const esPostAjuste = !!(a.numero_factura_inicial || "").trim();
      if (!esPostAjuste && !corrExistente && rectExistente) {
        return NextResponse.json({ ok: false, error: `Ya existe una rectificativa para este alquiler: ${rectExistente}` }, { status: 409 });
      }

      const equipoNombreRect = solicitud.equipoNombre || (await obtenerEquipoNombre());
      const lineasRect = lineasAlquiler(equipoNombreRect, a.meses || 0, a.semanas || 0, a.dias || 0, -1, tarifas);
      const fechaOrig = a.fecha_inicio ? new Date(a.fecha_inicio).toLocaleDateString("es-ES") : "";
      const doc = await generarUnDocumento({
        tipo: "alquiler_rectificativa",
        requestId: solicitud.requestId,
        lineasParaReserva: lineasRect,
        lineasParaPdf: lineasRect,
        rectificaDe: `Rectifica La factura ${numOriginal}${fechaOrig ? ` emitida el ${fechaOrig}` : ""}`,
        estadoFactura: "Devolución",
      });

      await kelatosApiPost(`/v1/alquileres/facturas/confirmar`, {
        requestId: solicitud.requestId,
        usuario,
        dryRun: false,
        urlPdf: doc.url,
        alquilerId: id,
        columnas: {
          numero_factura_rectificativa: doc.numero, url_factura_rectificativa: doc.url, total_factura_rectificativa: doc.total,
          cliente_factura: JSON.stringify(solicitud.cliente),
        },
      });

      const resultado: ResultadoFacturaAlquiler = { numeroFactura: doc.numero, url: doc.url };
      return NextResponse.json({ ok: true, ...resultado });
    }

    if (solicitud.tipo === "alquiler_corregida") {
      // _apiGenerarFacturaCorregidaAlquiler() (Code.js:9739): exige que ya
      // exista una rectificativa vigente antes de poder corregir.
      const rectExistente = (a.numero_factura_rectificativa || "").trim();
      if (!rectExistente) {
        return NextResponse.json({ ok: false, error: "Primero genera la factura rectificativa" }, { status: 409 });
      }
      const lineasCorr: LineaFacturaAlquiler[] = Array.isArray(solicitud.lineas) ? solicitud.lineas : [];
      if (!lineasCorr.length) {
        return NextResponse.json({ ok: false, error: "Añade al menos un concepto" }, { status: 400 });
      }

      // Detecta meses/semanas/días corregidos a partir de las líneas de la
      // corregida (Code.js:9807-9817) — "garantiza que la siguiente
      // rectificativa use los datos correctos de la corregida": si más
      // adelante se devuelve el equipo (ajuste de duración), ese flujo lee
      // estas mismas columnas, así que deben quedar ya corregidas aquí.
      let mesesCorr = 0, semanasCorr = 0, diasCorr = 0;
      for (const l of lineasCorr) {
        const desc = (l.descripcion || "").toLowerCase();
        const cant = Math.abs(Number(l.cantidad) || 0);
        if (/\bmes(es)?\b/.test(desc)) mesesCorr = cant;
        else if (/\bsemana(s)?\b/.test(desc)) semanasCorr = cant;
        else if (/\bd[ií]a(s)?\b/.test(desc)) diasCorr = cant;
      }

      const corrLegacy = (a.numero_factura_corregida || "").trim();
      const numOrigFact = corrLegacy || numOriginal;
      const prevNum = (a.numero_factura || "").trim();
      const prevUrl = a.url_factura || "";
      const prevTotal = num(a.total_cobrado);

      const doc = await generarUnDocumento({
        tipo: "alquiler_corregida",
        requestId: solicitud.requestId,
        lineasParaReserva: lineasCorr,
        lineasParaPdf: lineasCorr,
        rectificaDe: `Factura corregida. Sustituye a: ${numOrigFact}`,
        estadoFactura: solicitud.estadoFactura || "",
      });

      await kelatosApiPost(`/v1/alquileres/facturas/confirmar`, {
        requestId: solicitud.requestId,
        usuario,
        dryRun: false,
        urlPdf: doc.url,
        alquilerId: id,
        columnas: {
          numero_factura: doc.numero, url_factura: doc.url, total_cobrado: doc.total,
          numero_factura_rectificativa: "", url_factura_rectificativa: "", total_factura_rectificativa: null,
          numero_factura_corregida: "", url_factura_corregida: "", total_factura_corregida: null,
          ...(prevNum ? { numero_factura_anterior: prevNum, url_factura_anterior: prevUrl, total_factura_anterior: prevTotal } : {}),
          ...(mesesCorr > 0 || semanasCorr > 0 || diasCorr > 0 ? { meses: mesesCorr, semanas: semanasCorr, dias: diasCorr } : {}),
          ...(solicitud.estadoFactura ? { estado_factura: solicitud.estadoFactura } : {}),
          cliente_factura: JSON.stringify(solicitud.cliente),
        },
      });

      const resultado: ResultadoFacturaAlquiler = { numeroFactura: doc.numero, url: doc.url };
      return NextResponse.json({ ok: true, ...resultado });
    }

    // tipo === "ajuste_duracion"
    const mesesOrig = a.meses || 0;
    const semanasOrig = a.semanas || 0;
    const diasOrig = a.dias || 0;
    const fianza = num(a.fianza_cobrada);
    const requestIdRect = derivarUuidHijo(solicitud.requestId, "ajuste_rect");
    const requestIdNueva = derivarUuidHijo(solicitud.requestId, "ajuste_nueva");
    const fechaOrig = a.fecha_inicio ? new Date(a.fecha_inicio).toLocaleDateString("es-ES") : "";

    const lineasRect = lineasAlquiler(solicitud.equipoNombre, mesesOrig, semanasOrig, diasOrig, -1, tarifas);
    const docRect = await generarUnDocumento({
      tipo: "alquiler_ajuste_rectificativa",
      requestId: requestIdRect,
      lineasParaReserva: lineasRect,
      lineasParaPdf: lineasRect,
      fianza: fianza > 0 ? -fianza : 0,
      rectificaDe: `Rectifica La factura ${numOriginal}${fechaOrig ? ` emitida el ${fechaOrig}` : ""}`,
    });

    await kelatosApiPost(`/v1/alquileres/facturas/confirmar`, {
      requestId: requestIdRect, usuario, dryRun: false, urlPdf: docRect.url, alquilerId: id, columnas: {},
    });

    const { meses: mesesReal, semanas: semanasReal, dias: diasReal } = solicitud.duracionReal;
    const lineasNueva = lineasAlquiler(solicitud.equipoNombre, mesesReal, semanasReal, diasReal, 1, tarifas);
    const docNueva = await generarUnDocumento({
      tipo: "alquiler_ajuste_nueva",
      requestId: requestIdNueva,
      lineasParaReserva: lineasNueva,
      lineasParaPdf: lineasNueva,
      // Mismo bug que en "alquiler": el estado elegido en el paso de ajuste
      // (devolver-alquiler-dialog.tsx) solo llegaba a la columna estado_factura
      // (columnas más abajo), nunca al PDF impreso.
      estadoFactura: solicitud.estadoFactura || (a.estado_factura || "").trim() || "Pendiente",
    });

    const totalNuevo = docNueva.total;
    const fianzaDevuelta = Math.max(0, fianza);
    const yaTieneInicialORectificativa = !!(a.numero_factura_inicial || "").trim() || !!(a.numero_factura_rectificativa || "").trim();
    const totalInicialPrevio = num(a.total_factura_inicial) || num(a.total_cobrado) || 0;

    await kelatosApiPost(`/v1/alquileres/facturas/confirmar`, {
      requestId: requestIdNueva,
      usuario,
      dryRun: false,
      urlPdf: docNueva.url,
      alquilerId: id,
      columnas: {
        numero_factura: docNueva.numero,
        url_factura: docNueva.url,
        numero_factura_rectificativa: docRect.numero,
        url_factura_rectificativa: docRect.url,
        total_cobrado: totalNuevo,
        total_factura_rectificativa: docRect.total,
        fianza_devuelta: fianzaDevuelta,
        estado_factura: solicitud.estadoFactura || (a.estado_factura || "").trim() || "Pendiente",
        meses: mesesReal,
        semanas: semanasReal,
        dias: diasReal,
        cliente_factura: JSON.stringify(solicitud.cliente),
        ...(!yaTieneInicialORectificativa
          ? { numero_factura_inicial: numOriginal, url_factura_inicial: a.url_factura || "", total_factura_inicial: totalInicialPrevio }
          : {}),
      },
    });

    const resultado: ResultadoFacturaAlquiler = {
      rectificativa: { numero: docRect.numero, url: docRect.url },
      nueva: { numero: docNueva.numero, url: docNueva.url },
      totalNuevo,
      fianzaDevuelta,
    };
    return NextResponse.json({ ok: true, ...resultado });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
