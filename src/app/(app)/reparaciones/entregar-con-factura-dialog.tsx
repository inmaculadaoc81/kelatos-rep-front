"use client";

import { useState } from "react";
import { BoxTick, Truck, Trash, TickCircle, CloseCircle, DocumentText, Profile, SearchNormal1, Ticket, Receipt } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ReparacionDetalle } from "@/lib/reparacion-detalle";
import { Cliente } from "@/lib/clientes";
import { BuscarClienteDialog } from "@/components/buscar-cliente-dialog";

export type TipoEntregaModal = "ENTREGADO" | "ENVIO" | "RECICLAJE";

const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta bancaria" },
  { value: "transferencia", label: "Transferencia bancaria" },
  { value: "bizum", label: "Bizum" },
];
const BANCOS = ["Santander", "Sabadell", "BBVA", "CaixaBank"];
const ESTADOS_SIN_FACTURA = ["presupuesto rechazado", "no tiene reparación", "no tiene reparacion", "garantía", "garantia"];

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function tituloEIcono(tipoEntrega: TipoEntregaModal) {
  if (tipoEntrega === "ENVIO") return { titulo: "Envío por Mensajería", icono: Truck };
  if (tipoEntrega === "RECICLAJE") return { titulo: "Enviar a Punto Limpio", icono: Trash };
  return { titulo: "Entregar Equipo", icono: BoxTick };
}

/** Reproduce el texto dinámico de btnEntregarConfirmar (guardarEntregarEquipo/abrirModalEntregarEquipo, Index.html). */
function textoBoton(tipoEntrega: TipoEntregaModal, sinNuevaFactura: boolean, doc: "factura" | "ticket" = "factura"): string {
  const esEnvio = tipoEntrega === "ENVIO";
  const esReciclaje = tipoEntrega === "RECICLAJE";
  if (sinNuevaFactura) {
    return esEnvio ? "Registrar envío" : esReciclaje ? "Enviar a punto limpio" : "Marcar como entregado";
  }
  const verbo = doc === "ticket" ? "Emitir ticket" : "Emitir factura";
  return esReciclaje ? `${verbo} y enviar a punto limpio` : esEnvio ? `${verbo} y registrar envío` : `${verbo} y marcar entregado`;
}

interface InfoEntrega {
  sinNuevaFactura: boolean;
  mostrarEnvio: boolean;
  gastosEnvioDefault: number;
  totalBase: number;
  /** "No tiene Reparación" / "Presupuesto Rechazado": nunca hay cargo de
      reparación, solo (si aplica) el trayecto de mensajería — por eso aquí
      también se puede elegir Ticket en vez de Factura. Petición del
      usuario, 2026-08-27: "Cuando se da a Sin Reparación por falta de
      pieza tampoco da la opción de generar ticket. Lo mismo... Ppto
      Rechazado" — antes el ticket solo se ofrecía con tipoEntrega="ENVIO"
      (el botón "Facturar y Enviar por Mensajería"), pero estos dos
      estados también pasan por aquí con tipoEntrega="ENTREGADO"/
      "RECICLAJE" cuando el equipo se recibió por mensajería y se recoge/
      desecha en local. */
  estadoSinFactura: boolean;
}

