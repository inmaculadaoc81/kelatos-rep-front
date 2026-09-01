"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DocumentDownload, DocumentText, Send2, Refresh2, ArrowRight2, TickCircle, InfoCircle, Add, Trash,
  Building, Profile, Receipt, CloseCircle, SearchNormal1, Box1,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { ReparacionDetalle } from "@/lib/reparacion-detalle";
import type { LineaFactura } from "@/lib/factura";
import { esEmailValido } from "@/lib/validacion";
import type { Cliente } from "@/lib/clientes";
import { BuscarClienteDialog } from "@/components/buscar-cliente-dialog";
import { BuscarPiezaStockDialog } from "./buscar-pieza-stock-dialog";
import type { StockPieza } from "@/lib/stock-piezas";
import { useConfirm } from "@/components/confirm-provider";
import { guardarSuReferencia } from "@/lib/su-referencia";

export type TipoFacturaBase =
  | "normal" | "revision" | "mensajeria" | "anticipo"
  | "rectificativa" | "rectificativa_revision" | "corregida" | "corregida_revision"
  | "ticket" | "rectificativa_ticket" | "corregida_ticket"
  | "ticket_revision" | "rectificativa_ticket_revision" | "corregida_ticket_revision";

// vfPago (#modalVistaFactura, usado por FaseCorregida): 4 opciones, sin
// Redsys. mfaRectFormaPago/mfaRtvFormaPago (tabs Devolución/Rectificativo):
// 5 opciones, con Redsys — son selects distintos en el original, no el
// mismo reutilizado.
export const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta bancaria" },
  { value: "transferencia", label: "Transferencia bancaria" },
  { value: "bizum", label: "Bizum" },
];
const METODOS_PAGO_RECT = [...METODOS_PAGO, { value: "redsys", label: "Redsys" }];
export const BANCOS = ["Santander", "Sabadell", "BBVA", "CaixaBank"];

// Mismos colores/etiquetas que tipoBadgeMap en _mfaRenderResumen (Index.html)
// — "corregida" tampoco tiene entrada ahí (tipoBadgeMap[tipo] || '' queda en
// blanco), se replica exactamente: sin insignia para corregida/corregida_revision.
export const TIPO_BADGE: Record<TipoFacturaBase, { label: string; className: string } | null> = {
  normal: { label: "Reparación", className: "bg-[#0d6efd] text-white" },
  revision: { label: "Revisión Pagada", className: "bg-[#fd7e14] text-white" },
  mensajeria: { label: "Mensajería", className: "bg-[#0dcaf0] text-black" },
  anticipo: { label: "Anticipo", className: "bg-secondary text-secondary-foreground" },
  rectificativa: { label: "Rectificativa", className: "bg-destructive text-white" },
  rectificativa_revision: { label: "Rectificativa", className: "bg-destructive text-white" },
  corregida: null,
  corregida_revision: null,
  ticket: { label: "Ticket", className: "bg-[#20c997] text-white" },
  rectificativa_ticket: { label: "Rectificativa", className: "bg-destructive text-white" },
  corregida_ticket: null,
  ticket_revision: { label: "Revisión Pagada", className: "bg-[#fd7e14] text-white" },
  rectificativa_ticket_revision: { label: "Rectificativa", className: "bg-destructive text-white" },
  corregida_ticket_revision: null,
};

