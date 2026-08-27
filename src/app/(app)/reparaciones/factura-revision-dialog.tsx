"use client";

import { useEffect, useRef, useState } from "react";
import { Receipt, Ticket, TickCircle, CloseCircle, SearchNormal1, ArrowLeft2, Send2 } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle, esCierreAccidental } from "@/components/ui/dialog";
import { useConfirm } from "@/components/confirm-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ReparacionDetalle } from "@/lib/reparacion-detalle";
import { Cliente } from "@/lib/clientes";
import { BuscarClienteDialog } from "@/components/buscar-cliente-dialog";
import { FacturaModalShell } from "./factura-modal-shell";

const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta bancaria" },
  { value: "transferencia", label: "Transferencia bancaria" },
  { value: "bizum", label: "Bizum" },
];
const BANCOS = ["Santander", "Sabadell", "BBVA", "CaixaBank"];

/**
 * Reproduce abrirModalMarcarRevision()/confirmarMarcarRevision() del
 * original, ampliado el 2026-08-26 (petición del usuario): la revisión ya
 * no se resuelve solo con una factura real — también puede resolverse con
 * un ticket (Serie 1), que no lleva datos de cliente. Por eso, si todavía
 * no se ha generado ninguno de los dos, primero se pregunta cuál se
 * quiere, y solo entonces se muestra el formulario correspondiente — meter
 * los dos caminos en un único modal con campos de cliente no tenía sentido
 * para el camino de ticket, que nunca los usa.
 */
