"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Ticket, CloseCircle, Building, Profile, SearchNormal1, Add, Trash, ArrowRight2, Send2, Box1 } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DecimalInput } from "@/components/ui/decimal-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReparacionDetalle } from "@/lib/reparacion-detalle";
import { Venta } from "@/lib/ventas";
import { StockPieza } from "@/lib/stock-piezas";
import type { Cliente } from "@/lib/clientes";
import { BuscarClienteDialog } from "@/components/buscar-cliente-dialog";
import { BuscarPiezaStockDialog } from "./buscar-pieza-stock-dialog";
import { METODOS_PAGO, BANCOS } from "./factura-acciones-tabs";
import { useConfirm } from "@/components/confirm-provider";

const IVA_PCT = 0.21;
// La plantilla de Sheets se amplió de 8 a 16 filas, 2026-08-27 (ver
// TICKET_MAX_LINEAS en server.js) — con los descuentos de revisión/
// anticipo/mensajería ahora auto-añadidos, 8 se llenaba solo con las
// líneas automáticas, sin dejar hueco para nada más.
const TICKET_MAX_LINEAS = 16;

interface LineaTicket {
  descripcion: string;
  cantidad: number;
  precio: number;
  /** Porcentaje (0-100) — aplicado sobre el subtotal de la línea (cantidad
      × precio) para obtener su total. Columna "DESCUENTO" añadida a la
      plantilla el 2026-08-26 (petición del usuario: descuentos por línea,
      y también "globales" poniéndolo en una única línea). */
  descuento: number;
  /** Referencia de kelatos_app.stock_piezas — solo presente si la línea
      viene de "Buscar en stock". El backend la usa para descontar
      stock_disponible al generar el ticket (petición del usuario,
      2026-08-27: "si se toma un stock... el stock debe disminuir"). */
  referencia?: string;
}

function lineaVacia(): LineaTicket {
  return { descripcion: "", cantidad: 1, precio: 0, descuento: 0 };
}

function totalLinea(l: LineaTicket): number {
  const subtotal = (Number(l.cantidad) || 0) * (Number(l.precio) || 0);
  const descuento = Math.min(100, Math.max(0, Number(l.descuento) || 0));
  return subtotal * (1 - descuento / 100);
}

const NOMBRES_TIPO_CINTA: Record<string, string> = {
  vhs: "VHS", vhsc: "VHS-C", beta: "Betamax", minidv: "MiniDV", "8mm": "8mm / Hi8", cassette: "Cassette audio", bobina: "Bobina",
};

/**
 * Puerto simplificado de construirLineasIniciales() (factura-reparacion-
 * dialog.tsx) para el caso común: mano de obra + piezas de los
 * presupuestos aceptados. "Ticket Rápido" sigue siendo la alternativa
 * simple (no agrupa por versión de presupuesto como sí hace la factura
 * real con varios presupuestos aceptados a la vez), pero SÍ replica ya
 * todos los casos especiales reales que afectan al IMPORTE final:
 * - Cintas (datos_cintas) y portes de mensajería — peticiones del
 *   usuario, 2026-08-27.
 * - Descuento de revisión pagada (-20€) y remanente de anticipo (el % que
 *   falta por cobrar tras descontar lo ya pagado como anticipo) —
 *   petición del usuario, 2026-08-27: "no está descontando ni la
 *   revisión ni el anticipo que se facturó previamente". anticipoImporte
 *   ya refleja el importe correcto tanto si el anticipo se cobró con
 *   factura real como con ticket (ver modo:"anticipo" del backend).
 */