function calcularInfo(detalle: ReparacionDetalle, esEnvio: boolean): InfoEntrega {
  const recibidoMensajeria = (detalle.tipoRecepcion || "LOCAL") === "ENVIO";
  const tieneFact = !!detalle.numeroFactura;
  const tieneFactEnvio = !!detalle.numeroFacturaMensajeria || !!detalle.numeroTicketMensajeria;
  const estadoSinFactura = ESTADOS_SIN_FACTURA.includes((detalle.estado || "").toLowerCase());
  // Si el equipo se recibió por mensajería (recibidoMensajeria), el cobro
  // de "recogida" existe también fuera de tipoEntrega="ENVIO" —
  // "Entregado en Local"/"Enviar a punto limpio" abren este mismo diálogo
  // (tipoEntrega ENTREGADO/RECICLAJE) para No tiene Reparación/Presupuesto
  // Rechazado. Antes solo comprobaba tieneFactEnvio cuando esEnvio era
  // true: generar el ticket desde "Enviar a punto limpio" no bloqueaba
  // luego volver a abrir "Entregado en Local" para el mismo resguardo y
  // generar OTRO documento del mismo cobro. Bug real reportado, 2026-08-27.
  const sinNuevaFactura = esEnvio
    ? tieneFactEnvio || tieneFact
    : tieneFact || (estadoSinFactura && (recibidoMensajeria ? tieneFactEnvio : true));
  const mostrarEnvio = esEnvio || recibidoMensajeria;
  const gastosEnvioDefault = esEnvio && recibidoMensajeria ? 24.8 : 12.4;

  let totalBase = 0;
  if (!esEnvio && !estadoSinFactura) {
    const ppto = detalle.presupuestos.find((p) => p.estado.toLowerCase() === "aceptado");
    if (ppto) {
      totalBase = Math.max(0, ppto.manoObra + ppto.precioPiezas - (detalle.revisionPagada === "SI" ? 20 : 0));
    }
  }
  return { sinNuevaFactura, mostrarEnvio, gastosEnvioDefault, totalBase, estadoSinFactura };
}

/**
 * Reproduce abrirModalEntregarEquipo()/guardarEntregarEquipo() (Index.html)
 * — el modal genérico de salida que decide si hace falta generar una
 * factura nueva (reparación pendiente de cobro + gastos de envío/recogida)
 * antes de marcar la salida, o si basta con confirmar directamente porque
 * ya existe factura o el caso no la requiere. La sección "Entrega" (fecha
 * de hoy, observaciones, reseña) es COMÚN a las dos rutas — el original
 * siempre la muestra, tenga o no factura nueva que emitir.
 * Tres disparadores: "Entregado en Local" cuando es _garantiaConRecojo
 * (tipoEntrega ENTREGADO), "Facturar y Enviar por Mensajería" (ENVIO), y
 * "Enviar a Punto Limpio" cuando el equipo se recibió por mensajería
 * (RECICLAJE) — los tres reutilizan el mismo modal en el original.
 */
export function EntregarConFacturaDialog({
  detalle,
  tipoEntrega,
  open,
  onOpenChange,
  onCompletado,
}: {
  detalle: ReparacionDetalle;
  tipoEntrega: TipoEntregaModal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompletado: () => void;
}) {
  const esEnvio = tipoEntrega === "ENVIO";
  const info = calcularInfo(detalle, esEnvio);

  if (info.sinNuevaFactura) {
    return (
      <VistaSinFactura
        detalle={detalle}
        tipoEntrega={tipoEntrega}
        open={open}
        onOpenChange={onOpenChange}
        onCompletado={onCompletado}
      />
    );
  }
  return (
    <VistaConFactura
      detalle={detalle}
      tipoEntrega={tipoEntrega}
      info={info}
      open={open}
      onOpenChange={onOpenChange}
      onCompletado={onCompletado}
    />
  );
}

function Cabecera({ titulo, icono: Icono, onClose }: { titulo: string; icono: typeof BoxTick; onClose: () => void }) {
  return (
    <header className="flex items-center gap-2 rounded-t-xl bg-primary px-4 py-3 text-primary-foreground">
      <Icono className="size-4.5 shrink-0" />
      <DialogTitle className="text-sm font-semibold text-primary-foreground">{titulo}</DialogTitle>
      <Button variant="ghost" size="icon-sm" className="ml-auto text-primary-foreground hover:bg-white/15 hover:text-primary-foreground" onClick={onClose}>
        <CloseCircle className="size-4" />
      </Button>
    </header>
  );
}

