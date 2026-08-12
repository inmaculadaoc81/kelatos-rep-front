"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DocumentDownload, DocumentText, Send2, Refresh2, ArrowRight2, TickCircle, InfoCircle, Add, Trash,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { ReparacionDetalle } from "@/lib/reparacion-detalle";
import type { LineaFactura } from "@/lib/factura";

export type TipoFacturaBase =
  | "normal" | "revision" | "mensajeria" | "anticipo"
  | "rectificativa" | "rectificativa_revision" | "corregida" | "corregida_revision";

const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta bancaria" },
  { value: "transferencia", label: "Transferencia bancaria" },
  { value: "bizum", label: "Bizum" },
];
const BANCOS = ["Santander", "Sabadell", "BBVA", "CaixaBank"];

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
    };
  }
  if (tipoBase === "anticipo") {
    return {
      numeroFactura: detalle.numeroFacturaAnticipo,
      urlFactura: detalle.urlFacturaAnticipo,
      totalConIva: detalle.anticipoImporte * 1.21,
      clienteNombre: detalle.cliente.nombre || "",
      clienteEmailDefault: detalle.cliente.email || "",
      lineasOriginales: [],
      rectificativa: null, corregida: null,
      tipoRect: "", tipoCorr: "", tipoCombinado: "",
      permiteDevolucion: false,
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
    };
  }
  if (tipoBase === "corregida" || tipoBase === "corregida_revision") {
    const doc = tipoBase === "corregida_revision" ? detalle.corregidaRevision : detalle.corregida;
    return {
      numeroFactura: doc?.numeroFactura || "",
      urlFactura: doc?.urlFactura || "",
      totalConIva: (doc?.totalFactura || 0) * 1.21,
      clienteNombre: detalle.clienteFacturaCorregida?.nombre || detalle.cliente.nombre || "",
      clienteEmailDefault: detalle.clienteFacturaCorregida?.email || detalle.cliente.email || "",
      lineasOriginales: [],
      rectificativa: null, corregida: null,
      tipoRect: "", tipoCorr: "", tipoCombinado: "",
      permiteDevolucion: false,
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

  return (
    <Tabs defaultValue="pdf" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="pdf">PDF / Enviar</TabsTrigger>
        <TabsTrigger value="devolucion" disabled={!d.permiteDevolucion || !!d.rectificativa}>Devolución</TabsTrigger>
        <TabsTrigger value="rectificativo" disabled={!d.permiteDevolucion}>Rectificativo</TabsTrigger>
      </TabsList>

      <TabsContent value="pdf" className="p-4">
        <TabPdfEnviar
          resguardo={detalle.resguardo}
          tipo={tipoBase}
          numeroFactura={d.numeroFactura}
          urlFactura={d.urlFactura}
          totalFactura={d.totalConIva}
          clienteEmailDefault={d.clienteEmailDefault}
          motivoRectificativa={tipoBase === "rectificativa" || tipoBase === "rectificativa_revision" ? detalle.motivoRectificativa : ""}
          esDevolucionEsteDocumento={false}
        />
      </TabsContent>

      {d.permiteDevolucion && (
        <>
          <TabsContent value="devolucion" className="p-4">
            <TabDevolucionRectificativo
              resguardo={detalle.resguardo}
              tipoDestino={d.tipoRect}
              numeroFacturaOriginal={d.numeroFactura}
              lineasOriginales={d.lineasOriginales}
              clienteEmailDefault={d.clienteEmailDefault}
              yaGenerada={d.rectificativa}
              modoDevolucion
              onGenerada={onActualizado}
            />
          </TabsContent>

          <TabsContent value="rectificativo" className="p-4">
            <TabRectificativo
              resguardo={detalle.resguardo}
              tipoRect={d.tipoRect}
              tipoCorr={d.tipoCorr}
              tipoCombinado={d.tipoCombinado}
              numeroFacturaOriginal={d.numeroFactura}
              lineasOriginales={d.lineasOriginales}
              clienteNombreDefault={d.clienteNombre}
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

function TabPdfEnviar({
  resguardo,
  tipo,
  numeroFactura,
  urlFactura,
  totalFactura,
  clienteEmailDefault,
  motivoRectificativa,
}: {
  resguardo: string;
  tipo: string;
  numeroFactura: string;
  urlFactura: string;
  totalFactura: number;
  clienteEmailDefault: string;
  motivoRectificativa: string;
  esDevolucionEsteDocumento: boolean;
}) {
  const [emailDestino, setEmailDestino] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    setEnviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${resguardo}/facturas/enviar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, emailDestino: emailDestino.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      if (!data.enviado) throw new Error(data.motivo === "facturas_deshabilitado" ? "El envío de facturas por correo está deshabilitado por ahora." : (data.motivo || "No se pudo enviar"));
      toast.success(`Factura enviada a ${emailDestino.trim() || clienteEmailDefault}`);
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

      <div className="flex gap-2">
        {urlFactura && (
          <Button variant="outline" className="flex-1 gap-1.5" nativeButton={false} render={<Link href={urlFactura} target="_blank" rel="noreferrer" />}>
            <DocumentDownload className="size-4" /> Descargar factura
          </Button>
        )}
        <Button className="flex-1 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={enviar} disabled={enviando}>
          <Send2 className="size-4" /> {enviando ? "Enviando…" : "Enviar al cliente"}
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="emailAlt" className="text-xs text-muted-foreground">Enviar a otro correo (opcional)</Label>
        <Input id="emailAlt" type="email" placeholder={clienteEmailDefault || "correo@ejemplo.com"} value={emailDestino} onChange={(e) => setEmailDestino(e.target.value)} />
        <p className="text-xs text-muted-foreground">Si está vacío se usa el email del cliente.</p>
      </div>
    </div>
  );
}

// ── Tab 2: Devolución (y Fase 1 de Rectificativo, misma llamada) ────────

function TabDevolucionRectificativo({
  resguardo,
  tipoDestino,
  numeroFacturaOriginal,
  lineasOriginales,
  clienteEmailDefault,
  yaGenerada,
  modoDevolucion,
  onGenerada,
}: {
  resguardo: string;
  tipoDestino: string;
  numeroFacturaOriginal: string;
  lineasOriginales: LineaFactura[];
  clienteEmailDefault: string;
  yaGenerada: { numeroFactura: string; urlFactura: string } | null;
  modoDevolucion: boolean;
  onGenerada: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [emailDestino, setEmailDestino] = useState(clienteEmailDefault);
  const [metodo, setMetodo] = useState("");
  const [banco, setBanco] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);

  if (yaGenerada) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
          <InfoCircle className="size-4 shrink-0" />
          Rectificativa ya generada: <strong>{yaGenerada.numeroFactura}</strong>
        </div>
        {yaGenerada.urlFactura && (
          <Button variant="outline" className="gap-1.5" nativeButton={false} render={<Link href={yaGenerada.urlFactura} target="_blank" rel="noreferrer" />}>
            <DocumentText className="size-4" /> Ver PDF de la rectificativa
          </Button>
        )}
        {modoDevolucion && (
          <p className="text-xs text-muted-foreground">
            Para enviarla al cliente, usa la pestaña <strong>PDF / Enviar</strong> (documento actual) o la pestaña <strong>Rectificativo</strong> para generar además la factura corregida.
          </p>
        )}
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
      const lineasNegadas = lineasOriginales.map((l) => ({ ...l, precio: -Math.abs(l.precio) }));
      const res = await fetch(`/api/reparaciones/${resguardo}/facturas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: rid,
          tipo: tipoDestino,
          datos: {
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
      <div className="space-y-1.5">
        <Label htmlFor="motivo">Motivo *</Label>
        <Textarea id="motivo" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo de la devolución" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="emailDevol">Email cliente</Label>
        <Input id="emailDevol" type="email" value={emailDestino} onChange={(e) => setEmailDestino(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Forma de pago de la devolución *</Label>
        <Select value={metodo} onValueChange={(v) => { setMetodo(v || ""); if (v !== "tarjeta") setBanco(""); }}>
          <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona —" /></SelectTrigger>
          <SelectContent>
            {METODOS_PAGO.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
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
        <Refresh2 className="size-4" /> {enviando ? "Generando…" : "Generar devolución (rectificativa)"}
      </Button>
    </div>
  );
}

// ── Tab 3: Rectificativo (Fase 1 + Fase 2 + envío combinado) ────────────

function TabRectificativo({
  resguardo,
  tipoRect,
  tipoCorr,
  tipoCombinado,
  numeroFacturaOriginal,
  lineasOriginales,
  clienteNombreDefault,
  clienteEmailDefault,
  rectificativa,
  corregida,
  onActualizado,
}: {
  resguardo: string;
  tipoRect: string;
  tipoCorr: string;
  tipoCombinado: string;
  numeroFacturaOriginal: string;
  lineasOriginales: LineaFactura[];
  clienteNombreDefault: string;
  clienteEmailDefault: string;
  rectificativa: { numeroFactura: string; urlFactura: string } | null;
  corregida: { numeroFactura: string; urlFactura: string } | null;
  onActualizado: () => void;
}) {
  if (!rectificativa) {
    return (
      <TabDevolucionRectificativo
        resguardo={resguardo}
        tipoDestino={tipoRect}
        numeroFacturaOriginal={numeroFacturaOriginal}
        lineasOriginales={lineasOriginales}
        clienteEmailDefault={clienteEmailDefault}
        yaGenerada={null}
        modoDevolucion={false}
        onGenerada={onActualizado}
      />
    );
  }

  if (!corregida) {
    return (
      <FaseCorregida
        resguardo={resguardo}
        tipoCorr={tipoCorr}
        numeroFacturaOriginal={numeroFacturaOriginal}
        numeroFacturaRectificativa={rectificativa.numeroFactura}
        lineasOriginales={lineasOriginales}
        clienteNombreDefault={clienteNombreDefault}
        onGenerada={onActualizado}
      />
    );
  }

  return (
    <EnvioCombinado
      resguardo={resguardo}
      tipoCombinado={tipoCombinado}
      numeroFacturaRectificativa={rectificativa.numeroFactura}
      numeroFacturaCorregida={corregida.numeroFactura}
      urlFacturaCorregida={corregida.urlFactura}
      clienteEmailDefault={clienteEmailDefault}
    />
  );
}

function FaseCorregida({
  resguardo,
  tipoCorr,
  numeroFacturaOriginal,
  numeroFacturaRectificativa,
  lineasOriginales,
  clienteNombreDefault,
  onGenerada,
}: {
  resguardo: string;
  tipoCorr: string;
  numeroFacturaOriginal: string;
  numeroFacturaRectificativa: string;
  lineasOriginales: LineaFactura[];
  clienteNombreDefault: string;
  onGenerada: () => void;
}) {
  const [nombre, setNombre] = useState(clienteNombreDefault);
  const [lineas, setLineas] = useState<LineaFactura[]>(lineasOriginales.length > 0 ? lineasOriginales : [{ descripcion: "", cantidad: 1, precio: 0 }]);
  const [enviando, setEnviando] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);

  const total = lineas.reduce((s, l) => s + l.cantidad * l.precio * (1 - (l.descuento || 0) / 100), 0);

  function actualizarLinea(i: number, campo: keyof LineaFactura, valor: string | number) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }

  async function generar() {
    const validas = lineas.filter((l) => l.descripcion.trim() || l.precio);
    if (validas.length === 0) return toast.error("Añade al menos un concepto");
    if (!nombre.trim()) return toast.error("El nombre del cliente es obligatorio");

    setEnviando(true);
    const rid = requestId || crypto.randomUUID();
    setRequestId(rid);
    try {
      const res = await fetch(`/api/reparaciones/${resguardo}/facturas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: rid,
          tipo: tipoCorr,
          datos: {
            numeroFacturaOriginal,
            cliente: { nombre: nombre.trim() },
            lineas: validas,
            tipoDocumento: "FACTURA CORREGIDA",
            rectificaDe: `Corrige: ${numeroFacturaOriginal} · Rectificativa: ${numeroFacturaRectificativa}`,
          },
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Factura corregida ${data.numeroFactura} generada`);
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
      <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
        <TickCircle className="size-4 shrink-0" />
        Rectificativa generada: <strong>{numeroFacturaRectificativa}</strong>
      </div>
      <p className="text-sm text-muted-foreground">Corrige: {numeroFacturaOriginal} — completa los datos correctos y genera la factura corregida.</p>

      <div className="space-y-1.5">
        <Label htmlFor="corrNombre">Nombre / Razón social *</Label>
        <Input id="corrNombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>

      <div className="rounded-lg border">
        <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-1.5 text-xs font-semibold">
          <span>Conceptos corregidos</span>
          <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-xs" onClick={() => setLineas((prev) => [...prev, { descripcion: "", cantidad: 1, precio: 0 }])}>
            <Add className="size-3" /> Añadir línea
          </Button>
        </div>
        {lineas.map((l, i) => (
          <div key={i} className="flex items-center gap-1.5 border-b p-1.5 last:border-b-0">
            <Input className="h-8 flex-1 text-sm" placeholder="Descripción" value={l.descripcion} onChange={(e) => actualizarLinea(i, "descripcion", e.target.value)} />
            <Input type="number" className="h-8 w-16 text-center text-sm" value={l.cantidad} onChange={(e) => actualizarLinea(i, "cantidad", parseFloat(e.target.value) || 0)} />
            <Input type="number" step="0.01" className="h-8 w-24 text-right text-sm" value={l.precio} onChange={(e) => actualizarLinea(i, "precio", parseFloat(e.target.value) || 0)} />
            <Button size="icon-sm" variant="ghost" className="text-destructive" onClick={() => setLineas((prev) => prev.filter((_, idx) => idx !== i))}>
              <Trash className="size-3.5" />
            </Button>
          </div>
        ))}
        <div className="flex justify-end border-t bg-muted/30 px-3 py-1.5 text-sm font-semibold">Base: {euros(total)}</div>
      </div>

      <Button className="w-full gap-1.5" onClick={generar} disabled={enviando}>
        <ArrowRight2 className="size-4" /> {enviando ? "Generando…" : "Generar factura corregida"}
      </Button>
    </div>
  );
}

function EnvioCombinado({
  resguardo,
  tipoCombinado,
  numeroFacturaRectificativa,
  numeroFacturaCorregida,
  urlFacturaCorregida,
  clienteEmailDefault,
}: {
  resguardo: string;
  tipoCombinado: string;
  numeroFacturaRectificativa: string;
  numeroFacturaCorregida: string;
  urlFacturaCorregida: string;
  clienteEmailDefault: string;
}) {
  const [emailDestino, setEmailDestino] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    setEnviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${resguardo}/facturas/enviar`, {
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
      <div className="space-y-1.5">
        <Label htmlFor="emailCombo" className="text-xs text-muted-foreground">Enviar a otro correo (opcional)</Label>
        <Input id="emailCombo" type="email" placeholder={clienteEmailDefault || "correo@ejemplo.com"} value={emailDestino} onChange={(e) => setEmailDestino(e.target.value)} />
      </div>
      <Button className="w-full gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={enviar} disabled={enviando}>
        <Send2 className="size-4" /> {enviando ? "Enviando…" : "Enviar rectificativa y factura corregida"}
      </Button>
    </div>
  );
}