export function FacturaRevisionDialog({
  detalle,
  open,
  onOpenChange,
  onGenerada,
  metodoPagoInicial,
  bancoInicial,
}: {
  detalle: ReparacionDetalle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerada: () => void;
  /** Precarga desde el alta (checkRevisionPagada corresponde) — reproduce
      _solicitarValidacionClienteRevision(rep, metodoPagoRevision,
      bancoRevision) del original, que abre este mismo modal justo después
      de guardar con la forma de pago ya elegida ahí en vez de en blanco. */
  metodoPagoInicial?: string;
  bancoInicial?: string;
}) {
  const yaGeneradaFactura = !!(detalle.numeroFacturaRevision || detalle.urlFacturaRevision);
  const yaGeneradaTicket = !!(detalle.numeroTicketRevision || detalle.urlTicketRevision);

  // Congela la decisión al ABRIR el diálogo — generar el ticket aquí mismo
  // llama a onGenerada() (refresca "detalle" en el padre), lo que
  // recalculaba yaGeneradaTicket=true a media faena y conmutaba a
  // VistaGeneradaTicket antes de que el usuario pudiera pulsar "Enviar al
  // cliente" en VistaGenerarTicket — la vista cambiaba entera y esa
  // pantalla (y su estado local) desaparecía. Bug real reportado,
  // 2026-08-27: "solo se dio click a generar y luego no apareció el
  // enviar al cliente" (sí vio el aviso de éxito, así que el ticket SÍ se
  // generó bien — el problema era puramente de qué vista se mostraba
  // después). Mismo patrón que sinNuevaFacturaAlAbrir en
  // entregar-con-factura-dialog.tsx.
  const estadoAlAbrir = useRef({ yaGeneradaFactura, yaGeneradaTicket });
  useEffect(() => {
    if (open) estadoAlAbrir.current = { yaGeneradaFactura, yaGeneradaTicket };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (estadoAlAbrir.current.yaGeneradaFactura) return <VistaGenerada detalle={detalle} open={open} onOpenChange={onOpenChange} onActualizado={onGenerada} />;
  if (estadoAlAbrir.current.yaGeneradaTicket) return <VistaGeneradaTicket detalle={detalle} open={open} onOpenChange={onOpenChange} onActualizado={onGenerada} />;
  return (
    <VistaElegir
      detalle={detalle}
      open={open}
      onOpenChange={onOpenChange}
      onGenerada={onGenerada}
      metodoPagoInicial={metodoPagoInicial}
      bancoInicial={bancoInicial}
    />
  );
}

function CabeceraVerde({ titulo, onClose, onVolver }: { titulo: string; onClose?: () => void; onVolver?: () => void }) {
  return (
    <header className="flex items-center gap-2 rounded-t-xl bg-emerald-600 px-4 py-3 text-white">
      {onVolver && (
        <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/15 hover:text-white" onClick={onVolver}>
          <ArrowLeft2 className="size-4" />
        </Button>
      )}
      <Receipt className="size-4.5 shrink-0" />
      <DialogTitle className="text-sm font-semibold text-white">{titulo}</DialogTitle>
      {onClose && (
        <Button variant="ghost" size="icon-sm" className="ml-auto text-white hover:bg-white/15 hover:text-white" onClick={onClose}>
          <CloseCircle className="size-4" />
        </Button>
      )}
    </header>
  );
}

function VistaGenerada({
  detalle,
  open,
  onOpenChange,
  onActualizado,
}: {
  detalle: ReparacionDetalle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActualizado: () => void;
}) {
  return <FacturaModalShell detalle={detalle} tipoBase="revision" open={open} onOpenChange={onOpenChange} onActualizado={onActualizado} />;
}

/** Cuando la revisión ya se resolvió con un ticket (en vez de una factura
    real) — reutiliza FacturaModalShell (igual que VistaGenerada para el
    caso de factura real) para dar acceso a Devolución/Rectificativo/
    Corregida sobre ESE ticket, con su propio ciclo independiente
    (migración 054, petición del usuario 2026-08-27: "la revision se
    genera con ticket y a ese se puede hacer su rectificativa corregida"). */
function VistaGeneradaTicket({
  detalle,
  open,
  onOpenChange,
  onActualizado,
}: {
  detalle: ReparacionDetalle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActualizado: () => void;
}) {
  return <FacturaModalShell detalle={detalle} tipoBase="ticket_revision" open={open} onOpenChange={onOpenChange} onActualizado={onActualizado} />;
}

/** Paso 1: elegir si la revisión se cobra con factura real o con ticket,
    antes de mostrar el formulario correspondiente. */
function VistaElegir({
  detalle,
  open,
  onOpenChange,
  onGenerada,
  metodoPagoInicial,
  bancoInicial,
}: {
  detalle: ReparacionDetalle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerada: () => void;
  metodoPagoInicial?: string;
  bancoInicial?: string;
}) {
  const [modo, setModo] = useState<"" | "factura" | "ticket">("");

  useEffect(() => {
    if (open) setModo("");
  }, [open]);

  if (modo === "factura") {
    return (
      <VistaGenerar
        detalle={detalle}
        open={open}
        onOpenChange={onOpenChange}
        onGenerada={onGenerada}
        metodoPagoInicial={metodoPagoInicial}
        bancoInicial={bancoInicial}
        onVolver={() => setModo("")}
      />
    );
  }
  if (modo === "ticket") {
    return (
      <VistaGenerarTicket
        detalle={detalle}
        open={open}
        onOpenChange={onOpenChange}
        onGenerada={onGenerada}
        metodoPagoInicial={metodoPagoInicial}
        bancoInicial={bancoInicial}
        onVolver={() => setModo("")}
      />
    );
  }

  // Sin forma de cerrar (ni X, ni Cancelar, ni clic fuera, ni Esc) —
  // petición explícita del usuario, 2026-08-26: una vez que "revisión
  // corresponde" se marcó en el alta, hay que resolverla sí o sí (factura
  // o ticket) antes de seguir, en vez de poder dejarla a medias como
  // pasaba antes (de ahí salía el bug de revision_pagada sin documento).
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="gap-0 p-0 sm:max-w-sm" showCloseButton={false}>
        <CabeceraVerde titulo="Marcar revisión pagada" />
        <div className="space-y-3 p-4">
          <p className="text-sm text-muted-foreground">¿Cómo se cobra la revisión (20€ s/IVA)?</p>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted"
            onClick={() => setModo("factura")}
          >
            <Receipt className="size-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">Factura</p>
              <p className="text-xs text-muted-foreground">Documento fiscal completo, con datos del cliente.</p>
            </div>
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted"
            onClick={() => setModo("ticket")}
          >
            <Ticket className="size-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">Ticket</p>
              <p className="text-xs text-muted-foreground">Recibo simple, sin datos de cliente.</p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VistaGenerarTicket({
  detalle,
  open,
  onOpenChange,
  onGenerada,
  metodoPagoInicial,
  bancoInicial,
  onVolver,
}: {
  detalle: ReparacionDetalle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerada: () => void;
  metodoPagoInicial?: string;
  bancoInicial?: string;
  onVolver: () => void;
}) {
  const [estado, setEstado] = useState<"Cobrada" | "Pendiente">("Cobrada");
  const [metodo, setMetodo] = useState(metodoPagoInicial || "");
  const [banco, setBanco] = useState(bancoInicial || "");
  const [emailTicket, setEmailTicket] = useState(detalle.cliente.email || "");
  const [enviando, setEnviando] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [resultadoTicket, setResultadoTicket] = useState<{ numeroTicket: string; urlTicket: string } | null>(null);
  const [enviandoTicket, setEnviandoTicket] = useState(false);
  // Una vez generado, no se deja cerrar sin enviarlo primero — petición del
  // usuario, 2026-08-27: "no debería dejar cerrar".
  const [ticketEnviado, setTicketEnviado] = useState(false);
  const confirmarEnvio = useConfirm();

  function cerrar(o: boolean, eventDetails?: { reason?: string; cancel?: () => void }) {
    if (enviando) return;
    if (eventDetails && esCierreAccidental(o, eventDetails)) return;
    if (!o) {
      if (resultadoTicket && !ticketEnviado) {
        toast.error("Envía el ticket al cliente antes de cerrar");
        return;
      }
      setRequestId(null);
      setResultadoTicket(null);
      setTicketEnviado(false);
    }
    onOpenChange(o);
  }

  async function confirmar() {
    if (!metodo) return toast.error("Selecciona el método de pago");
    if (metodo === "tarjeta" && !banco) return toast.error("Selecciona el banco para el pago con tarjeta");

    setEnviando(true);
    const rid = requestId || crypto.randomUUID();
    setRequestId(rid);
    try {
      const res = await fetch(`/api/reparaciones/${detalle.resguardo}/ticket-venta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modo: "revision",
          estado,
          formaPago: metodo,
          banco: metodo === "tarjeta" ? banco : "",
          emailTicket: emailTicket.trim(),
          lineas: [{ descripcion: "Revisión técnica del equipo", cantidad: 1, precio: 20 }],
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Revisión marcada — Ticket ${data.numeroTicket} generado correctamente`);
      onGenerada();
      // Se queda abierto (a diferencia de antes) para poder ofrecer "Enviar
      // al cliente" — petición del usuario, 2026-08-27: "En revision
      // debería haber la opción de enviar también". Mismo patrón que el
      // ticket de mensajería (entregar-con-factura-dialog.tsx).
      setResultadoTicket({ numeroTicket: data.numeroTicket || "", urlTicket: data.urlTicket || "" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  async function enviarTicket() {
    if (!resultadoTicket) return;
    const destino = emailTicket.trim();
    if (!destino) return toast.error("No hay ningún correo de destino disponible");
    const ok = await confirmarEnvio(`¿Enviar el ticket ${resultadoTicket.numeroTicket} a ${destino}?`);
    if (!ok) return;
    setEnviandoTicket(true);
    try {
      const res = await fetch(`/api/reparaciones/${detalle.resguardo}/ticket-venta/enviar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "ticket_revision", emailDestino: destino }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      if (!data.enviado) throw new Error(data.motivo || "No se pudo enviar");
      toast.success(`Ticket enviado a ${destino}`);
      setTicketEnviado(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviandoTicket(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="gap-0 p-0 sm:max-w-sm" showCloseButton={false}>
        <CabeceraVerde titulo="Marcar revisión — Ticket" onClose={() => cerrar(false)} onVolver={enviando || (resultadoTicket && !ticketEnviado) ? undefined : onVolver} />
        <div className="space-y-3 p-4">
          <p className="text-sm text-muted-foreground">Genera un ticket (sin datos fiscales de cliente) para la revisión técnica.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Importe (€ s/IVA)</Label>
              <Input value="20" disabled className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={estado} onValueChange={(v) => setEstado(v === "Pendiente" ? "Pendiente" : "Cobrada")} disabled={!!resultadoTicket}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cobrada">Cobrada</SelectItem>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Método de pago *</Label>
            <Select value={metodo} onValueChange={(v) => { setMetodo(v || ""); if (v !== "tarjeta") setBanco(""); }} disabled={!!resultadoTicket}>
              <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona —" /></SelectTrigger>
              <SelectContent>
                {METODOS_PAGO.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {metodo === "tarjeta" && (
            <div className="space-y-1.5">
              <Label>Banco *</Label>
              <Select value={banco} onValueChange={(v) => setBanco(v || "")} disabled={!!resultadoTicket}>
                <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona banco —" /></SelectTrigger>
                <SelectContent>
                  {BANCOS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Correo del cliente</Label>
            <Input type="email" value={emailTicket} onChange={(e) => setEmailTicket(e.target.value)} placeholder="correo@ejemplo.com" disabled={!!resultadoTicket} />
            <p className="text-xs text-muted-foreground">Tomado del resguardo — edítalo si el ticket debe enviarse a otro correo.</p>
          </div>
          {resultadoTicket && (
            <div className="space-y-1 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
              <div className="flex items-center justify-between gap-2">
                <span>Ticket <strong>{resultadoTicket.numeroTicket}</strong> generado correctamente.</span>
                {resultadoTicket.urlTicket && (
                  <a href={resultadoTicket.urlTicket} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver PDF</a>
                )}
              </div>
              <p className="text-xs">
                {emailTicket.trim() ? <>Se enviará a: <strong>{emailTicket.trim()}</strong></> : "Sin correo de destino — vuelve arriba para añadir uno."}
              </p>
            </div>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t bg-muted/50 px-4 py-3">
          <Button variant="outline" onClick={() => cerrar(false)} disabled={enviando}>{resultadoTicket ? "Cerrar" : "Cancelar"}</Button>
          {resultadoTicket && (
            <Button className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={enviarTicket} disabled={!emailTicket.trim() || enviandoTicket}>
              <Send2 className="size-3.5" /> {enviandoTicket ? "Enviando…" : "Enviar al cliente"}
            </Button>
          )}
          {!resultadoTicket && (
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5" onClick={confirmar} disabled={enviando}>
              <TickCircle className="size-3.5" /> {enviando ? "Procesando…" : "Confirmar y generar ticket"}
            </Button>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function VistaGenerar({
  detalle,
  open,
  onOpenChange,
  onGenerada,
  metodoPagoInicial,
  bancoInicial,
  onVolver,
}: {
  detalle: ReparacionDetalle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerada: () => void;
  metodoPagoInicial?: string;
  bancoInicial?: string;
  onVolver?: () => void;
}) {
  const [nombre, setNombre] = useState(detalle.cliente.nombre || "");
  const [direccion, setDireccion] = useState(detalle.cliente.direccion || "");
  const [dni, setDni] = useState(detalle.dniCif || "");
  const [telefono, setTelefono] = useState(detalle.cliente.telefono || "");
  // El importe de la revisión es fijo (20€ s/IVA) — no editable, coincide
  // con el precio de tienda anunciado al cliente.
  const importe = "20";
  const [metodo, setMetodo] = useState(metodoPagoInicial || "");
  const [banco, setBanco] = useState(bancoInicial || "");
  const [enviando, setEnviando] = useState(false);
  // Se conserva el mismo requestId entre reintentos — un fallo de red no
  // debe reservar un segundo número fiscal para la misma operación.
  const [requestId, setRequestId] = useState<string | null>(null);
  const [buscarClienteAbierto, setBuscarClienteAbierto] = useState(false);

  function seleccionarCliente(c: Cliente) {
    setNombre(c.nombre || "");
    setDireccion(c.direccion || "");
    setDni(c.dniCif || "");
    setTelefono(c.telefono || "");
    toast.success("Cliente cargado");
  }

  function cerrar(o: boolean, eventDetails?: { reason?: string; cancel?: () => void }) {
    if (enviando) return;
    if (eventDetails && esCierreAccidental(o, eventDetails)) return;
    if (!o) { setRequestId(null); }
    onOpenChange(o);
  }

  async function confirmar() {
    if (!nombre.trim()) return toast.error("El nombre del cliente es obligatorio");
    if (!metodo) return toast.error("Selecciona el método de pago");
    if (metodo === "tarjeta" && !banco) return toast.error("Selecciona el banco para el pago con tarjeta");

    setEnviando(true);
    const rid = requestId || crypto.randomUUID();
    setRequestId(rid);
    try {
      const res = await fetch(`/api/reparaciones/${detalle.resguardo}/facturas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: rid,
          tipo: "revision",
          datos: {
            cliente: { nombre: nombre.trim(), direccion: direccion.trim(), dni: dni.trim(), telefono: telefono.trim(), email: detalle.cliente.email },
            formaPago: metodo,
            banco: metodo === "tarjeta" ? banco : "",
            lineas: [{ referencia: "REV-01", descripcion: "Revisión técnica del equipo", cantidad: 1, precio: parseFloat(importe) || 20 }],
            clienteOverrideProvisto: true,
            // El cliente ya pagó al confirmar este modal — la factura nace cobrada, nunca pendiente.
            estadoFactura: "Cobrada",
          },
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Revisión marcada — Factura ${data.numeroFactura} generada correctamente`);
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
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg" showCloseButton={false}>
        <CabeceraVerde titulo="Marcar revisión pagada" onClose={() => cerrar(false)} onVolver={enviando ? undefined : onVolver} />
        <div className="space-y-3 p-4">
          <p className="text-sm text-muted-foreground">Verifica los datos que aparecerán en la factura y confirma el pago.</p>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="frNombre">Nombre / Razón social *</Label>
              <Button type="button" size="sm" variant="secondary" className="h-6 gap-1 px-2 text-xs" onClick={() => setBuscarClienteAbierto(true)}>
                <SearchNormal1 className="size-3" /> Buscar
              </Button>
            </div>
            <Input id="frNombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo o empresa" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="frDireccion">Dirección fiscal</Label>
            <Input id="frDireccion" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle, número, CP, ciudad" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="frDni">DNI / CIF</Label>
              <Input id="frDni" value={dni} onChange={(e) => setDni(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="frTelefono">Teléfono</Label>
              <Input id="frTelefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
          </div>

          <hr className="my-1" />

          <div className="grid grid-cols-[auto_1fr] gap-3">
            <div className="w-24 space-y-1.5">
              <Label htmlFor="frImporte">Importe (€ s/IVA)</Label>
              <Input id="frImporte" value={importe} disabled className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label>Método de pago</Label>
              <Select value={metodo} onValueChange={(v) => { setMetodo(v || ""); if (v !== "tarjeta") setBanco(""); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona —" /></SelectTrigger>
                <SelectContent>
                  {METODOS_PAGO.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {metodo === "tarjeta" && (
            <div className="space-y-1.5">
              <Label>Banco</Label>
              <Select value={banco} onValueChange={(v) => setBanco(v || "")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona banco —" /></SelectTrigger>
                <SelectContent>
                  {BANCOS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t bg-muted/50 px-4 py-3">
          <Button variant="outline" onClick={() => cerrar(false)} disabled={enviando}>Cancelar</Button>
          <Button className="bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5" onClick={confirmar} disabled={enviando}>
            <TickCircle className="size-3.5" /> {enviando ? "Procesando…" : "Confirmar y generar factura"}
          </Button>
        </footer>
      </DialogContent>

      <BuscarClienteDialog open={buscarClienteAbierto} onOpenChange={setBuscarClienteAbierto} onSeleccionar={seleccionarCliente} />
    </Dialog>
  );
}