function lineasDesdePresupuestos(detalle: ReparacionDetalle): LineaTicket[] {
  let datosCintas: { tipos?: Record<string, number>; precioUnitario?: number; precioPorCinta?: number; precioBobina?: number } | null = null;
  try {
    datosCintas = detalle.datosCintas ? JSON.parse(detalle.datosCintas) : null;
  } catch {
    datosCintas = null;
  }

  let lineas: LineaTicket[] = [];
  if (datosCintas?.tipos) {
    for (const [tipo, qty] of Object.entries(datosCintas.tipos)) {
      if (!qty || qty <= 0) continue;
      const precioReal = tipo === "bobina"
        ? (datosCintas.precioBobina ?? datosCintas.precioUnitario ?? 0)
        : (datosCintas.precioPorCinta ?? datosCintas.precioUnitario ?? 0);
      lineas.push({ descripcion: `Conversión ${NOMBRES_TIPO_CINTA[tipo] || tipo}`, cantidad: qty, precio: precioReal, descuento: 0 });
    }
  }

  if (lineas.length === 0) {
    const aceptados = detalle.presupuestos.filter((p) => p.estado === "aceptado");

    // Remanente de anticipo: mismo cálculo que construirLineasIniciales()
    // — solo se aplica mientras el ticket todavía no existe (evita volver
    // a descontar el anticipo dos veces al reabrir un ticket ya generado).
    let sumItems = 0;
    for (const p of aceptados) {
      sumItems += p.manoObra || 0;
      sumItems += p.piezas.length > 0 ? p.piezas.reduce((s, pz) => s + (pz.precio || pz.costo || 0), 0) : (p.precioPiezas || 0);
    }
    const totalPresBruto = aceptados.reduce((s, p) => s + (p.total || 0), 0);
    const baseBruta = sumItems > 0 ? sumItems : totalPresBruto;
    const anticipo = !detalle.numeroTicket && aceptados.length > 0 ? detalle.anticipoImporte || 0 : 0;
    const remFactor = anticipo > 0 && baseBruta > 0 ? Math.max(0, 1 - anticipo / baseBruta) : 1;
    const sufijo = remFactor < 1 ? ` (${Math.round(remFactor * 100)}% restante)` : "";

    for (const p of aceptados) {
      if (p.manoObra > 0) lineas.push({ descripcion: `Mano de obra${sufijo}`, cantidad: 1, precio: p.manoObra * remFactor, descuento: 0 });
      for (const pz of p.piezas) {
        const precioPieza = pz.precio || pz.costo || 0;
        if (precioPieza > 0) lineas.push({ descripcion: `${pz.descripcion || "Pieza"}${sufijo}`, cantidad: 1, precio: precioPieza * remFactor, descuento: 0 });
      }
    }
  }

  // Los dos condicionados de abajo, igual que en construirLineasIniciales(),
  // solo se aplican mientras el ticket todavía no existe (evitan
  // duplicarse al reabrir un ticket ya generado).
  if (!detalle.numeroTicket) {
    if (detalle.revisionPagada === "SI") lineas.push({ descripcion: "Descuento revisión pagada", cantidad: 1, precio: -20, descuento: 0 });
    if ((detalle.tipoRecepcion || "LOCAL") === "ENVIO") lineas.push({ descripcion: "Recogida por mensajería", cantidad: 1, precio: 12.4, descuento: 0 });
    if (detalle.entregaMensajeria === "SI") lineas.push({ descripcion: "Envío por mensajería", cantidad: 1, precio: 12.4, descuento: 0 });
  }

  return lineas.length > 0 ? lineas : [lineaVacia()];
}

/**
 * Equivalente de lineasDesdePresupuestos() para Ventas (pedidos de piezas)
 * — precarga una línea por cada pieza del pedido, con su precio de venta
 * al cliente ya fijado.
 */
function lineasDesdeVenta(venta: Venta): LineaTicket[] {
  const lineas = venta.items
    .filter((it) => it.precio > 0)
    .map((it) => ({ descripcion: it.descripcion || "Pieza", cantidad: 1, precio: it.precio, descuento: 0 }));
  return lineas.length > 0 ? lineas : [lineaVacia()];
}