// Igual que _mfaRenderResumen(): el total de cabecera siempre se muestra CON
// IVA (×1.21), aunque lo guardado en BD sea la base — para todos los tipos.
export function euros(n: number): string {
  return (n || 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

interface DatosFacturaDerivados {
  numeroFactura: string;
  urlFactura: string;
  totalConIva: number;
  clienteNombre: string;
  clienteEmailDefault: string;
  lineasOriginales: LineaFactura[];
  rectificativa: { numeroFactura: string; urlFactura: string } | null;
  corregida: { numeroFactura: string; urlFactura: string } | null;
  tipoRect: string;
  tipoCorr: string;
  tipoCombinado: string;
  /** El original nunca implementó devolución/rectificativa para anticipo
      (apiGenerarDevolucion no tiene rama 'anticipo') — se replica esa misma
      limitación real, no es un hueco de la migración. */
  permiteDevolucion: boolean;
  /** Cliente de la factura original — se copia tal cual a la rectificativa
      (mfaGenerarRectificativa/mfaRtvGenerarRect) y se precarga editable en
      la factura corregida (_mfaAbrirFacturaCorregidaModal). */
  clienteOriginal: { nombre: string; direccion: string; dni: string; telefono: string };
  /** _mfaFormaPagoOriginal(): forma de pago de la factura original, precargada
      en el selector de la rectificativa y de la corregida. */
  formaPagoOriginal: string;
}

function clienteOriginalDe(
  doc: { nombre: string; direccion: string; dni: string; telefono: string; email: string } | null,
  detalle: ReparacionDetalle
): { nombre: string; direccion: string; dni: string; telefono: string } {
  return {
    nombre: doc?.nombre || detalle.cliente.nombre || "",
    direccion: doc?.direccion || detalle.cliente.direccion || "",
    dni: doc?.dni || detalle.dniCif || "",
    telefono: doc?.telefono || detalle.cliente.telefono || "",
  };
}

export function derivarDatosFactura(detalle: ReparacionDetalle, tipoBase: TipoFacturaBase): DatosFacturaDerivados {
  if (tipoBase === "mensajeria") {
    return {
      numeroFactura: detalle.numeroFacturaMensajeria,
      urlFactura: detalle.urlFacturaMensajeria,
      totalConIva: detalle.totalFacturaMensajeria * 1.21,
      clienteNombre: detalle.clienteFacturaMensajeria?.nombre || detalle.cliente.nombre || "",
      clienteEmailDefault: detalle.clienteFacturaMensajeria?.email || detalle.cliente.email || "",
      lineasOriginales: [{ descripcion: "Envío por mensajería", cantidad: 1, precio: detalle.totalFacturaMensajeria }],
      rectificativa: detalle.rectificativa, corregida: detalle.corregida,
      tipoRect: "rectificativa", tipoCorr: "corregida", tipoCombinado: "combinado",
      permiteDevolucion: true,
      clienteOriginal: clienteOriginalDe(detalle.clienteFacturaMensajeria, detalle),
      formaPagoOriginal: detalle.formaPago,
    };
  }
  if (tipoBase === "ticket") {
    return {
      numeroFactura: detalle.numeroTicket,
      urlFactura: detalle.urlTicket,
      totalConIva: detalle.totalTicket * 1.21,
      clienteNombre: detalle.cliente.nombre || "",
      clienteEmailDefault: detalle.clienteEmailTicket || detalle.cliente.email || "",
      lineasOriginales: detalle.lineasTicket,
      rectificativa: detalle.ticketRectificativa
        ? { numeroFactura: detalle.ticketRectificativa.numeroFactura, urlFactura: detalle.ticketRectificativa.urlFactura }
        : null,
      corregida: detalle.ticketCorregida
        ? { numeroFactura: detalle.ticketCorregida.numeroFactura, urlFactura: detalle.ticketCorregida.urlFactura }
        : null,
      tipoRect: "rectificativa_ticket", tipoCorr: "corregida_ticket", tipoCombinado: "",
      permiteDevolucion: true,
      clienteOriginal: clienteOriginalDe(null, detalle),
      formaPagoOriginal: detalle.formaPagoTicket,
    };
  }
  if (tipoBase === "ticket_revision") {
    return {
      numeroFactura: detalle.numeroTicketRevision,
      urlFactura: detalle.urlTicketRevision,
      totalConIva: (detalle.totalTicketRevision || 20) * 1.21,
      clienteNombre: detalle.cliente.nombre || "",
      clienteEmailDefault: detalle.clienteEmailTicketRevision || detalle.cliente.email || "",
      lineasOriginales: detalle.lineasTicketRevision,
      rectificativa: detalle.ticketRevisionRectificativa
        ? { numeroFactura: detalle.ticketRevisionRectificativa.numeroFactura, urlFactura: detalle.ticketRevisionRectificativa.urlFactura }
        : null,
      corregida: detalle.ticketRevisionCorregida
        ? { numeroFactura: detalle.ticketRevisionCorregida.numeroFactura, urlFactura: detalle.ticketRevisionCorregida.urlFactura }
        : null,
      tipoRect: "rectificativa_ticket_revision", tipoCorr: "corregida_ticket_revision", tipoCombinado: "",
      permiteDevolucion: true,
      clienteOriginal: clienteOriginalDe(null, detalle),
      formaPagoOriginal: detalle.formaPagoTicketRevision,
    };
  }
  // Rectificativa/corregida de ticket vistas directamente desde su propia
  // fila en la lista — igual que rectificativa/corregida reales, un
  // documento que YA es una de estas no encadena su propia devolución.
  if (tipoBase === "rectificativa_ticket") {
    return {
      numeroFactura: detalle.ticketRectificativa?.numeroFactura || "",
      urlFactura: detalle.ticketRectificativa?.urlFactura || "",
      totalConIva: (detalle.ticketRectificativa?.totalFactura || 0) * 1.21,
      clienteNombre: detalle.cliente.nombre || "",
      clienteEmailDefault: detalle.clienteEmailTicket || detalle.cliente.email || "",
      lineasOriginales: [],
      rectificativa: null, corregida: null,
      tipoRect: "", tipoCorr: "", tipoCombinado: "",
      permiteDevolucion: false,
      clienteOriginal: clienteOriginalDe(null, detalle),
      formaPagoOriginal: detalle.formaPagoTicket,
    };
  }
  if (tipoBase === "corregida_ticket") {
    // Igual que "corregida"/"corregida_revision" reales (ver más abajo): un
    // ticket corregido es, a todos los efectos, un ticket nuevo e
    // independiente — SÍ se puede volver a rectificar y corregir tantas
    // veces como haga falta. Como solo hay una pareja de columnas
    // rectificativa/corregida por reparación (se sobrescriben en cada
    // ciclo), "rectificativa" aquí solo se rellena si pertenece a un ciclo
    // POSTERIOR a esta corregida (fecha más reciente) — si no, es la
    // rectificativa del ciclo anterior que ya dio lugar a esta misma
    // corregida y no aplica a este documento. Corregido 2026-08-27: antes
    // esta rama tenía permiteDevolucion: false, tratando la corregida como
    // si fuera terminal igual que una rectificativa — impedía generar una
    // segunda vuelta de devolución sobre un ticket corregido, a diferencia
    // de las facturas reales.
    const doc = detalle.ticketCorregida;
    const rectBase = detalle.ticketRectificativa;
    const hayCicloPosterior = !!(rectBase?.fechaFactura && doc?.fechaFactura && new Date(rectBase.fechaFactura) > new Date(doc.fechaFactura));
    return {
      numeroFactura: doc?.numeroFactura || "",
      urlFactura: doc?.urlFactura || "",
      totalConIva: (doc?.totalFactura || 0) * 1.21,
      clienteNombre: detalle.cliente.nombre || "",
      clienteEmailDefault: detalle.clienteEmailTicket || detalle.cliente.email || "",
      lineasOriginales: detalle.lineasTicket,
      rectificativa: hayCicloPosterior ? rectBase : null,
      corregida: null,
      tipoRect: "rectificativa_ticket", tipoCorr: "corregida_ticket", tipoCombinado: "",
      permiteDevolucion: true,
      clienteOriginal: clienteOriginalDe(null, detalle),
      formaPagoOriginal: detalle.formaPagoTicket,
    };
  }
  // Rectificativa/corregida del ticket de revisión, vistas directamente
  // desde su propia fila — mismo par de reglas que rectificativa_ticket/
  // corregida_ticket, sobre las columnas propias del ticket de revisión
  // (migración 054, para no compartir slot con el Ticket Rápido general).
  if (tipoBase === "rectificativa_ticket_revision") {
    return {
      numeroFactura: detalle.ticketRevisionRectificativa?.numeroFactura || "",
      urlFactura: detalle.ticketRevisionRectificativa?.urlFactura || "",
      totalConIva: (detalle.ticketRevisionRectificativa?.totalFactura || 0) * 1.21,
      clienteNombre: detalle.cliente.nombre || "",
      clienteEmailDefault: detalle.clienteEmailTicketRevision || detalle.cliente.email || "",
      lineasOriginales: [],
      rectificativa: null, corregida: null,
      tipoRect: "", tipoCorr: "", tipoCombinado: "",
      permiteDevolucion: false,
      clienteOriginal: clienteOriginalDe(null, detalle),
      formaPagoOriginal: detalle.formaPagoTicketRevision,
    };
  }
  if (tipoBase === "corregida_ticket_revision") {
    const doc = detalle.ticketRevisionCorregida;
    const rectBase = detalle.ticketRevisionRectificativa;
    const hayCicloPosterior = !!(rectBase?.fechaFactura && doc?.fechaFactura && new Date(rectBase.fechaFactura) > new Date(doc.fechaFactura));
    return {
      numeroFactura: doc?.numeroFactura || "",
      urlFactura: doc?.urlFactura || "",
      totalConIva: (doc?.totalFactura || 0) * 1.21,
      clienteNombre: detalle.cliente.nombre || "",
      clienteEmailDefault: detalle.clienteEmailTicketRevision || detalle.cliente.email || "",
      lineasOriginales: detalle.lineasTicketRevision,
      rectificativa: hayCicloPosterior ? rectBase : null,
      corregida: null,
      tipoRect: "rectificativa_ticket_revision", tipoCorr: "corregida_ticket_revision", tipoCombinado: "",
      permiteDevolucion: true,
      clienteOriginal: clienteOriginalDe(null, detalle),
      formaPagoOriginal: detalle.formaPagoTicketRevision,
    };
  }
  if (tipoBase === "anticipo") {
    // El anticipo puede haberse resuelto con ticket en vez de factura real
    // (petición del usuario, 2026-08-27) — mutuamente excluyentes, así que
    // basta con caer al ticket si no hay número de factura real.
    // anticipo_importe ya refleja el importe correcto en los dos casos (el
    // ticket también lo marca al generarse).
    return {
      numeroFactura: detalle.numeroFacturaAnticipo || detalle.numeroTicketAnticipo,
      urlFactura: detalle.urlFacturaAnticipo || detalle.urlTicketAnticipo,
      totalConIva: detalle.anticipoImporte * 1.21,
      clienteNombre: detalle.cliente.nombre || "",
      clienteEmailDefault: detalle.clienteEmailTicketAnticipo || detalle.cliente.email || "",
      lineasOriginales: [],
      rectificativa: null, corregida: null,
      tipoRect: "", tipoCorr: "", tipoCombinado: "",
      permiteDevolucion: false,
      clienteOriginal: clienteOriginalDe(null, detalle),
      formaPagoOriginal: detalle.formaPago,
    };
  }
  // Rectificativa/corregida vistas directamente desde su propia fila en la
  // lista — igual que _esRect en _mfaRenderResumen: un documento que YA es
  // una rectificativa o una corregida no puede tener su propia devolución
  // ni rectificativa (sin encadenar). Solo PDF/Enviar queda disponible.
  if (tipoBase === "rectificativa" || tipoBase === "rectificativa_revision") {
    const doc = tipoBase === "rectificativa_revision" ? detalle.rectificativaRevision : detalle.rectificativa;
    return {
      numeroFactura: doc?.numeroFactura || "",
      urlFactura: doc?.urlFactura || "",
      totalConIva: (doc?.totalFactura || 0) * 1.21,
      clienteNombre: detalle.cliente.nombre || "",
      clienteEmailDefault: detalle.cliente.email || "",
      lineasOriginales: [],
      rectificativa: null, corregida: null,
      tipoRect: "", tipoCorr: "", tipoCombinado: "",
      permiteDevolucion: false,
      clienteOriginal: clienteOriginalDe(null, detalle),
      formaPagoOriginal: detalle.formaPago,
    };
  }
  if (tipoBase === "corregida" || tipoBase === "corregida_revision") {
    // Una corregida es, a todos los efectos, una factura nueva e
    // independiente (numeración propia en Serie 1) — a diferencia de una
    // rectificativa (documento terminal, nunca se rectifica a sí mismo),
    // SÍ se puede volver a rectificar y corregir tantas veces como haga
    // falta (ver _validarGuardCorregidaTx en server.js). Como solo hay una
    // pareja de columnas rectificativa/corregida por reparación (se
    // sobrescriben en cada ciclo), "rectificativa" aquí solo se rellena si
    // pertenece a un ciclo POSTERIOR a esta corregida (fecha más reciente)
    // — si no, es la rectificativa del ciclo anterior que ya dio lugar a
    // esta misma corregida, y no aplica a este documento.
    const esRevision = tipoBase === "corregida_revision";
    const doc = esRevision ? detalle.corregidaRevision : detalle.corregida;
    const rectBase = esRevision ? detalle.rectificativaRevision : detalle.rectificativa;
    const hayCicloPosterior = !!(rectBase?.fechaFactura && doc?.fechaFactura && new Date(rectBase.fechaFactura) > new Date(doc.fechaFactura));
    return {
      numeroFactura: doc?.numeroFactura || "",
      urlFactura: doc?.urlFactura || "",
      totalConIva: (doc?.totalFactura || 0) * 1.21,
      clienteNombre: detalle.clienteFacturaCorregida?.nombre || detalle.cliente.nombre || "",
      clienteEmailDefault: detalle.clienteFacturaCorregida?.email || detalle.cliente.email || "",
      // Prioridad: las líneas reales de ESTA corregida (migración 026) —
      // si no existen (corregida generada antes de la migración), cae al
      // mismo fallback que el resto de ramas, con el aviso de que puede no
      // reflejar los conceptos exactos de esa corregida antigua.
      lineasOriginales: detalle.lineasFacturaCorregida && detalle.lineasFacturaCorregida.length > 0
        ? detalle.lineasFacturaCorregida
        : esRevision
          ? [{ descripcion: "Revisión técnica del equipo", cantidad: 1, precio: 20 }]
          : detalle.lineasFactura.length > 0
            ? detalle.lineasFactura
            : [{ descripcion: "Factura", cantidad: 1, precio: detalle.totalFactura }],
      // El ciclo posterior (si existe) ya generó su propia rectificativa;
      // su propia corregida (si la hubiera) sería ya la que se ve al abrir
      // esta misma fila de la lista, así que nunca es distinta de "doc".
      rectificativa: hayCicloPosterior ? rectBase : null,
      corregida: null,
      tipoRect: esRevision ? "rectificativa_revision" : "rectificativa",
      tipoCorr: esRevision ? "corregida_revision" : "corregida",
      tipoCombinado: esRevision ? "combinado_revision" : "combinado",
      permiteDevolucion: true,
      clienteOriginal: clienteOriginalDe(detalle.clienteFacturaCorregida, detalle),
      formaPagoOriginal: detalle.formaPago,
    };
  }
  const esRevision = tipoBase === "revision";
  const clienteBase = esRevision ? detalle.clienteFacturaRevision : detalle.clienteFactura;
  return {
    numeroFactura: esRevision ? detalle.numeroFacturaRevision : detalle.numeroFactura,
    urlFactura: esRevision ? detalle.urlFacturaRevision : detalle.urlFactura,
    totalConIva: (esRevision ? 20 : detalle.totalFactura) * 1.21,
    clienteNombre: clienteBase?.nombre || detalle.cliente.nombre || "",
    clienteEmailDefault: clienteBase?.email || detalle.cliente.email || "",
    lineasOriginales: esRevision
      ? [{ descripcion: "Revisión técnica del equipo", cantidad: 1, precio: 20 }]
      : detalle.lineasFactura.length > 0
        ? detalle.lineasFactura
        : [{ descripcion: "Factura", cantidad: 1, precio: detalle.totalFactura }],
    rectificativa: esRevision ? detalle.rectificativaRevision : detalle.rectificativa,
    corregida: esRevision ? detalle.corregidaRevision : detalle.corregida,
    clienteOriginal: clienteOriginalDe(clienteBase, detalle),
    formaPagoOriginal: detalle.formaPago,
    tipoRect: esRevision ? "rectificativa_revision" : "rectificativa",
    tipoCorr: esRevision ? "corregida_revision" : "corregida",
    tipoCombinado: esRevision ? "combinado_revision" : "combinado",
    permiteDevolucion: true,
  };
}

/**
 * Reproduce las pestañas del modal #modalFcAcciones (Index.html) — PDF /
 * Enviar, Devolución, Rectificativo — para reparación, revisión,
 * mensajería y anticipo (este último solo con PDF/Enviar, igual que el
 * original). A diferencia del original, aquí SÍ hay una guarda en el
 * backend contra generar dos rectificativas para el mismo documento
 * (decisión explícita, no un defecto de la migración — ver
 * _validarGuardCorregidaTx).
 */
export function FacturaAccionesTabs({
  detalle,
  tipoBase,
  onActualizado,
}: {
  detalle: ReparacionDetalle;
  tipoBase: TipoFacturaBase;
  onActualizado: () => void;
}) {
  const d = derivarDatosFactura(detalle, tipoBase);
  const esTicketRevision = tipoBase === "ticket_revision" || tipoBase === "rectificativa_ticket_revision" || tipoBase === "corregida_ticket_revision";
  const esTicket = tipoBase === "ticket" || tipoBase === "rectificativa_ticket" || tipoBase === "corregida_ticket" || esTicketRevision;
  // Los tickets no pasan por el saga de /facturas (endpoints propios, ver
  // ticket-venta/rectificativa y ticket-venta/corregida), pero desde
  // 2026-08-27 sí tienen su propia ruta de envío por correo
  // (ticket-venta/enviar), con doble confirmación en TabPdfEnviar. El
  // ticket de revisión usa su propia familia de endpoints
  // (ticket-venta/revision/...) — columnas propias (migración 054) para no
  // compartir ciclo con el Ticket Rápido general.
  const apiBase = esTicket
    ? esTicketRevision
      ? `/api/reparaciones/${detalle.resguardo}/ticket-venta/revision`
      : `/api/reparaciones/${detalle.resguardo}/ticket-venta`
    : `/api/reparaciones/${detalle.resguardo}/facturas`;

  return (
    <Tabs defaultValue="pdf" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="pdf">PDF / Enviar</TabsTrigger>
        <TabsTrigger value="devolucion" disabled={!d.permiteDevolucion}>Devolución</TabsTrigger>
        <TabsTrigger value="rectificativo" disabled={!d.permiteDevolucion}>Rectificativo</TabsTrigger>
      </TabsList>

      <TabsContent value="pdf" className="p-4">
        <TabPdfEnviar
          enviarUrl={esTicket ? `/api/reparaciones/${detalle.resguardo}/ticket-venta/enviar` : `${apiBase}/enviar`}
          tipo={tipoBase}
          numeroFactura={d.numeroFactura}
          urlFactura={d.urlFactura}
          totalFactura={d.totalConIva}
          clienteEmailDefault={d.clienteEmailDefault}
          confirmarAntesDeEnviar={esTicket}
          motivoRectificativa={
            tipoBase === "rectificativa" || tipoBase === "rectificativa_revision"
              ? detalle.motivoRectificativa
              : tipoBase === "rectificativa_ticket"
                ? detalle.motivoTicketRectificativa
                : tipoBase === "rectificativa_ticket_revision"
                  ? detalle.motivoTicketRevisionRectificativa
                  : ""
          }
        />
      </TabsContent>

      {d.permiteDevolucion && esTicket && (
        <>
          <TabsContent value="devolucion" className="p-4">
            <TabDevolucionTicket
              apiRectificativaUrl={`${apiBase}/rectificativa`}
              apiCorregidaUrl={`${apiBase}/corregida`}
              contexto={`Resguardo #${detalle.resguardo}`}
              numeroTicketOriginal={d.numeroFactura}
              lineasIniciales={d.lineasOriginales}
              formaPagoOriginal={d.formaPagoOriginal}
              yaGenerada={d.rectificativa}
              corregida={d.corregida}
              onGenerada={onActualizado}
            />
          </TabsContent>
          <TabsContent value="rectificativo" className="p-4">
            <TabRectificativoTicket
              apiRectificativaUrl={`${apiBase}/rectificativa`}
              apiCorregidaUrl={`${apiBase}/corregida`}
              contexto={`Resguardo #${detalle.resguardo}`}
              numeroTicketOriginal={d.numeroFactura}
              lineasIniciales={d.lineasOriginales}
              formaPagoOriginal={d.formaPagoOriginal}
              rectificativa={d.rectificativa}
              corregida={d.corregida}
              onActualizado={onActualizado}
            />
          </TabsContent>
        </>
      )}

      {d.permiteDevolucion && !esTicket && (
        <>
          <TabsContent value="devolucion" className="p-4">
            <TabDevolucionRectificativo
              resguardo={detalle.resguardo}
              apiBase={apiBase}
              tipoDestino={d.tipoRect}
              tipoCorr={d.tipoCorr}
              numeroFacturaOriginal={d.numeroFactura}
              lineasOriginales={d.lineasOriginales}
              clienteOriginal={d.clienteOriginal}
              formaPagoOriginal={d.formaPagoOriginal}
              clienteEmailDefault={d.clienteEmailDefault}
              yaGenerada={d.rectificativa}
              corregida={d.corregida}
              modoDevolucion
              onGenerada={onActualizado}
            />
          </TabsContent>

          <TabsContent value="rectificativo" className="p-4">
            <TabRectificativo
              resguardo={detalle.resguardo}
              apiBase={apiBase}
              enviarUrl={`${apiBase}/enviar`}
              tipoRect={d.tipoRect}
              tipoCorr={d.tipoCorr}
              tipoCombinado={d.tipoCombinado}
              numeroFacturaOriginal={d.numeroFactura}
              lineasOriginales={d.lineasOriginales}
              clienteOriginal={d.clienteOriginal}
              formaPagoOriginal={d.formaPagoOriginal}
              clienteEmailDefault={d.clienteEmailDefault}
              rectificativa={d.rectificativa}
              corregida={d.corregida}
              onActualizado={onActualizado}
            />
          </TabsContent>
        </>
      )}
    </Tabs>
  );
}

// ── Tab 1: PDF / Enviar ────────────────────────────────────────────────

export function TabPdfEnviar({
  enviarUrl,
  tipo,
  numeroFactura,
  urlFactura,
  totalFactura,
  clienteEmailDefault,
  motivoRectificativa,
  confirmarAntesDeEnviar,
}: {
  /** null/undefined = sin ruta de envío por correo todavía construida para
      este tipo de entidad (p.ej. facturas manuales) — se oculta el botón
      "Enviar al cliente" y solo queda "Descargar factura". */
  enviarUrl?: string | null;
  tipo: string;
  numeroFactura: string;
  urlFactura: string;
  totalFactura: number;
  clienteEmailDefault: string;
  motivoRectificativa: string;
  /** Los tickets exigen doble confirmación (petición del usuario,
      2026-08-27): el correo del cliente se muestra de forma destacada
      antes de enviar (no solo como placeholder) y se pide una segunda
      confirmación explícita justo antes de disparar el envío real. */
  confirmarAntesDeEnviar?: boolean;
}) {
  const [emailDestino, setEmailDestino] = useState("");
  const [enviando, setEnviando] = useState(false);
  const confirmar = useConfirm();
  const emailFinal = emailDestino.trim() || clienteEmailDefault;

  async function enviar() {
    if (!enviarUrl) return;
    if (!esEmailValido(emailDestino)) return toast.error("El email no tiene un formato válido");
    if (!emailFinal) return toast.error("No hay ningún correo de destino disponible");
    if (confirmarAntesDeEnviar) {
      const ok = await confirmar(`¿Enviar el ticket ${numeroFactura} a ${emailFinal}?`);
      if (!ok) return;
    }
    setEnviando(true);
    try {
      const res = await fetch(enviarUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, emailDestino: emailDestino.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      if (!data.enviado) throw new Error(data.motivo === "facturas_deshabilitado" ? "El envío de facturas por correo está deshabilitado por ahora." : (data.motivo || "No se pudo enviar"));
      toast.success(`${confirmarAntesDeEnviar ? "Ticket" : "Factura"} enviad${confirmarAntesDeEnviar ? "o" : "a"} a ${emailFinal}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  if (!numeroFactura) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Todavía no se ha generado esta factura.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
        <span>Nº <strong>{numeroFactura}</strong></span>
        <span className="font-semibold">{euros(totalFactura)}</span>
      </div>

      {motivoRectificativa && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Motivo de la rectificativa</Label>
          <Textarea value={motivoRectificativa} disabled className="resize-none bg-muted/50" rows={2} />
        </div>
      )}

      {enviarUrl && confirmarAntesDeEnviar && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
          Se enviará a: <strong>{emailFinal || "—"}</strong>
        </div>
      )}

      <div className="flex gap-2">
        {urlFactura && (
          <Button variant="outline" className="flex-1 gap-1.5" nativeButton={false} render={<Link href={urlFactura} target="_blank" rel="noreferrer" />}>
            <DocumentDownload className="size-4" /> Descargar factura
          </Button>
        )}
        {enviarUrl && (
          <Button className="flex-1 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={enviar} disabled={enviando || !emailFinal}>
            <Send2 className="size-4" /> {enviando ? "Enviando…" : "Enviar al cliente"}
          </Button>
        )}
      </div>

      {enviarUrl && (
        <div className="space-y-1.5">
          <Label htmlFor="emailAlt" className="text-xs text-muted-foreground">Enviar a otro correo (opcional)</Label>
          <Input id="emailAlt" type="email" placeholder={clienteEmailDefault || "correo@ejemplo.com"} value={emailDestino} onChange={(e) => setEmailDestino(e.target.value)} />
          <p className="text-xs text-muted-foreground">Si está vacío se usa el email del cliente.</p>
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Devolución (y Fase 1 de Rectificativo, misma llamada) ────────

export function TabDevolucionRectificativo({
  resguardo,
  apiBase,
  tipoDestino,
  tipoCorr,
  numeroFacturaOriginal,
  lineasOriginales,
  clienteOriginal,
  formaPagoOriginal,
  clienteEmailDefault,
  yaGenerada,
  corregida,
  modoDevolucion,
  permiteCorregida = true,
  duracionAlquiler,
  onGenerada,
}: {
  resguardo: string;
  /** URL base del saga de facturación de esta entidad (reparación o
      factura manual) — reemplaza el antiguo `/api/reparaciones/:resguardo/facturas` fijo. */
  apiBase: string;
  tipoDestino: string;
  tipoCorr: string;
  numeroFacturaOriginal: string;
  lineasOriginales: LineaFactura[];
  clienteOriginal: { nombre: string; direccion: string; dni: string; telefono: string };
  formaPagoOriginal: string;
  clienteEmailDefault: string;
  yaGenerada: { numeroFactura: string; urlFactura: string } | null;
  corregida?: { numeroFactura: string; urlFactura: string } | null;
  modoDevolucion: boolean;
  /** false = no ofrecer "¿lo generaste por error? genera la corregida" —
      para entidades donde el flujo de corregida no está implementado
      todavía (alquiler: es un flujo de corrección de datos más complejo,
      fuera de alcance de esta pasada). */
  permiteCorregida?: boolean;
  /** Solo alquiler — ver FaseCorregida. */
  duracionAlquiler?: { inicial: { meses: number; semanas: number; dias: number }; tarifas: { precioDia: number; precioSemana: number; precioMes: number }; equipoNombre: string };
  onGenerada: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [emailDestino, setEmailDestino] = useState(clienteEmailDefault);
  const [metodo, setMetodo] = useState(formaPagoOriginal);
  const [banco, setBanco] = useState("");
  const [suReferencia, setSuReferencia] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [mostrarCorregidaEmergencia, setMostrarCorregidaEmergencia] = useState(false);
  const confirmar = useConfirm();

  // ── EMERGENCIA: generar corregida desde el tab Devolución ─────────────
  // Reproduce _mfaEmergenciaCorregida(): tras generar la rectificativa
  // (devolución real, importes en negativo), permite igualmente emitir la
  // factura corregida por si en realidad se generó por error.
  if (yaGenerada && modoDevolucion) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
          <TickCircle className="size-4 shrink-0" />
          Ya existe una factura rectificativa para esta factura: <strong>{yaGenerada.numeroFactura}</strong>
        </div>
        {yaGenerada.urlFactura && (
          <Button variant="outline" className="gap-1.5" nativeButton={false} render={<Link href={yaGenerada.urlFactura} target="_blank" rel="noreferrer" />}>
            <DocumentText className="size-4" /> Ver PDF de la rectificativa
          </Button>
        )}
        {permiteCorregida && <hr />}
        {!permiteCorregida ? null : corregida ? (
          <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            <TickCircle className="size-4 shrink-0" />
            Factura corregida ya emitida: <strong>{corregida.numeroFactura}</strong>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
              <InfoCircle className="size-4 shrink-0 translate-y-0.5" />
              <span><strong>¿Generaste la rectificativa por error?</strong> Puedes generar igualmente la factura corregida.</span>
            </div>
            <Button
              variant="outline"
              className="w-full gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-400"
              onClick={async () => {
                const ok = await confirmar(
                  "¿Generar una Factura Corregida?\n\nSe abrirá el formulario para emitir una nueva factura corregida vinculada a este resguardo, usando los datos de la factura original. El proceso es el mismo que en el tab \"Rectificativa\"."
                );
                if (ok) setMostrarCorregidaEmergencia(true);
              }}
            >
              <TickCircle className="size-4" /> Generar Factura Corregida
            </Button>
          </div>
        )}
        {permiteCorregida && <FaseCorregida
          open={mostrarCorregidaEmergencia}
          onOpenChange={setMostrarCorregidaEmergencia}
          resguardo={resguardo}
          apiBase={apiBase}
          tipoCorr={tipoCorr}
          numeroFacturaOriginal={numeroFacturaOriginal}
          numeroFacturaRectificativa={yaGenerada.numeroFactura}
          lineasOriginales={lineasOriginales}
          clienteOriginal={clienteOriginal}
          formaPagoOriginal={formaPagoOriginal}
          duracionAlquiler={duracionAlquiler}
          onGenerada={onGenerada}
        />}
      </div>
    );
  }

  async function generar() {
    if (!motivo.trim()) return toast.error("El motivo es obligatorio");
    if (!metodo) return toast.error("Selecciona la forma de pago de la devolución");
    if (metodo === "tarjeta" && !banco) return toast.error("Selecciona el banco");

    setEnviando(true);
    const rid = requestId || crypto.randomUUID();
    setRequestId(rid);
    try {
      // -l.precio (no -Math.abs(l.precio)): una línea que ya era negativa en
      // el original (p.ej. "Descuento revisión pagada", precio -20) debe
      // pasar a +20 para cancelarse en la rectificativa, no quedarse en -20
      // (que la sumaba dos veces en vez de anularla — bug real detectado).
      const lineasNegadas = lineasOriginales.map((l) => ({ ...l, precio: -l.precio }));
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: rid,
          tipo: tipoDestino,
          datos: {
            cliente: clienteOriginal,
            formaPago: metodo,
            banco: metodo === "tarjeta" ? banco : "",
            motivo: motivo.trim(),
            numeroOriginal: numeroFacturaOriginal,
            lineas: lineasNegadas,
            tipoDocumento: "FACTURA RECTIFICATIVA",
            rectificaDe: `Rectifica a: ${numeroFacturaOriginal}`,
            estadoFactura: "Devolución",
          },
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Factura rectificativa ${data.numeroFactura} generada`);
      // Igual que el resto de flujos de factura (normal/anticipo/manual): sin
      // esto, el usuario no veía ningún PDF y asumía que había fallado —
      // llegó a repetir la generación completa, quemando números fiscales
      // reales de más (bug real detectado en producción).
      if (data.url) window.open(data.url, "_blank");
      guardarSuReferencia(data.numeroFactura, suReferencia);
      setRequestId(null);
      onGenerada();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-3">
      {modoDevolucion ? (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
          <InfoCircle className="size-4 shrink-0 translate-y-0.5" />
          <span>Se generará una <strong>factura rectificativa (Serie 3)</strong> con los importes en negativo, anulando la factura original. La forma de pago indica cómo se devuelve el importe al cliente.</span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Usa este flujo cuando hay que corregir datos del cliente (dirección, NIF…). Se generará la rectificativa de anulación y luego podrás emitir una nueva factura con los datos correctos.
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="motivo">Motivo *</Label>
        <Textarea
          id="motivo" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)}
          placeholder={modoDevolucion ? "Motivo interno — no aparece en la factura rectificativa…" : "Ej: Dirección incorrecta en factura original…"}
        />
        <p className="text-xs text-muted-foreground">Registro interno. No se incluye en el PDF.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="emailDevol">Email cliente</Label>
        <Input id="emailDevol" type="email" value={emailDestino} onChange={(e) => setEmailDestino(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="suReferenciaDevol">Su Referencia</Label>
        <Input id="suReferenciaDevol" value={suReferencia} onChange={(e) => setSuReferencia(e.target.value)} placeholder="Opcional — referencia propia del cliente" />
        <p className="text-xs text-muted-foreground">Opcional. No se incluye en el PDF, solo en el listado de Facturas de Clientes.</p>
      </div>
      <div className="space-y-1.5">
        <Label>{modoDevolucion ? "Forma de pago de la devolución *" : "Forma de pago *"}</Label>
        <Select value={metodo} onValueChange={(v) => { setMetodo(v || ""); if (v !== "tarjeta") setBanco(""); }}>
          <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona —" /></SelectTrigger>
          <SelectContent>
            {METODOS_PAGO_RECT.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {metodo === "tarjeta" && (
          <Select value={banco} onValueChange={(v) => setBanco(v || "")}>
            <SelectTrigger className="mt-2 w-full"><SelectValue placeholder="— Selecciona banco —" /></SelectTrigger>
            <SelectContent>
              {BANCOS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
      <Button className="w-full gap-1.5" variant="destructive" onClick={generar} disabled={enviando}>
        <Refresh2 className="size-4" /> {enviando ? "Generando…" : "Generar Factura Rectificativa (Serie 3)"}
      </Button>
    </div>
  );
}

// ── Tab 3: Rectificativo (Fase 1 + Fase 2 + envío combinado) ────────────

export function TabRectificativo({
  resguardo,
  apiBase,
  enviarUrl,
  tipoRect,
  tipoCorr,
  tipoCombinado,
  numeroFacturaOriginal,
  lineasOriginales,
  clienteOriginal,
  formaPagoOriginal,
  clienteEmailDefault,
  rectificativa,
  corregida,
  onActualizado,
}: {
  resguardo: string;
  apiBase: string;
  enviarUrl?: string | null;
  tipoRect: string;
  tipoCorr: string;
  tipoCombinado: string;
  numeroFacturaOriginal: string;
  lineasOriginales: LineaFactura[];
  clienteOriginal: { nombre: string; direccion: string; dni: string; telefono: string };
  formaPagoOriginal: string;
  clienteEmailDefault: string;
  rectificativa: { numeroFactura: string; urlFactura: string } | null;
  corregida: { numeroFactura: string; urlFactura: string } | null;
  onActualizado: () => void;
}) {
  const [abrirCorregida, setAbrirCorregida] = useState(false);

  if (!rectificativa) {
    return (
      <TabDevolucionRectificativo
        resguardo={resguardo}
        apiBase={apiBase}
        tipoDestino={tipoRect}
        tipoCorr={tipoCorr}
        numeroFacturaOriginal={numeroFacturaOriginal}
        lineasOriginales={lineasOriginales}
        clienteOriginal={clienteOriginal}
        formaPagoOriginal={formaPagoOriginal}
        clienteEmailDefault={clienteEmailDefault}
        yaGenerada={null}
        modoDevolucion={false}
        onGenerada={onActualizado}
      />
    );
  }

  // Fase 2 (mfaRtvFase2): tras generar la rectificativa, un botón abre el
  // modal editable de la factura corregida — no un formulario inline.
  if (!corregida) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
          <TickCircle className="size-4 shrink-0" />
          Rectificativa generada. Ahora emite la factura corregida.
        </div>
        <Button className="w-full gap-1.5" onClick={() => setAbrirCorregida(true)}>
          <ArrowRight2 className="size-4" /> Generar factura corregida
        </Button>
        <FaseCorregida
          open={abrirCorregida}
          onOpenChange={setAbrirCorregida}
          resguardo={resguardo}
          apiBase={apiBase}
          tipoCorr={tipoCorr}
          numeroFacturaOriginal={numeroFacturaOriginal}
          numeroFacturaRectificativa={rectificativa.numeroFactura}
          lineasOriginales={lineasOriginales}
          clienteOriginal={clienteOriginal}
          formaPagoOriginal={formaPagoOriginal}
          onGenerada={onActualizado}
        />
      </div>
    );
  }

  return (
    <EnvioCombinado
      enviarUrl={enviarUrl}
      tipoCombinado={tipoCombinado}
      numeroFacturaRectificativa={rectificativa.numeroFactura}
      numeroFacturaCorregida={corregida.numeroFactura}
      urlFacturaCorregida={corregida.urlFactura}
      clienteEmailDefault={clienteEmailDefault}
    />
  );
}

// ── Ticket Rápido: Devolución / Rectificativo / Corregida ───────────────
// Mismo ciclo conceptual que reparación/revisión/mensajería (petición del
// usuario, 2026-08-27), pero NO reutiliza TabDevolucionRectificativo/
// TabRectificativo/FaseCorregida: esos tres están fuertemente acoplados al
// saga real de facturación (/api/reparaciones/:resguardo/facturas, forma
// de pago, banco, envío por email, campos propios de alquiler...) que no
// aplica a un ticket (sin datos de cliente, sin forma de pago, sin envío
// por correo). Se implementa aparte, más simple, contra los endpoints
// propios de ticket-venta/rectificativa y ticket-venta/corregida.

export interface DocTicket {
  numeroFactura: string;
  urlFactura: string;
}

export function TabDevolucionTicket({
  apiRectificativaUrl,
  apiCorregidaUrl,
  contexto,
  numeroTicketOriginal,
  lineasIniciales,
  formaPagoOriginal,
  yaGenerada,
  corregida,
  onGenerada,
}: {
  apiRectificativaUrl: string;
  apiCorregidaUrl: string;
  contexto: string;
  numeroTicketOriginal: string;
  /** Líneas del documento original, para precargar el formulario del
      ticket corregido en vez de empezar en blanco — solo disponible
      cuando el origen guarda sus líneas (Ticket Manual); reparación/venta
      no las guardan en ningún sitio y caen al formulario vacío de
      siempre. */
  lineasIniciales?: LineaTicketCorr[];
  /** Forma de pago del ticket vigente — precarga el selector, igual que
      formaPagoOriginal en TabDevolucionRectificativo (facturas reales). */
  formaPagoOriginal: string;
  yaGenerada: DocTicket | null;
  corregida: DocTicket | null;
  onGenerada: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [metodo, setMetodo] = useState(formaPagoOriginal);
  const [banco, setBanco] = useState("");
  const [suReferencia, setSuReferencia] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [abrirCorregida, setAbrirCorregida] = useState(false);

  if (yaGenerada) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
          <TickCircle className="size-4 shrink-0" />
          Ya existe una rectificativa para este ticket: <strong>{yaGenerada.numeroFactura}</strong>
        </div>
        {yaGenerada.urlFactura && (
          <Button variant="outline" className="gap-1.5" nativeButton={false} render={<Link href={yaGenerada.urlFactura} target="_blank" rel="noreferrer" />}>
            <DocumentText className="size-4" /> Ver PDF de la rectificativa
          </Button>
        )}
        <hr />
        {corregida ? (
          <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            <TickCircle className="size-4 shrink-0" />
            Ticket corregido ya emitido: <strong>{corregida.numeroFactura}</strong>
          </div>
        ) : (
          <Button variant="outline" className="w-full gap-1.5" onClick={() => setAbrirCorregida(true)}>
            <ArrowRight2 className="size-4" /> Generar ticket corregido
          </Button>
        )}
        <FaseCorregidaTicket
          open={abrirCorregida}
          onOpenChange={setAbrirCorregida}
          apiCorregidaUrl={apiCorregidaUrl}
          contexto={contexto}
          numeroTicketOriginal={numeroTicketOriginal}
          numeroTicketRectificativa={yaGenerada.numeroFactura}
          lineasIniciales={lineasIniciales}
          formaPagoOriginal={formaPagoOriginal}
          onGenerada={onGenerada}
        />
      </div>
    );
  }

  async function generar() {
    if (!motivo.trim()) return toast.error("El motivo es obligatorio");
    if (!metodo) return toast.error("Selecciona la forma de pago de la devolución");
    if (metodo === "tarjeta" && !banco) return toast.error("Selecciona el banco");
    setEnviando(true);
    try {
      const res = await fetch(apiRectificativaUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo.trim(), formaPago: metodo, banco: metodo === "tarjeta" ? banco : "" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Rectificativa ${data.numeroTicket} generada`);
      if (data.urlTicket) window.open(data.urlTicket, "_blank");
      guardarSuReferencia(data.numeroTicket, suReferencia);
      onGenerada();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
        <InfoCircle className="size-4 shrink-0 translate-y-0.5" />
        <span>Se generará un <strong>ticket rectificativo (Serie 3)</strong> por el importe total en negativo, anulando el ticket original.</span>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="motivoTicket">Motivo *</Label>
        <Textarea id="motivoTicket" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo interno — no aparece en el PDF…" />
        <p className="text-xs text-muted-foreground">Registro interno. No se incluye en el PDF.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="suReferenciaTicket">Su Referencia</Label>
        <Input id="suReferenciaTicket" value={suReferencia} onChange={(e) => setSuReferencia(e.target.value)} placeholder="Opcional — referencia propia del cliente" />
      </div>
      <div className="space-y-1.5">
        <Label>Forma de pago de la devolución *</Label>
        <Select value={metodo} onValueChange={(v) => { setMetodo(v || ""); if (v !== "tarjeta") setBanco(""); }}>
          <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona —" /></SelectTrigger>
          <SelectContent>
            {METODOS_PAGO_RECT.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {metodo === "tarjeta" && (
          <>
            <Label className="mt-1.5 block">Banco *</Label>
            <Select value={banco} onValueChange={(v) => setBanco(v || "")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona banco —" /></SelectTrigger>
              <SelectContent>
                {BANCOS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        )}
      </div>
      <Button className="w-full gap-1.5" variant="destructive" onClick={generar} disabled={enviando}>
        <Refresh2 className="size-4" /> {enviando ? "Generando…" : "Generar Rectificativa (Serie 3)"}
      </Button>
    </div>
  );
}

export function TabRectificativoTicket({
  apiRectificativaUrl,
  apiCorregidaUrl,
  contexto,
  numeroTicketOriginal,
  lineasIniciales,
  formaPagoOriginal,
  rectificativa,
  corregida,
  onActualizado,
}: {
  apiRectificativaUrl: string;
  apiCorregidaUrl: string;
  contexto: string;
  numeroTicketOriginal: string;
  lineasIniciales?: LineaTicketCorr[];
  formaPagoOriginal: string;
  rectificativa: DocTicket | null;
  corregida: DocTicket | null;
  onActualizado: () => void;
}) {
  const [abrirCorregida, setAbrirCorregida] = useState(false);

  if (!rectificativa) {
    return (
      <TabDevolucionTicket
        apiRectificativaUrl={apiRectificativaUrl}
        apiCorregidaUrl={apiCorregidaUrl}
        contexto={contexto}
        numeroTicketOriginal={numeroTicketOriginal}
        lineasIniciales={lineasIniciales}
        formaPagoOriginal={formaPagoOriginal}
        yaGenerada={null}
        corregida={null}
        onGenerada={onActualizado}
      />
    );
  }

  if (!corregida) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
          <TickCircle className="size-4 shrink-0" />
          Rectificativa generada. Ahora emite el ticket corregido.
        </div>
        <Button className="w-full gap-1.5" onClick={() => setAbrirCorregida(true)}>
          <ArrowRight2 className="size-4" /> Generar ticket corregido
        </Button>
        <FaseCorregidaTicket
          open={abrirCorregida}
          onOpenChange={setAbrirCorregida}
          apiCorregidaUrl={apiCorregidaUrl}
          contexto={contexto}
          numeroTicketOriginal={numeroTicketOriginal}
          numeroTicketRectificativa={rectificativa.numeroFactura}
          lineasIniciales={lineasIniciales}
          formaPagoOriginal={formaPagoOriginal}
          onGenerada={onActualizado}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
        <TickCircle className="size-4 shrink-0" />
        Ciclo completo: rectificativa <strong>{rectificativa.numeroFactura}</strong> → corregida <strong>{corregida.numeroFactura}</strong>
      </div>
      {corregida.urlFactura && (
        <Button variant="outline" className="w-full gap-1.5" nativeButton={false} render={<Link href={corregida.urlFactura} target="_blank" rel="noreferrer" />}>
          <DocumentText className="size-4" /> Ver PDF del ticket corregido
        </Button>
      )}
    </div>
  );
}

export interface LineaTicketCorr {
  descripcion: string;
  cantidad: number;
  precio: number;
  descuento?: number;
}

function lineaVaciaCorr(): LineaTicketCorr {
  return { descripcion: "", cantidad: 1, precio: 0, descuento: 0 };
}

function totalLineaCorr(l: LineaTicketCorr): number {
  const subtotal = (Number(l.cantidad) || 0) * (Number(l.precio) || 0);
  const descuento = Math.min(100, Math.max(0, Number(l.descuento) || 0));
  return subtotal * (1 - descuento / 100);
}

function FaseCorregidaTicket({
  open,
  onOpenChange,
  apiCorregidaUrl,
  contexto,
  numeroTicketOriginal,
  numeroTicketRectificativa,
  lineasIniciales,
  formaPagoOriginal,
  onGenerada,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiCorregidaUrl: string;
  contexto: string;
  numeroTicketOriginal: string;
  numeroTicketRectificativa: string;
  lineasIniciales?: LineaTicketCorr[];
  formaPagoOriginal: string;
  onGenerada: () => void;
}) {
  const [lineas, setLineas] = useState<LineaTicketCorr[]>([lineaVaciaCorr()]);
  const [estado, setEstado] = useState<"Cobrada" | "Pendiente">("Cobrada");
  const [metodo, setMetodo] = useState(formaPagoOriginal);
  const [banco, setBanco] = useState("");
  const [suReferencia, setSuReferencia] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Precarga las líneas del documento original (si están disponibles,
  // p.ej. Ticket Manual — reparación/venta nunca las guardan) en vez de
  // empezar en blanco — bug real reportado por el usuario, 2026-08-27:
  // "no salen los datos cargados de el anterior en el corregido".
  useEffect(() => {
    if (open) {
      setLineas(
        lineasIniciales && lineasIniciales.length > 0
          ? lineasIniciales.map((l) => ({ descripcion: l.descripcion, cantidad: l.cantidad, precio: l.precio, descuento: l.descuento || 0 }))
          : [lineaVaciaCorr()]
      );
      setMetodo(formaPagoOriginal);
      setBanco("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Antes ignoraba l.descuento — un ticket con descuento por línea perdía
  // ese % al corregirse (quedaba en 0%, aunque el dato SÍ llegaba
  // precargado), dando un total distinto al PDF original. Bug real
  // reportado por el usuario con captura de un "CAMBIO DE ANILLO DYSON
  // V12 SLIM" con 10% en el ticket original y 0% en el corregido.
  const baseImponible = lineas.reduce((s, l) => s + totalLineaCorr(l), 0);
  const iva = baseImponible * IVA_PCT;
  const total = baseImponible + iva;

  function actualizarLinea(i: number, campo: keyof LineaTicketCorr, valor: string | number) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }

  function cerrar(o: boolean) {
    if (!enviando) onOpenChange(o);
  }

  async function generar() {
    const validas = lineas.filter((l) => l.descripcion.trim() && l.cantidad > 0);
    if (validas.length === 0) return toast.error("Añade al menos una línea con descripción y cantidad");
    if (!metodo) return toast.error("Selecciona la forma de pago");
    if (metodo === "tarjeta" && !banco) return toast.error("Selecciona el banco");
    setEnviando(true);
    try {
      const res = await fetch(apiCorregidaUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineas: validas, estado, formaPago: metodo, banco: metodo === "tarjeta" ? banco : "" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Ticket corregido ${data.numeroTicket} generado`);
      if (data.urlTicket) window.open(data.urlTicket, "_blank");
      guardarSuReferencia(data.numeroTicket, suReferencia);
      onOpenChange(false);
      onGenerada();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="max-w-2xl gap-0 p-0 sm:max-w-2xl" showCloseButton={false}>
        <CabeceraFactura titulo={`Ticket Corregido — ${contexto}`} onClose={() => cerrar(false)} />
        <div className="space-y-4 bg-muted/30 p-4">
          <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
            <TickCircle className="size-4 shrink-0" />
            Rectificativa: <strong>{numeroTicketRectificativa}</strong> — corrige a: <strong>{numeroTicketOriginal}</strong>
          </div>

          <div className="grid grid-cols-5 gap-3">
            <CampoLecturaCorr label="Serie / Código" valor="Se asignará al generar" />
            <CampoLecturaCorr label="Fecha" valor={new Date().toLocaleDateString("es-ES")} />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Su Referencia</Label>
              <Input value={suReferencia} onChange={(e) => setSuReferencia(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Estado</Label>
              <Select value={estado} onValueChange={(v) => setEstado(v === "Pendiente" ? "Pendiente" : "Cobrada")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cobrada">Cobrada</SelectItem>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Forma de pago *</Label>
              <Select value={metodo} onValueChange={(v) => { setMetodo(v || ""); if (v !== "tarjeta") setBanco(""); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona —" /></SelectTrigger>
                <SelectContent>
                  {METODOS_PAGO.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {metodo === "tarjeta" && (
                <>
                  <Label className="mt-1.5 block text-xs text-muted-foreground">Banco *</Label>
                  <Select value={banco} onValueChange={(v) => setBanco(v || "")}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona banco —" /></SelectTrigger>
                    <SelectContent>
                      {BANCOS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-card shadow-sm">
            <div className="flex items-center justify-between rounded-t-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
              <span>Conceptos</span>
              <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-xs text-white hover:bg-white/15 hover:text-white" onClick={() => setLineas((p) => (p.length < TICKET_MAX_LINEAS_CORR ? [...p, lineaVaciaCorr()] : p))}>
                <Add className="size-3" /> Añadir línea
              </Button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium">Descripción</th>
                  <th className="w-20 px-2 py-1.5 text-center font-medium">Cantidad</th>
                  <th className="w-28 px-2 py-1.5 text-right font-medium">Precio unidad</th>
                  <th className="w-20 px-2 py-1.5 text-center font-medium">Descuento</th>
                  <th className="w-28 px-2 py-1.5 text-right font-medium">Total</th>
                  <th className="w-7 px-1 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((l, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-1"><Input className="h-8 text-sm" placeholder="Descripción" value={l.descripcion} onChange={(e) => actualizarLinea(i, "descripcion", e.target.value)} /></td>
                    <td className="p-1"><Input type="number" min={0} step={1} className="h-8 text-center text-sm" value={l.cantidad} onChange={(e) => actualizarLinea(i, "cantidad", parseFloat(e.target.value) || 0)} /></td>
                    <td className="p-1"><Input type="number" step={0.01} className="h-8 text-right text-sm" value={l.precio} onChange={(e) => actualizarLinea(i, "precio", parseFloat(e.target.value) || 0)} /></td>
                    <td className="p-1">
                      <div className="relative">
                        <Input type="number" min={0} max={100} step={1} className="h-8 pr-5 text-right text-sm" value={l.descuento || 0} onChange={(e) => actualizarLinea(i, "descuento", Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} />
                        <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                      </div>
                    </td>
                    <td className="px-2 py-1 text-right font-medium">{euros(totalLineaCorr(l))}</td>
                    <td className="p-1">
                      <Button size="icon-sm" variant="ghost" className="text-destructive" onClick={() => setLineas((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p))} disabled={lineas.length === 1}>
                        <Trash className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="text-sm">
                <tr className="border-t bg-muted/30">
                  <td colSpan={4}></td>
                  <td className="px-2 py-1 text-right text-xs text-muted-foreground">Base imponible</td>
                  <td className="px-2 py-1 text-right font-medium">{euros(baseImponible)}</td>
                </tr>
                <tr className="bg-muted/30">
                  <td colSpan={4}></td>
                  <td className="px-2 py-1 text-right text-xs text-muted-foreground">IVA (21%)</td>
                  <td className="px-2 py-1 text-right font-medium">{euros(iva)}</td>
                </tr>
                <tr className="border-t bg-primary/5">
                  <td colSpan={4}></td>
                  <td className="px-2 py-1.5 text-right text-xs font-semibold">TOTAL</td>
                  <td className="px-2 py-1.5 text-right text-base font-bold">{euros(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <footer className="flex justify-end gap-2 border-t bg-card px-4 py-3">
          <Button variant="secondary" onClick={() => cerrar(false)} disabled={enviando}>Cancelar</Button>
          <Button className="gap-1.5" onClick={generar} disabled={enviando}>
            <ArrowRight2 className="size-4" /> {enviando ? "Generando…" : "Generar Ticket Corregido"}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

const IVA_PCT = 0.21;
// La plantilla de ticket se amplió de 8 a 16 filas, 2026-08-27 (ver
// TICKET_MAX_LINEAS en server.js).
const TICKET_MAX_LINEAS_CORR = 16;

// Reproduce la cabecera azul de #modalVistaFactura (mismo estilo que
// CabeceraAzul en factura-reparacion-dialog.tsx — duplicada aquí en vez de
// exportada para no acoplar ambos ficheros).
function CabeceraFactura({ titulo, onClose }: { titulo: string; onClose: () => void }) {
  return (
    <header className="flex items-center gap-2 rounded-t-xl bg-primary px-4 py-3 text-primary-foreground">
      <Receipt className="size-4.5 shrink-0" />
      <DialogTitle className="text-sm font-semibold text-primary-foreground">{titulo}</DialogTitle>
      <Button variant="ghost" size="icon-sm" className="ml-auto text-primary-foreground hover:bg-white/15 hover:text-primary-foreground" onClick={onClose}>
        <CloseCircle className="size-4" />
      </Button>
    </header>
  );
}

function CampoLecturaCorr({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={valor} disabled className="bg-muted/50" />
    </div>
  );
}

/** Detecta una línea "Descuento global (X%)" (formato usado por
    nueva-factura-manual-dialog.tsx/factura-reparacion-dialog.tsx al
    materializar el descuento global como línea) y la separa del resto,
    para poder recalcularla en vivo en vez de dejarla como texto fijo. */
function extraerDescuentoGlobal(lineas: LineaFactura[]): { pct: number; resto: LineaFactura[] } {
  const RE = /^Descuento global \((\d+(?:\.\d+)?)%\)$/i;
  const idx = lineas.findIndex((l) => RE.test(l.descripcion.trim()));
  if (idx === -1) return { pct: 0, resto: lineas };
  const m = RE.exec(lineas[idx].descripcion.trim());
  return { pct: m ? parseFloat(m[1]) : 0, resto: lineas.filter((_, i) => i !== idx) };
}

/**
 * Reproduce _mfaAbrirFacturaCorregidaModal() → #modalVistaFactura en modo
 * "corregida": modal propio (no un formulario inline en el tab), con la
 * misma cabecera azul y la misma disposición en dos columnas (Emisor +
 * Cliente / Equipo + Conceptos) que el resto de vistas de factura de este
 * puerto. Simplificaciones deliberadas frente al original: los campos de
 * cliente reproduce _vfMostrarClienteFactura()/_vfQuitarClienteCorregida():
 * por defecto se muestra el cliente de la factura original en una tarjeta
 * de solo lectura con un botón "×"; al pulsarlo (con confirmación) se vacía
 * y se cambia a modo edición con el mismo buscador de clientes que el resto
 * del puerto. No hay "Buscar artículo en stock" — sí descuento global,
 * igual que el resto de formularios de factura ya migrados.
 */
function FaseCorregida({
  open,
  onOpenChange,
  resguardo,
  apiBase,
  tipoCorr,
  numeroFacturaOriginal,
  numeroFacturaRectificativa,
  lineasOriginales,
  clienteOriginal,
  formaPagoOriginal,
  duracionAlquiler,
  onGenerada,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resguardo: string;
  apiBase: string;
  tipoCorr: string;
  numeroFacturaOriginal: string;
  numeroFacturaRectificativa: string;
  lineasOriginales: LineaFactura[];
  clienteOriginal: { nombre: string; direccion: string; dni: string; telefono: string };
  formaPagoOriginal: string;
  /** Solo alquiler: en vez de escribir a mano "Alquiler (2 semanas)" en una
      línea de texto libre (propenso a error, y el backend detecta la
      duración corregida buscando "mes/semana/día" en la descripción para
      resincronizar meses/semanas/dias del alquiler), se ofrecen los mismos
      campos Meses/Semanas/Días que "Nuevo Alquiler", que generan esa línea
      automáticamente con el importe ya calculado. */
  duracionAlquiler?: { inicial: { meses: number; semanas: number; dias: number }; tarifas: { precioDia: number; precioSemana: number; precioMes: number }; equipoNombre: string };
  onGenerada: () => void;
}) {
  const [nombre, setNombre] = useState(clienteOriginal.nombre);
  const [direccion, setDireccion] = useState(clienteOriginal.direccion);
  const [dni, setDni] = useState(clienteOriginal.dni);
  const [telefono, setTelefono] = useState(clienteOriginal.telefono);
  // _vfMostrarClienteFactura(): si hay nombre precargado se muestra la
  // tarjeta de solo lectura del cliente original; si no, directamente el
  // formulario editable (mismo fallback que "if (!cf || !cf.nombre)").
  const [clienteBloqueado, setClienteBloqueado] = useState(!!clienteOriginal.nombre);
  const [buscarClienteAbierto, setBuscarClienteAbierto] = useState(false);
  const [buscarStockAbierto, setBuscarStockAbierto] = useState(false);
  const [metodo, setMetodo] = useState(formaPagoOriginal);
  const [banco, setBanco] = useState("");
  // _mfaAbrirFacturaCorregidaModal (Index.html) reutiliza el mismo select
  // #vfEstadoFactura del resto de facturas — "Cobrada" viene seleccionado
  // por defecto en el HTML original (option value="Cobrada" selected). El
  // puerto no tenía este campo en absoluto (siempre mandaba "Pendiente" por
  // no enviar estadoFactura), así que ninguna factura corregida podía
  // marcarse cobrada al generarla.
  const [estado, setEstado] = useState<"Cobrada" | "Pendiente">("Cobrada");
  const [suReferencia, setSuReferencia] = useState("");
  // El descuento global de la factura original se guarda como una línea más
  // ("Descuento global (X%)", precio negativo — ver nueva-factura-manual-
  // dialog.tsx/factura-reparacion-dialog.tsx), pero aquí llegaba tal cual,
  // congelada: si se cambiaba el importe de otra línea, el descuento NO se
  // recalculaba (bug real reportado con PDF real: al subir una línea de
  // 250€ a 450€, el "Descuento global (50%)" se quedó en -125€ en vez de
  // pasar a -225€). Se extrae de lineasOriginales al abrir y se recalcula
  // en vivo como en los otros dos formularios, en vez de quedar fija.
  const { pct: descuentoGlobalInicial, resto: lineasOriginalesSinDescuento } = extraerDescuentoGlobal(lineasOriginales);
  const [descuentoGlobalPct, setDescuentoGlobalPct] = useState(descuentoGlobalInicial);
  const [lineas, setLineas] = useState<LineaFactura[]>(lineasOriginalesSinDescuento.length > 0 ? lineasOriginalesSinDescuento : duracionAlquiler ? [] : [{ descripcion: "", cantidad: 1, precio: 0 }]);
  const [duracion, setDuracion] = useState(duracionAlquiler?.inicial ?? { meses: 0, semanas: 0, dias: 0 });
  const [enviando, setEnviando] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const confirmar = useConfirm();

  // Recalculada en cada render a partir de Meses/Semanas/Días — nunca se
  // edita a mano, así que no puede quedar desincronizada con lo que
  // realmente se factura ni con lo que el backend detecta para
  // resincronizar el alquiler.
  const lineasDuracion: LineaFactura[] = duracionAlquiler
    ? [
        ...(duracion.meses > 0 ? [{ descripcion: `Alquiler ${duracionAlquiler.equipoNombre} (${duracion.meses} ${duracion.meses > 1 ? "meses" : "mes"})`, cantidad: duracion.meses, precio: duracionAlquiler.tarifas.precioMes }] : []),
        ...(duracion.semanas > 0 ? [{ descripcion: `Alquiler ${duracionAlquiler.equipoNombre} (${duracion.semanas} ${duracion.semanas > 1 ? "semanas" : "semana"})`, cantidad: duracion.semanas, precio: duracionAlquiler.tarifas.precioSemana }] : []),
        ...(duracion.dias > 0 ? [{ descripcion: `Alquiler ${duracionAlquiler.equipoNombre} (${duracion.dias} ${duracion.dias > 1 ? "días" : "día"})`, cantidad: duracion.dias, precio: duracionAlquiler.tarifas.precioDia }] : []),
      ]
    : [];
  const todasLasLineas = [...lineasDuracion, ...lineas];

  async function quitarClienteCorregida() {
    const ok = await confirmar("¿Cambiar el cliente de la factura corregida?\n\nSe borrará el cliente precargado y podrás buscar otro.");
    if (!ok) return;
    setNombre(""); setDireccion(""); setDni(""); setTelefono("");
    setClienteBloqueado(false);
  }

  function seleccionarCliente(c: Cliente) {
    setNombre(c.nombre || "");
    setDireccion(c.direccion || "");
    setDni(c.dniCif || "");
    setTelefono(c.telefono || "");
    toast.success("Cliente cargado");
  }

  const subtotal = todasLasLineas.reduce((s, l) => s + l.cantidad * l.precio * (1 - (l.descuento || 0) / 100), 0);
  const pctGlobal = Math.min(100, Math.max(0, descuentoGlobalPct || 0));
  const descuentoGlobalAmt = (subtotal * pctGlobal) / 100;
  const base = subtotal - descuentoGlobalAmt;
  const iva = base * IVA_PCT;
  const totalConIva = base + iva;

  function actualizarLinea(i: number, campo: keyof LineaFactura, valor: string | number) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }

  /** Reproduce _vfSeleccionarArticulo() (Index.html): añade una línea nueva
      precargada con los datos del artículo elegido en el catálogo de Stock
      de Piezas, en vez de tener que escribirlos a mano. Solo tiene sentido
      fuera de alquiler (piezas de reparación, no equipos en alquiler). */
  function agregarLineaDesdeStock(p: StockPieza) {
    setLineas((prev) => [
      ...prev,
      { referencia: p.referencia, descripcion: p.descripcion || p.nombre, cantidad: 1, precio: p.precioCliente },
    ]);
    setBuscarStockAbierto(false);
  }

  async function generar() {
    const validas = todasLasLineas.filter((l) => l.descripcion.trim() || l.precio);
    if (validas.length === 0) return toast.error(duracionAlquiler ? "Indica la duración del alquiler" : "Añade al menos un concepto");
    if (!nombre.trim()) return toast.error("El nombre del cliente es obligatorio");
    // _vfValidarFormaPago() (Index.html): #modalVistaFactura exige forma de
    // pago en TODOS los flujos que lo generan (normal/anticipo/manual/
    // corregida) — este faltaba aquí, así que se podía generar la factura
    // corregida sin forma de pago seleccionada (bug real reportado).
    if (!metodo) return toast.error("Selecciona una forma de pago");
    if (metodo === "tarjeta" && !banco) return toast.error("Selecciona el banco para tarjeta bancaria");

    setEnviando(true);
    const rid = requestId || crypto.randomUUID();
    setRequestId(rid);
    try {
      const importeGlobal = Math.round(descuentoGlobalAmt * 100) / 100;
      const lineasConDescuento = pctGlobal > 0 && importeGlobal > 0
        ? [...validas, { descripcion: `Descuento global (${pctGlobal}%)`, cantidad: 1, precio: -importeGlobal }]
        : validas;
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: rid,
          tipo: tipoCorr,
          datos: {
            numeroFacturaOriginal,
            cliente: { nombre: nombre.trim(), direccion: direccion.trim(), dni: dni.trim(), telefono: telefono.trim() },
            formaPago: metodo,
            banco: metodo === "tarjeta" ? banco : "",
            lineas: lineasConDescuento,
            tipoDocumento: "FACTURA CORREGIDA",
            rectificaDe: `Corrige: ${numeroFacturaOriginal} · Rectificativa: ${numeroFacturaRectificativa}`,
            estadoFactura: estado,
          },
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Factura corregida ${data.numeroFactura} generada`);
      // Igual que el resto de flujos de factura: el diálogo se cerraba sin
      // mostrar nunca el PDF generado (data.url se descartaba), así que el
      // usuario no tenía forma de comprobar que sí se había generado.
      if (data.url) window.open(data.url, "_blank");
      guardarSuReferencia(data.numeroFactura, suReferencia);
      setRequestId(null);
      onOpenChange(false);
      onGenerada();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enviando && onOpenChange(o)}>
      <DialogContent className="max-w-6xl gap-0 p-0 sm:max-w-6xl" showCloseButton={false}>
        <CabeceraFactura titulo={`Factura Corregida — Ref. ${resguardo}`} onClose={() => onOpenChange(false)} />

        <ScrollArea className="max-h-[75vh]">
          <div className="space-y-4 bg-muted/30 p-4">
            <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
              <TickCircle className="size-4 shrink-0" />
              Rectificativa generada: <strong>{numeroFacturaRectificativa}</strong> — corrige: <strong>{numeroFacturaOriginal}</strong>
            </div>

            <div className="grid gap-3 sm:grid-cols-6">
              <CampoLecturaCorr label="Tipo de factura" valor="Serie 1 — Cobros" />
              <CampoLecturaCorr label="N.º Factura" valor="Se asignará al generar" />
              <CampoLecturaCorr label="Fecha de factura" valor={new Date().toLocaleDateString("es-ES")} />
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Forma de pago *</Label>
                <Select value={metodo} onValueChange={(v) => { setMetodo(v || ""); if (v !== "tarjeta") setBanco(""); }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona —" /></SelectTrigger>
                  <SelectContent>
                    {METODOS_PAGO.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {metodo === "tarjeta" && (
                  <Select value={banco} onValueChange={(v) => setBanco(v || "")}>
                    <SelectTrigger className="mt-1.5 w-full"><SelectValue placeholder="— Selecciona banco —" /></SelectTrigger>
                    <SelectContent>
                      {BANCOS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Estado</Label>
                <Select value={estado} onValueChange={(v) => setEstado((v || "Cobrada") as "Cobrada" | "Pendiente")}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cobrada">Cobrada</SelectItem>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Su Referencia</Label>
                <Input value={suReferencia} onChange={(e) => setSuReferencia(e.target.value)} placeholder="Opcional" />
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[5fr_7fr]">
              <div className="space-y-3">
                <div className="rounded-lg border bg-card shadow-sm">
                  <div className="flex items-center gap-1.5 rounded-t-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white">
                    <Building className="size-3.5" /> Emisor
                  </div>
                  <div className="space-y-0.5 p-3 text-xs">
                    <p className="font-semibold">KELATOS INFORMÁTICA</p>
                    <p className="text-muted-foreground">Affirma Technology Group S.L.</p>
                    <p>CIF: B72990443</p>
                    <p>Blasco de Garay 63 BJ 2, 28015 Madrid</p>
                    <p>918 294 660 · soporte@kelatos.com</p>
                  </div>
                </div>

                {clienteBloqueado ? (
                  <div className="rounded-lg border bg-card shadow-sm">
                    <div className="flex items-center justify-between gap-1.5 rounded-t-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">
                      <span className="flex items-center gap-1.5"><Profile className="size-3.5" /> Cliente <span className="font-normal opacity-75">(factura original)</span></span>
                      <Button size="icon-sm" variant="ghost" className="size-5 text-white hover:bg-white/15 hover:text-white" title="Cambiar cliente" onClick={quitarClienteCorregida}>
                        <CloseCircle className="size-3.5" />
                      </Button>
                    </div>
                    <div className="space-y-1 p-3 text-xs">
                      <p><span className="text-muted-foreground">Nombre:</span> <strong>{nombre || "—"}</strong></p>
                      {dni && <p><span className="text-muted-foreground">DNI/CIF:</span> {dni}</p>}
                      {telefono && <p><span className="text-muted-foreground">Teléfono:</span> {telefono}</p>}
                      {direccion && <p><span className="text-muted-foreground">Dirección:</span> {direccion}</p>}
                    </div>
                    <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                      Cliente con el que se emitió la factura original. Pulsa <strong>×</strong> para usar un cliente diferente en la factura corregida.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-card shadow-sm">
                    <div className="flex items-center justify-between gap-1.5 rounded-t-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">
                      <span className="flex items-center gap-1.5"><Profile className="size-3.5" /> Cliente</span>
                      <Button size="sm" variant="secondary" className="h-6 gap-1 px-2 text-xs" onClick={() => setBuscarClienteAbierto(true)}>
                        <SearchNormal1 className="size-3" /> Buscar
                      </Button>
                    </div>
                    <div className="space-y-2 p-3">
                      <div className="space-y-1">
                        <Label htmlFor="corrNombre" className="text-xs text-muted-foreground">Nombre / Razón social *</Label>
                        <Input id="corrNombre" className="h-8 text-sm" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="corrDireccion" className="text-xs text-muted-foreground">Dirección</Label>
                        <Input id="corrDireccion" className="h-8 text-sm" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="corrDni" className="text-xs text-muted-foreground">NIF / DNI</Label>
                          <Input id="corrDni" className="h-8 text-sm" value={dni} onChange={(e) => setDni(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="corrTelefono" className="text-xs text-muted-foreground">Teléfono</Label>
                          <Input id="corrTelefono" className="h-8 text-sm" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border bg-card shadow-sm">
                  <div className="flex items-center gap-1.5 rounded-t-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-white">
                    Equipo / Servicio
                  </div>
                  <div className="space-y-3 p-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Referencia:</span>{" "}
                      <strong>Corrige: {numeroFacturaOriginal} · Rectificativa: {numeroFacturaRectificativa}</strong>
                    </div>
                    {duracionAlquiler && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Duración corregida</Label>
                        <div className="mt-1 grid grid-cols-3 gap-2">
                          <div className="space-y-0.5">
                            <Label className="text-[10px] text-muted-foreground">Meses</Label>
                            <Input type="number" min={0} className="h-8 text-sm" value={duracion.meses} onChange={(e) => setDuracion((prev) => ({ ...prev, meses: Math.max(0, parseInt(e.target.value) || 0) }))} />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-[10px] text-muted-foreground">Semanas</Label>
                            <Input type="number" min={0} className="h-8 text-sm" value={duracion.semanas} onChange={(e) => setDuracion((prev) => ({ ...prev, semanas: Math.max(0, parseInt(e.target.value) || 0) }))} />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-[10px] text-muted-foreground">Días</Label>
                            <Input type="number" min={0} className="h-8 text-sm" value={duracion.dias} onChange={(e) => setDuracion((prev) => ({ ...prev, dias: Math.max(0, parseInt(e.target.value) || 0) }))} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border bg-card shadow-sm">
                  <div className="flex items-center justify-between rounded-t-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
                    <span>Conceptos</span>
                    <div className="flex items-center gap-1">
                      {/* Piezas de repuesto, no aplica a equipos en alquiler. */}
                      {!duracionAlquiler && (
                        <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-xs text-white hover:bg-white/15 hover:text-white" onClick={() => setBuscarStockAbierto(true)}>
                          <Box1 className="size-3" /> Stock
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-xs text-white hover:bg-white/15 hover:text-white" onClick={() => setLineas((prev) => [...prev, { descripcion: "", cantidad: 1, precio: 0 }])}>
                        <Add className="size-3" /> Añadir línea
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs text-muted-foreground">
                        <tr>
                          <th className="w-20 px-2 py-1.5 text-left font-medium">Ref.</th>
                          <th className="px-2 py-1.5 text-left font-medium">Descripción</th>
                          <th className="w-14 px-2 py-1.5 text-center font-medium">Cant.</th>
                          <th className="w-16 px-2 py-1.5 text-center font-medium">Dto. %</th>
                          <th className="w-24 px-2 py-1.5 text-right font-medium">P. unit.</th>
                          <th className="w-7 px-1 py-1.5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineasDuracion.map((l, i) => (
                          <tr key={`dur-${i}`} className="border-t bg-muted/30">
                            <td className="p-1"></td>
                            <td className="p-2 text-sm text-muted-foreground">{l.descripcion}</td>
                            <td className="p-2 text-center text-sm text-muted-foreground">{l.cantidad}</td>
                            <td className="p-2 text-center text-sm text-muted-foreground">—</td>
                            <td className="p-2 text-right text-sm text-muted-foreground">{euros(l.precio)}</td>
                            <td className="p-1"></td>
                          </tr>
                        ))}
                        {lineas.map((l, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-1"><Input className="h-8 text-sm" value={l.referencia || ""} onChange={(e) => actualizarLinea(i, "referencia", e.target.value)} /></td>
                            <td className="p-1"><Input className="h-8 text-sm" placeholder="Descripción" value={l.descripcion} onChange={(e) => actualizarLinea(i, "descripcion", e.target.value)} /></td>
                            <td className="p-1"><Input type="number" className="h-8 text-center text-sm" value={l.cantidad} onChange={(e) => actualizarLinea(i, "cantidad", parseFloat(e.target.value) || 0)} /></td>
                            <td className="p-1"><Input type="number" className="h-8 text-center text-sm" value={l.descuento || 0} onChange={(e) => actualizarLinea(i, "descuento", parseFloat(e.target.value) || 0)} /></td>
                            <td className="p-1"><Input type="number" step="0.01" className="h-8 text-right text-sm" value={l.precio} onChange={(e) => actualizarLinea(i, "precio", parseFloat(e.target.value) || 0)} /></td>
                            <td className="p-1">
                              <Button size="icon-sm" variant="ghost" className="text-destructive" onClick={() => setLineas((prev) => prev.filter((_, idx) => idx !== i))}>
                                <Trash className="size-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="text-sm">
                        <tr className="border-t bg-muted/30">
                          <td colSpan={4}></td>
                          <td className="px-2 py-1 text-right text-xs text-muted-foreground">Base imponible</td>
                          <td className="px-2 py-1 text-right font-medium">{euros(subtotal)}</td>
                        </tr>
                        <tr className="bg-muted/30">
                          <td colSpan={3}></td>
                          <td className="px-2 py-1 text-right text-xs text-muted-foreground">Descuento global</td>
                          <td className="p-1">
                            <div className="flex items-center justify-end gap-1">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.5}
                                className="h-7 w-14 border-0 bg-transparent text-right text-xs"
                                value={descuentoGlobalPct}
                                onChange={(e) => setDescuentoGlobalPct(parseFloat(e.target.value) || 0)}
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                            </div>
                          </td>
                          <td className="px-2 py-1 text-right text-xs text-muted-foreground">{euros(descuentoGlobalAmt)}</td>
                        </tr>
                        <tr className="bg-muted/30">
                          <td colSpan={4}></td>
                          <td className="px-2 py-1 text-right text-xs text-muted-foreground">IVA (21%)</td>
                          <td className="px-2 py-1 text-right font-medium">{euros(iva)}</td>
                        </tr>
                        <tr className="border-t bg-primary/5">
                          <td colSpan={4}></td>
                          <td className="px-2 py-1.5 text-right text-xs font-semibold">TOTAL</td>
                          <td className="px-2 py-1.5 text-right text-base font-bold">{euros(totalConIva)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <footer className="flex justify-end gap-2 border-t bg-card px-4 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={enviando}>Cerrar</Button>
          <Button className="gap-1.5" onClick={generar} disabled={enviando}>
            <ArrowRight2 className="size-4" /> {enviando ? "Generando…" : "Generar factura corregida"}
          </Button>
        </footer>
      </DialogContent>

      <BuscarClienteDialog open={buscarClienteAbierto} onOpenChange={setBuscarClienteAbierto} onSeleccionar={seleccionarCliente} />
      {!duracionAlquiler && <BuscarPiezaStockDialog open={buscarStockAbierto} onOpenChange={setBuscarStockAbierto} onSeleccionar={agregarLineaDesdeStock} />}
    </Dialog>
  );
}

function EnvioCombinado({
  enviarUrl,
  tipoCombinado,
  numeroFacturaRectificativa,
  numeroFacturaCorregida,
  urlFacturaCorregida,
  clienteEmailDefault,
}: {
  /** null = sin ruta de envío combinado construida para este tipo de
      entidad (facturas manuales) — solo se muestra el enlace al PDF. */
  enviarUrl?: string | null;
  tipoCombinado: string;
  numeroFacturaRectificativa: string;
  numeroFacturaCorregida: string;
  urlFacturaCorregida: string;
  clienteEmailDefault: string;
}) {
  const [emailDestino, setEmailDestino] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (!enviarUrl) return;
    if (!esEmailValido(emailDestino)) return toast.error("El email no tiene un formato válido");
    setEnviando(true);
    try {
      const res = await fetch(enviarUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: tipoCombinado, emailDestino: emailDestino.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      if (!data.enviado) throw new Error(data.motivo || "No se pudo enviar");
      toast.success(`Enviado a ${emailDestino.trim() || clienteEmailDefault}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
        <TickCircle className="size-4 shrink-0" />
        Proceso completo: rectificativa <strong>{numeroFacturaRectificativa}</strong> + corregida <strong>{numeroFacturaCorregida}</strong>
      </div>
      {urlFacturaCorregida && (
        <Button variant="outline" className="w-full gap-1.5" nativeButton={false} render={<Link href={urlFacturaCorregida} target="_blank" rel="noreferrer" />}>
          <DocumentText className="size-4" /> Ver PDF de la factura corregida
        </Button>
      )}
      {enviarUrl ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="emailCombo" className="text-xs text-muted-foreground">Enviar a otro correo (opcional)</Label>
            <Input id="emailCombo" type="email" placeholder={clienteEmailDefault || "correo@ejemplo.com"} value={emailDestino} onChange={(e) => setEmailDestino(e.target.value)} />
          </div>
          <Button className="w-full gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={enviar} disabled={enviando}>
            <Send2 className="size-4" /> {enviando ? "Enviando…" : "Enviar rectificativa y factura corregida"}
          </Button>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">El envío combinado por correo no está disponible para facturas manuales — usa &quot;Descargar factura&quot; en cada documento.</p>
      )}
    </div>
  );
}