/** Reproduce la sección "Entrega" del modal (fecha/observaciones/reseña) — común a las dos vistas. */
function SeccionEntrega({
  observaciones,
  setObservaciones,
  resena,
  setResena,
}: {
  observaciones: string;
  setObservaciones: (v: string) => void;
  resena: "SI" | "NO";
  setResena: (v: "SI" | "NO") => void;
}) {
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold"><TickCircle className="size-4 text-emerald-600" /> Entrega</p>
      <div className="max-w-56 space-y-1.5">
        <Label>Fecha de entrega</Label>
        <Input value={hoyIso().split("-").reverse().join("/")} disabled className="bg-muted/50" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="entObservaciones">Observaciones (opcional)</Label>
        <Textarea id="entObservaciones" rows={2} placeholder="Ej: Cliente satisfecho" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Reseña *</Label>
        <div className="flex gap-1.5">
          <Button type="button" size="sm" variant={resena === "SI" ? "default" : "outline"} className={resena === "SI" ? "bg-emerald-600 hover:bg-emerald-700" : ""} onClick={() => setResena("SI")}>
            Sí
          </Button>
          <Button type="button" size="sm" variant={resena === "NO" ? "secondary" : "outline"} onClick={() => setResena("NO")}>
            No
          </Button>
        </div>
      </div>
    </div>
  );
}