function euros(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function Cabecera({ titulo, subtitulo, onClose }: { titulo: string; subtitulo: string; onClose: () => void }) {
  return (
    <header className="flex items-center gap-2 rounded-t-xl bg-primary px-4 py-3 text-primary-foreground">
      <Ticket className="size-4.5 shrink-0" />
      <DialogTitle className="text-sm font-semibold text-primary-foreground">
        {titulo} <span className="font-normal opacity-80">{subtitulo}</span>
      </DialogTitle>
      <Button variant="ghost" size="icon-sm" className="ml-auto text-primary-foreground hover:bg-white/15 hover:text-primary-foreground" onClick={onClose}>
        <CloseCircle className="size-4" />
      </Button>
    </header>
  );
}

function CampoLectura({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={valor} disabled className="bg-muted/50" />
    </div>
  );
}

/**
 * Botón "Ticket Manual" (Reparaciones, suelto) y "Ticket Rápido" (junto a
 * Facturación, en el detalle de una reparación, o en Ventas) — mismo
 * diálogo, tres modos, los tres con numeración real (ticket_venta_seq) y
 * PDF guardado en Drive:
 * - Ligado a una reparación (`resguardo` + `detalle`): líneas precargadas
 *   desde los presupuestos aceptados. NO marca entrega — igual que
 *   Facturación real, eso sigue siendo un paso aparte.
 * - Ligado a una venta (`ventaId` + `venta`): líneas precargadas desde las
 *   piezas del pedido.
 * - Suelto (sin resguardo ni ventaId) — "Ticket Manual": persiste en
 *   kelatos_app.tickets_manuales (migración 055), visible después en
 *   Facturas de Clientes con su propio ciclo de Devolución/Rectificativa/
 *   Corregida. Petición del usuario, 2026-08-27: "haz que ya no sea de
 *   pruebas que sea manual normal de ticket" — antes este modo solo
 *   descargaba un PDF de /api/tickets/generar-prueba sin persistir nada.
 *   Único modo con tarjeta de Cliente — solo el email (petición del
 *   usuario, 2026-08-27: "solo el mail solo el campo correo"), migración
 *   059. Un Ticket Rápido/de Ventas ya tiene cliente vía la reparación/venta.
 */
export function TicketManualDialog({
  open,
  onOpenChange,
  resguardo,
  detalle,
  ventaId,
  venta,
  onGenerado,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resguardo?: string;
  detalle?: ReparacionDetalle;
  ventaId?: string;
  venta?: Venta;
  onGenerado?: () => void;
}) {
  const esVenta = !!ventaId;
  const esManualStandalone = !resguardo && !esVenta;
  const [lineas, setLineas] = useState<LineaTicket[]>([lineaVacia()]);
  const [descuentoGlobal, setDescuentoGlobal] = useState(0);
  const [estado, setEstado] = useState<"Cobrada" | "Pendiente">("Cobrada");
  const [generando, setGenerando] = useState(false);
  const [resultado, setResultado] = useState<{ numeroTicket: string; urlTicket: string; id?: string } | null>(null);
  const [buscarPiezaAbierto, setBuscarPiezaAbierto] = useState(false);
  // Cliente — solo aplica al modo suelto "Ticket Manual" (petición del
  // usuario, 2026-08-27: "container de cliente... para saber a que
  // cliente con que correo se enviara"). Un Ticket Rápido/de Ventas ya
  // tiene su cliente vía la reparación/venta, así que no necesita esto.
  // Solo se pide el email (petición del usuario: "solo el mail solo el
  // campo correo") — clienteNombre ya no tiene campo propio, solo se
  // rellena si se usa "Buscar" (útil para identificar el ticket después
  // en Facturas de Clientes, pero nunca obligatorio ni editable a mano).
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [buscarClienteAbierto, setBuscarClienteAbierto] = useState(false);
  // Forma de pago — petición del usuario, 2026-08-27: "añade metodo de
  // pago en todos, copia los metodos de pago y select de eso de facturas
  // y lo pones en tickets... tiene que ser obligatorio seleccionar uno".
  // Mismo componente/validación que en facturas reales (nueva-factura-
  // manual-dialog.tsx, factura-reparacion-dialog.tsx).
  const [metodo, setMetodo] = useState("");
  const [banco, setBanco] = useState("");
  // Correo del ticket — solo aplica al Ticket Rápido ligado a una
  // reparación (petición del usuario, 2026-08-27: "coje el del resguardo
  // y si se quiere editar se envie a ese correo nuevo, cuando se entre a
  // el ticket ya no deja editar"). Se precarga con el email del cliente
  // de la reparación, editable hasta generar; después queda fijo (mismo
  // patrón que el resto de campos, disabled={!!resultado}).
  const [emailTicket, setEmailTicket] = useState("");
  // "Enviar al cliente" justo tras generar — petición del usuario,
  // 2026-08-27: "deberia de luego generar pdf y botin alado de enviar al
  // cliente y ahi doble confirmacion" — sin esto había que cerrar este
  // modal y reabrir el ticket desde otro sitio (Facturas de Clientes)
  // solo para enviarlo. Mismo mecanismo de doble confirmación que
  // TabPdfEnviar (correo destacado + useConfirm), pero inline aquí.
  const [enviandoTicket, setEnviandoTicket] = useState(false);
  const confirmar = useConfirm();

  function seleccionarCliente(c: Cliente) {
    setClienteNombre(c.nombre || "");
    setClienteEmail(c.email || "");
    toast.success("Cliente cargado");
  }

  useEffect(() => {
    if (open) {
      // Si esta reparación/venta ya tiene un ticket generado, se muestra
      // tal cual en vez de un formulario en blanco — sin esto, reabrir el
      // diálogo (p.ej. tras generar uno) ofrecía crear otro sin ningún
      // aviso, gastando un número nuevo y perdiendo el enlace anterior
      // (numero_ticket/url_ticket es una sola columna, no un historial).
      const numeroTicketPrevio = esVenta ? venta?.numeroTicket : detalle?.numeroTicket;
      const urlTicketPrevio = esVenta ? venta?.urlTicket : detalle?.urlTicket;
      const yaGenerado = !!numeroTicketPrevio;

      // Con un ticket ya generado, se muestran las líneas REALES tal como
      // se persistieron al generarlo (lineas_ticket, migración 056) — no
      // un recálculo en vivo desde los presupuestos actuales, que puede
      // no coincidir (presupuesto cambiado después) y que nunca incluye
      // el descuento global (era una línea añadida solo al enviar, no un
      // dato que lineasDesdePresupuestos() pueda reconstruir). Bug real
      // reportado por el usuario, 2026-08-27: "los importes son diferentes
      // a lo que se encuentra en el pdf. Tampoco se visualiza el
      // descuento aplicado". Igual que VistaGenerada en
      // factura-reparacion-dialog.tsx con detalle.lineasFactura.
      const lineasPersistidas = !esVenta && detalle && detalle.lineasTicket.length > 0
        ? detalle.lineasTicket.map((l) => ({ descripcion: l.descripcion, cantidad: l.cantidad, precio: l.precio, descuento: l.descuento || 0 }))
        : [];
      setLineas(
        yaGenerado && lineasPersistidas.length > 0
          ? lineasPersistidas
          : esVenta && venta ? lineasDesdeVenta(venta) : !esVenta && resguardo && detalle ? lineasDesdePresupuestos(detalle) : [lineaVacia()]
      );
      setDescuentoGlobal(0);
      const estadoTicketPrevio = esVenta ? venta?.estadoTicket : detalle?.estadoTicket;
      setEstado(estadoTicketPrevio === "Pendiente" ? "Pendiente" : "Cobrada");
      setResultado(yaGenerado ? { numeroTicket: numeroTicketPrevio, urlTicket: urlTicketPrevio || "" } : null);
      const metodoPrevio = esVenta ? venta?.formaPagoTicket : detalle?.formaPagoTicket;
      const bancoPrevio = esVenta ? venta?.bancoTicket : detalle?.bancoTicket;
      setMetodo(metodoPrevio || "");
      setBanco(bancoPrevio || "");
      if (!esVenta && !esManualStandalone && detalle) {
        setEmailTicket(yaGenerado ? detalle.clienteEmailTicket || detalle.cliente.email || "" : detalle.cliente.email || "");
      }
      if (esManualStandalone) { setClienteNombre(""); setClienteEmail(""); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function actualizarLinea(i: number, campo: keyof LineaTicket, valor: string | number) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }

  function agregarLinea() {
    if (lineas.length >= TICKET_MAX_LINEAS) return toast.error(`Máximo ${TICKET_MAX_LINEAS} líneas en la plantilla del ticket`);
    setLineas((prev) => [...prev, lineaVacia()]);
  }

  function quitarLinea(i: number) {
    setLineas((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  function agregarPiezaDesdeCatalogo(pieza: StockPieza) {
    setLineas((prev) => {
      const nueva = { descripcion: pieza.nombre, cantidad: 1, precio: pieza.precioCliente, descuento: 0, referencia: pieza.referencia };
      const primeraVacia = prev.length === 1 && !prev[0].descripcion.trim() ? 0 : -1;
      if (primeraVacia === 0) return [nueva];
      if (prev.length >= TICKET_MAX_LINEAS) {
        toast.error(`Máximo ${TICKET_MAX_LINEAS} líneas en la plantilla del ticket`);
        return prev;
      }
      return [...prev, nueva];
    });
    setBuscarPiezaAbierto(false);
  }

  // Igual que factura-reparacion-dialog.tsx: "Descuento global" es una fila
  // aparte del pie (no se mezcla con el % de cada línea) — subtotal = suma
  // de líneas ya con su propio descuento aplicado; el global se resta
  // encima de eso para dar la Base Imponible sobre la que se calcula el IVA.
  const subtotal = lineas.reduce((s, l) => s + totalLinea(l), 0);
  const descuentoGlobalPct = Math.min(100, Math.max(0, descuentoGlobal || 0));
  const descuentoGlobalImporte = (subtotal * descuentoGlobalPct) / 100;
  const baseImponible = subtotal - descuentoGlobalImporte;
  const iva = baseImponible * IVA_PCT;
  const total = baseImponible + iva;

  function cerrar(o: boolean) {
    if (generando) return;
    if (!o && esManualStandalone) {
      setClienteNombre(""); setClienteEmail("");
    }
    onOpenChange(o);
  }

  async function generar() {
    const lineasValidas = lineas.filter((l) => l.descripcion.trim() && l.cantidad > 0);
    if (lineasValidas.length === 0) return toast.error("Añade al menos una línea con descripción y cantidad");
    if (!metodo) return toast.error("Selecciona la forma de pago");
    if (metodo === "tarjeta" && !banco) return toast.error("Selecciona el banco para el pago con tarjeta");
    // El descuento global se envía como una línea propia negativa — igual
    // que factura-reparacion-dialog.tsx — para que quede reflejado y
    // visible en el PDF (la plantilla no tiene una segunda columna de
    // descuento aparte de la de línea).
    const importeGlobalRedondeado = Math.round(descuentoGlobalImporte * 100) / 100;
    if (descuentoGlobalPct > 0 && importeGlobalRedondeado > 0) {
      if (lineasValidas.length >= TICKET_MAX_LINEAS) return toast.error(`No cabe la línea del descuento global — quita alguna línea (máximo ${TICKET_MAX_LINEAS})`);
      lineasValidas.push({ descripcion: `Descuento global (${descuentoGlobalPct}%)`, cantidad: 1, precio: -importeGlobalRedondeado, descuento: 0 });
    }

    setGenerando(true);
    try {
      const url = esVenta
        ? `/api/ventas/${ventaId}/ticket-venta`
        : resguardo
          ? `/api/reparaciones/${resguardo}/ticket-venta`
          : "/api/tickets-manuales";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineas: lineasValidas,
          estado,
          formaPago: metodo,
          banco: metodo === "tarjeta" ? banco : "",
          ...(esManualStandalone
            ? { cliente: { nombre: clienteNombre.trim(), email: clienteEmail.trim() } }
            : {}),
          ...(!esVenta && !esManualStandalone ? { emailTicket: emailTicket.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Ticket ${data.numeroTicket} generado correctamente`);
      setResultado({ numeroTicket: data.numeroTicket, urlTicket: data.urlTicket, id: data.ticket?.id });
      onGenerado?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGenerando(false);
    }
  }

  // Solo disponible para Ticket Manual suelto y Ticket Rápido de
  // reparación — Ticket de Ventas todavía no tiene endpoint de envío
  // (fuera de alcance, decisión previa del usuario).
  const emailParaEnviar = esManualStandalone ? clienteEmail.trim() : !esVenta ? emailTicket.trim() : "";
  // El botón siempre está visible (petición del usuario, 2026-08-27:
  // "mejor que el boton siempre este pero en gris, deshabilitado hasta
  // que se genere la factura ya se habilite") — solo se oculta del todo
  // para Ticket de Ventas, que no tiene endpoint de envío.
  const mostrarBotonEnviar = !esVenta;
  const puedeEnviar = mostrarBotonEnviar && !!resultado && !!emailParaEnviar;

  async function enviarTicket() {
    if (!resultado) return;
    if (!emailParaEnviar) return toast.error("No hay ningún correo de destino disponible");
    const ok = await confirmar(`¿Enviar el ticket ${resultado.numeroTicket} a ${emailParaEnviar}?`);
    if (!ok) return;

    setEnviandoTicket(true);
    try {
      const url = esManualStandalone
        ? `/api/tickets-manuales/${resultado.id}/enviar`
        : `/api/reparaciones/${resguardo}/ticket-venta/enviar`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "ticket", emailDestino: emailParaEnviar }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      if (!data.enviado) throw new Error(data.motivo || "No se pudo enviar");
      toast.success(`Ticket enviado a ${emailParaEnviar}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviandoTicket(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="max-w-4xl gap-0 p-0 sm:max-w-4xl" showCloseButton={false}>
        <Cabecera
          titulo={esManualStandalone ? "Ticket Manual" : "Ticket Rápido"}
          subtitulo={esVenta ? `— Pedido #${ventaId}` : resguardo ? `— Resguardo #${resguardo}` : ""}
          onClose={() => cerrar(false)}
        />

        <ScrollArea className="max-h-[75vh]">
          <div className="space-y-4 bg-muted/30 p-4">
            {resultado && (
              <div className="space-y-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
                <div className="flex items-center justify-between gap-2">
                  <span>Ticket <strong>{resultado.numeroTicket}</strong> generado correctamente.</span>
                  {resultado.urlTicket && (
                    <Button variant="outline" size="sm" className="gap-1.5" nativeButton={false} render={<Link href={resultado.urlTicket} target="_blank" rel="noreferrer" />}>
                      Ver PDF
                    </Button>
                  )}
                </div>
                {mostrarBotonEnviar && (
                  <p className="text-xs">
                    {emailParaEnviar ? <>Se enviará a: <strong>{emailParaEnviar}</strong></> : "Sin correo de destino — vuelve a Cliente/Correo para añadir uno."}
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-4">
              <CampoLectura label="Serie / Código" valor={resultado?.numeroTicket || "Se asignará al generar"} />
              <CampoLectura label="Fecha" valor={new Date().toLocaleDateString("es-ES")} />
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Estado</Label>
                <Select value={estado} onValueChange={(v) => setEstado(v === "Pendiente" ? "Pendiente" : "Cobrada")} disabled={!!resultado}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cobrada">Cobrada</SelectItem>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Forma de pago *</Label>
                <Select value={metodo} onValueChange={(v) => { setMetodo(v || ""); if (v !== "tarjeta") setBanco(""); }} disabled={!!resultado}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona —" /></SelectTrigger>
                  <SelectContent>
                    {METODOS_PAGO.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {metodo === "tarjeta" && (
                  <>
                    <Label className="mt-1.5 block text-xs text-muted-foreground">Banco *</Label>
                    <Select value={banco} onValueChange={(v) => setBanco(v || "")} disabled={!!resultado}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona banco —" /></SelectTrigger>
                      <SelectContent>
                        {BANCOS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            </div>

            {!esVenta && !esManualStandalone && (
              <div className="space-y-1">
                <Label htmlFor="tmEmailTicket" className="text-xs text-muted-foreground">
                  Correo del cliente (tomado del resguardo — edítalo si el ticket debe enviarse a otro correo)
                </Label>
                <Input
                  id="tmEmailTicket"
                  type="email"
                  value={emailTicket}
                  onChange={(e) => setEmailTicket(e.target.value)}
                  disabled={!!resultado}
                  placeholder="correo@ejemplo.com"
                />
              </div>
            )}

            <div className="rounded-lg border bg-card shadow-sm">
              <div className="flex items-center gap-1.5 rounded-t-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white">
                <Building className="size-3.5" /> Emisor
              </div>
              <div className="space-y-0.5 p-3 text-xs">
                <p className="font-semibold">AFFIRMA TECHNOLOGY GROUP S.L.</p>
                <p>N.I.F.: B72990443</p>
                <p className="text-muted-foreground">Blasco de Garay 63 BJ 2, 28015 Madrid</p>
                <p className="text-muted-foreground">914 468 503</p>
              </div>
            </div>

            {esManualStandalone && (
              <div className="rounded-lg border bg-card shadow-sm">
                <div className="flex items-center justify-between gap-1.5 rounded-t-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">
                  <span className="flex items-center gap-1.5"><Profile className="size-3.5" /> Cliente</span>
                  <Button size="sm" variant="secondary" className="h-6 gap-1 px-2 text-xs" onClick={() => setBuscarClienteAbierto(true)} disabled={!!resultado}>
                    <SearchNormal1 className="size-3" /> Buscar
                  </Button>
                </div>
                <div className="p-3">
                  <div className="space-y-1">
                    <Label htmlFor="tmEmail" className="text-xs text-muted-foreground">Email</Label>
                    <Input id="tmEmail" type="email" className="h-8 text-sm" value={clienteEmail} onChange={(e) => setClienteEmail(e.target.value)} disabled={!!resultado} />
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg border bg-card shadow-sm">
              <div className="flex items-center justify-between rounded-t-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
                <span>Conceptos</span>
                {!resultado && (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-xs text-white hover:bg-white/15 hover:text-white" onClick={() => setBuscarPiezaAbierto(true)}>
                      <Box1 className="size-3" /> Buscar en stock
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-xs text-white hover:bg-white/15 hover:text-white" onClick={agregarLinea} disabled={lineas.length >= TICKET_MAX_LINEAS}>
                      <Add className="size-3" /> Añadir línea
                    </Button>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">Descripción</th>
                      <th className="w-16 px-2 py-1.5 text-center font-medium">Cantidad</th>
                      <th className="w-24 px-2 py-1.5 text-right font-medium">Precio unidad</th>
                      <th className="w-24 px-2 py-1.5 text-right font-medium">Subtotal</th>
                      <th className="w-20 px-2 py-1.5 text-center font-medium">Descuento</th>
                      <th className="w-24 px-2 py-1.5 text-right font-medium">Total</th>
                      <th className="w-7 px-1 py-1.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((l, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-1"><Input className="h-8 text-sm" placeholder="Descripción" value={l.descripcion} onChange={(e) => actualizarLinea(i, "descripcion", e.target.value)} disabled={!!resultado} /></td>
                        <td className="p-1"><DecimalInput className="h-8 text-center text-sm" value={l.cantidad} onChange={(n) => actualizarLinea(i, "cantidad", n)} disabled={!!resultado} /></td>
                        <td className="p-1"><DecimalInput className="h-8 text-right text-sm" value={l.precio} onChange={(n) => actualizarLinea(i, "precio", n)} disabled={!!resultado} /></td>
                        <td className="px-2 py-1 text-right text-muted-foreground">{euros((Number(l.cantidad) || 0) * (Number(l.precio) || 0))}</td>
                        <td className="p-1">
                          <div className="relative">
                            <DecimalInput className="h-8 pr-5 text-right text-sm" value={l.descuento} onChange={(n) => actualizarLinea(i, "descuento", Math.min(100, Math.max(0, n)))} disabled={!!resultado} />
                            <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                          </div>
                        </td>
                        <td className="px-2 py-1 text-right font-medium">{euros(totalLinea(l))}</td>
                        <td className="p-1">
                          {!resultado && (
                            <Button size="icon-sm" variant="ghost" className="text-destructive" onClick={() => quitarLinea(i)} disabled={lineas.length === 1}>
                              <Trash className="size-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="text-sm">
                    <tr className="border-t bg-muted/30">
                      <td colSpan={5}></td>
                      <td className="px-2 py-1 text-right text-xs text-muted-foreground">Base imponible</td>
                      <td className="px-2 py-1 text-right font-medium">{euros(subtotal)}</td>
                    </tr>
                    <tr className="bg-muted/30">
                      <td colSpan={5}></td>
                      <td className="px-2 py-1 text-right text-xs text-muted-foreground">Descuento global</td>
                      <td className="p-1">
                        <div className="relative">
                          <DecimalInput
                            className="h-8 pr-5 text-right text-sm"
                            value={descuentoGlobal}
                            onChange={(n) => setDescuentoGlobal(Math.min(100, Math.max(0, n)))}
                            disabled={!!resultado}
                          />
                          <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="bg-muted/30">
                      <td colSpan={5}></td>
                      <td className="px-2 py-1 text-right text-xs text-muted-foreground">IVA (21%)</td>
                      <td className="px-2 py-1 text-right font-medium">{euros(iva)}</td>
                    </tr>
                    <tr className="border-t bg-primary/5">
                      <td colSpan={5}></td>
                      <td className="px-2 py-1.5 text-right text-xs font-semibold">TOTAL</td>
                      <td className="px-2 py-1.5 text-right text-base font-bold">{euros(total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {!esManualStandalone && !resultado && (
              <p className="text-xs text-muted-foreground">
                Esto solo genera el ticket — para marcar el equipo como entregado, usa "Entregado en Local" o "Marcar como enviado" aparte, igual que con Facturación.
              </p>
            )}
          </div>
        </ScrollArea>

        <footer className="flex justify-end gap-2 border-t bg-card px-4 py-3">
          <Button variant="secondary" onClick={() => cerrar(false)} disabled={generando}>
            {resultado ? "Cerrar" : "Cancelar"}
          </Button>
          {!resultado && (
            <Button className="gap-1.5" onClick={generar} disabled={generando}>
              <ArrowRight2 className="size-4" /> {generando ? "Generando…" : "Generar PDF"}
            </Button>
          )}
          {mostrarBotonEnviar && (
            <Button className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={enviarTicket} disabled={!puedeEnviar || enviandoTicket}>
              <Send2 className="size-4" /> {enviandoTicket ? "Enviando…" : "Enviar al cliente"}
            </Button>
          )}
        </footer>
      </DialogContent>

      <BuscarPiezaStockDialog open={buscarPiezaAbierto} onOpenChange={setBuscarPiezaAbierto} onSeleccionar={agregarPiezaDesdeCatalogo} />
      {esManualStandalone && (
        <BuscarClienteDialog open={buscarClienteAbierto} onOpenChange={setBuscarClienteAbierto} onSeleccionar={seleccionarCliente} />
      )}
    </Dialog>
  );
}