function VistaSinFactura({
  detalle,
  tipoEntrega,
  open,
  onOpenChange,
  onCompletado,
}: {
  detalle: ReparacionDetalle;
  tipoEntrega: TipoEntregaModal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompletado: () => void;
}) {
  const [observaciones, setObservaciones] = useState("");
  const [resena, setResena] = useState<"SI" | "NO">("NO");
  const [enviando, setEnviando] = useState(false);
  const esEnvio = tipoEntrega === "ENVIO";
  const { titulo, icono } = tituloEIcono(tipoEntrega);
  // Reproduce entFacturaExistente: esEnvio usa numeroFacturaMensajeria si
  // existe (si no, cae al ticket de mensajería, y si tampoco a numeroFactura).
  // ENTREGADO/RECICLAJE usan numeroFactura si existe, y si no, también
  // caen al ticket/factura de mensajería — necesario desde que
  // sinNuevaFactura (arriba) también los tiene en cuenta ahí: sin esto, el
  // ticket ya generado desde "Enviar a punto limpio" quedaba invisible al
  // reabrir "Entregado en Local" ("No aplica factura en este caso" pese a
  // existir un documento real). El ticket es una alternativa a la factura
  // de mensajería (petición del usuario, 2026-08-27) — nunca coexisten
  // para el mismo resguardo.
  const esTicketExistente = esEnvio
    ? !detalle.numeroFacturaMensajeria && !!detalle.numeroTicketMensajeria
    : !detalle.numeroFactura && !detalle.numeroFacturaMensajeria && !!detalle.numeroTicketMensajeria;
  const facturaExistenteNum = esEnvio
    ? detalle.numeroFacturaMensajeria || detalle.numeroTicketMensajeria || detalle.numeroFactura
    : detalle.numeroFactura || detalle.numeroFacturaMensajeria || detalle.numeroTicketMensajeria;
  const facturaExistenteUrl = esEnvio
    ? detalle.urlFacturaMensajeria || detalle.urlTicketMensajeria || detalle.urlFactura
    : detalle.urlFactura || detalle.urlFacturaMensajeria || detalle.urlTicketMensajeria;

  function cerrar(o: boolean) {
    if (enviando) return;
    onOpenChange(o);
  }

  async function confirmar() {
    setEnviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${detalle.resguardo}/salidas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fechaRecogida: hoyIso(),
          tipoEntrega,
          numeroFactura: "",
          resena,
          observaciones,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(esEnvio ? "Envío registrado" : tipoEntrega === "RECICLAJE" ? "Equipo enviado a punto limpio" : "Equipo marcado como entregado");
      onOpenChange(false);
      onCompletado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="gap-0 p-0 sm:max-w-xl" showCloseButton={false}>
        <Cabecera titulo={titulo} icono={icono} onClose={() => cerrar(false)} />
        <div className="space-y-4 p-4">
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            {facturaExistenteNum ? (
              <>{esTicketExistente ? "Ticket ya generado" : "Factura ya generada"}: <strong className="text-foreground">{facturaExistenteNum}</strong>{facturaExistenteUrl && (
                <a href={facturaExistenteUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:underline">Ver PDF</a>
              )}</>
            ) : (
              "No aplica factura en este caso."
            )}
          </div>
          <SeccionEntrega observaciones={observaciones} setObservaciones={setObservaciones} resena={resena} setResena={setResena} />
        </div>
        <footer className="flex justify-end gap-2 border-t bg-muted/50 px-4 py-3">
          <Button variant="outline" onClick={() => cerrar(false)} disabled={enviando}>Cancelar</Button>
          <Button className="gap-1.5" onClick={confirmar} disabled={enviando}>
            <TickCircle className="size-3.5" /> {enviando ? "Guardando…" : textoBoton(tipoEntrega, true)}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function VistaConFactura({
  detalle,
  tipoEntrega,
  info,
  open,
  onOpenChange,
  onCompletado,
}: {
  detalle: ReparacionDetalle;
  tipoEntrega: TipoEntregaModal;
  info: InfoEntrega;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompletado: () => void;
}) {
  const esEnvio = tipoEntrega === "ENVIO";
  // Se puede elegir ticket en vez de factura siempre que el único cargo
  // posible sea el de mensajería — "No tiene Reparación"/"Presupuesto
  // Rechazado" (info.estadoSinFactura), sea cual sea tipoEntrega: petición
  // del usuario, 2026-08-27. Al principio solo se ofrecía con
  // tipoEntrega="ENVIO" ("Facturar y Enviar por Mensajería"), pero estos
  // mismos estados también llegan aquí con "ENTREGADO"/"RECICLAJE" cuando
  // el equipo se recibió por mensajería y se recoge/desecha en local — se
  // reportó que ahí seguía faltando la opción. "Reparado"+Garantía (el
  // tercer caso que sí ofrece el botón) se deja fuera a propósito: ese
  // cargo de reparación si puede ser real, no solo mensajería.
  const permiteTicket = info.estadoSinFactura;
  const [tipoDocumento, setTipoDocumento] = useState<"factura" | "ticket">("factura");
  const esTicket = permiteTicket && tipoDocumento === "ticket";
  const [nombre, setNombre] = useState(detalle.cliente.nombre || "");
  const [direccion, setDireccion] = useState(detalle.cliente.direccion || "");
  const [dni, setDni] = useState(detalle.dniCif || "");
  const [telefono, setTelefono] = useState(detalle.cliente.telefono || "");
  const [gastosEnvio, setGastosEnvio] = useState(String(info.gastosEnvioDefault));
  const [metodo, setMetodo] = useState("");
  const [banco, setBanco] = useState("");
  const [email, setEmail] = useState(detalle.cliente.email || "");
  const [observaciones, setObservaciones] = useState("");
  const [resena, setResena] = useState<"SI" | "NO">("NO");
  const [enviando, setEnviando] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [buscarClienteAbierto, setBuscarClienteAbierto] = useState(false);
  const { titulo, icono } = tituloEIcono(tipoEntrega);

  const gastosEnvioNum = info.mostrarEnvio ? parseFloat(gastosEnvio) || 0 : 0;
  const totalSinIva = esEnvio ? gastosEnvioNum : info.totalBase + gastosEnvioNum;
  const totalConIva = totalSinIva * 1.21;

  function seleccionarCliente(c: Cliente) {
    setNombre(c.nombre || "");
    setDireccion(c.direccion || "");
    setDni(c.dniCif || "");
    setTelefono(c.telefono || "");
    setEmail(c.email || "");
    toast.success("Cliente cargado");
  }

  function cerrar(o: boolean) {
    if (enviando) return;
    if (!o) setRequestId(null);
    onOpenChange(o);
  }

  async function confirmar() {
    if (!esTicket && !nombre.trim()) return toast.error("El nombre del cliente es obligatorio");
    if (!metodo) return toast.error("Selecciona la forma de pago");
    if (metodo === "tarjeta" && !banco) return toast.error("Selecciona el banco para el pago con tarjeta");

    const lineas: { descripcion: string; cantidad: number; precio: number }[] = [];
    if (!esEnvio && info.totalBase > 0) {
      lineas.push({ descripcion: "Reparación", cantidad: 1, precio: info.totalBase });
    }
    if (info.mostrarEnvio) {
      // Reproduce _apiEntregarConFacturaSql (Code.js): descripción según
      // qué trayecto se factura de verdad — evita que "Gastos de envío"
      // genérico esconda que se están cobrando los DOS trayectos (24,80€
      // en vez de los 12,40€ habituales, confuso sin esta aclaración).
      const recibidoMensajeria = (detalle.tipoRecepcion || "LOCAL") === "ENVIO";
      const descripcionEnvio = recibidoMensajeria && esEnvio
        ? "Servicio de mensajería (recogida y envío)"
        : recibidoMensajeria
          ? "Servicio de mensajería (recogida)"
          : "Servicio de envío a domicilio";
      lineas.push({ descripcion: descripcionEnvio, cantidad: 1, precio: gastosEnvioNum });
    }
    if (lineas.length === 0) return toast.error("No hay ningún importe que facturar");

    setEnviando(true);
    const rid = requestId || crypto.randomUUID();
    setRequestId(rid);
    try {
      let data: { ok: boolean; error?: string; numeroFactura?: string; numeroTicket?: string };
      if (esTicket) {
        // El ticket-venta genérico no marca entrega por sí solo (igual que
        // Facturación real) — aquí sí hace falta el segundo paso a
        // /salidas, como ya hace VistaSinFactura. numeroFactura: "" porque
        // este documento es un ticket, no una factura — no debe pisar
        // reparaciones.numero_factura.
        const resTicket = await fetch(`/api/reparaciones/${detalle.resguardo}/ticket-venta`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineas, estado: "Cobrada", formaPago: metodo, banco, modo: "mensajeria" }),
        });
        data = await resTicket.json();
        if (!data.ok) throw new Error(data.error || "Error desconocido");
        const resSalida = await fetch(`/api/reparaciones/${detalle.resguardo}/salidas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fechaRecogida: hoyIso(), tipoEntrega, numeroFactura: "", resena, observaciones }),
        });
        const dataSalida = await resSalida.json();
        if (!dataSalida.ok) throw new Error(dataSalida.error || "Error desconocido");
      } else {
        const formaPago = metodo === "tarjeta" && banco ? `${banco} · tarjeta bancaria` : metodo;
        const res = await fetch(`/api/reparaciones/${detalle.resguardo}/facturas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: rid,
            tipo: "mensajeria",
            datos: {
              cliente: { nombre: nombre.trim(), direccion: direccion.trim(), dni: dni.trim(), telefono: telefono.trim(), email },
              formaPago,
              lineas,
              // El cliente paga en el momento de confirmar este modal (misma
              // razón que "revision": la forma de pago se elige aquí mismo) —
              // sin esto, generarFacturaPdfDesdeSheet caía al valor por
              // defecto "Pendiente" aunque ya se hubiera cobrado en efectivo.
              estadoFactura: "Cobrada",
            },
            incluirEntrega: true,
            entregaDatos: { fecha: hoyIso(), tipoEntrega, resena, observaciones },
          }),
        });
        data = await res.json();
        if (!data.ok) throw new Error(data.error || "Error desconocido");
      }
      const accionTxt = esEnvio ? "Envío registrado" : tipoEntrega === "RECICLAJE" ? "Equipo enviado a punto limpio" : "Equipo entregado";
      const docTxt = esTicket ? `Ticket ${data.numeroTicket} generado` : `Factura ${data.numeroFactura} generada`;
      toast.success(`${accionTxt} — ${docTxt}`);
      setRequestId(null);
      onOpenChange(false);
      onCompletado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl" showCloseButton={false}>
        <Cabecera titulo={titulo} icono={icono} onClose={() => cerrar(false)} />
        <div className="space-y-4 p-4">
          <div className="space-y-3">
            <p className="flex items-center gap-1.5 border-b pb-2 text-sm font-semibold">
              {permiteTicket ? (
                <>
                  <Receipt className="size-4 text-primary" /> Documento
                </>
              ) : esTicket ? (
                <>
                  <Ticket className="size-4 text-primary" /> Ticket
                </>
              ) : (
                <>
                  <DocumentText className="size-4 text-primary" /> Factura
                </>
              )}
            </p>
            {permiteTicket && (
              <div className="flex gap-1.5">
                <Button type="button" size="sm" variant={tipoDocumento === "factura" ? "default" : "outline"} className="gap-1.5" onClick={() => setTipoDocumento("factura")}>
                  <DocumentText className="size-3.5" /> Factura
                </Button>
                <Button type="button" size="sm" variant={tipoDocumento === "ticket" ? "default" : "outline"} className="gap-1.5" onClick={() => setTipoDocumento("ticket")}>
                  <Ticket className="size-3.5" /> Ticket
                </Button>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {esTicket
                ? "Ticket del cobro de mensajería únicamente — no hay cargo de reparación."
                : esEnvio
                  ? "Factura de envío únicamente — la reparación se factura por separado."
                  : info.totalBase > 0
                    ? "Verifica los datos del cliente y confirma el cobro pendiente de la reparación."
                    : "Sin cargo de reparación — solo se facturarán gastos de envío si aplica."}
            </p>

            {info.mostrarEnvio && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="efGastosEnvio">Gastos de envío (€)</Label>
                  <Input id="efGastosEnvio" type="number" min={0} step="0.01" value={gastosEnvio} onChange={(e) => setGastosEnvio(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <div className="w-full rounded-md bg-emerald-50 px-3 py-1.5 text-center text-sm dark:bg-emerald-500/10">
                    <p className="text-xs text-muted-foreground">Total a cobrar</p>
                    <p className="font-semibold text-emerald-700 dark:text-emerald-400">{totalConIva.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Forma de pago *</Label>
                <Select value={metodo} onValueChange={(v) => { setMetodo(v || ""); if (v !== "tarjeta") setBanco(""); }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="— Seleccionar —" /></SelectTrigger>
                  <SelectContent>
                    {METODOS_PAGO.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {!esTicket && (
                <div className="space-y-1.5">
                  <Label htmlFor="efEmail">Email para enviar factura (opcional)</Label>
                  <Input id="efEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              )}
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

            {!esTicket && (
              <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-sm font-semibold"><Profile className="size-4 text-muted-foreground" /> Cliente en la factura</p>
                  <Button type="button" size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => setBuscarClienteAbierto(true)}>
                    <SearchNormal1 className="size-3" /> Buscar
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="efNombre">Nombre *</Label>
                  <Input id="efNombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="efDni">DNI / CIF</Label>
                    <Input id="efDni" value={dni} onChange={(e) => setDni(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="efTelefono">Teléfono</Label>
                    <Input id="efTelefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="efDireccion">Dirección</Label>
                  <Input id="efDireccion" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <hr />

          <SeccionEntrega observaciones={observaciones} setObservaciones={setObservaciones} resena={resena} setResena={setResena} />
        </div>
        <footer className="flex justify-end gap-2 border-t bg-muted/50 px-4 py-3">
          <Button variant="outline" onClick={() => cerrar(false)} disabled={enviando}>Cancelar</Button>
          <Button className="gap-1.5" onClick={confirmar} disabled={enviando}>
            <TickCircle className="size-3.5" /> {enviando ? "Procesando…" : textoBoton(tipoEntrega, false, esTicket ? "ticket" : "factura")}
          </Button>
        </footer>
      </DialogContent>
      <BuscarClienteDialog open={buscarClienteAbierto} onOpenChange={setBuscarClienteAbierto} onSeleccionar={seleccionarCliente} />
    </Dialog>
  );
}
