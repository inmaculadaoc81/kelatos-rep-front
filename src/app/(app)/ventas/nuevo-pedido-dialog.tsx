"use client";

import { useEffect, useMemo, useState } from "react";
import { Add, Trash, ShoppingCart, ShieldTick, Building, Profile, Ticket, Send2, SearchNormal1, Refresh2 } from "@/lib/icons";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-provider";
import { BuscarClienteDialog } from "@/components/buscar-cliente-dialog";
import type { Cliente } from "@/lib/clientes";
import { DatosNuevoPedido, ItemPedidoForm, FormaPagoPedido } from "@/lib/ventas";
import { esEmailValido } from "@/lib/validacion";
import { guardarSuReferencia } from "@/lib/su-referencia";

const FORMAS_PAGO: { value: FormaPagoPedido; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta bancaria" },
  { value: "transferencia", label: "Transferencia bancaria" },
  { value: "bizum", label: "Bizum" },
];
const BANCOS = ["Santander", "Sabadell", "BBVA", "CaixaBank"];

function euros(n: number): string {
  return (n || 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function vacio(): DatosNuevoPedido {
  return {
    esGarantia: false,
    modoTicket: false,
    clienteDni: "",
    clienteNombre: "",
    clienteTelefono: "",
    clienteEmail: "",
    clienteDireccion: "",
    formaPago: "",
    banco: "",
    descuentoPct: 0,
    observaciones: "",
    items: [itemVacio()],
  };
}

function itemVacio(): ItemPedidoForm {
  return { descripcion: "", cantidad: 1, precioUnitario: 0 };
}

function fechaHoyCorta(): string {
  return new Date().toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });
}

/**
 * Reproduce #modalNuevoPedido (abrirModalNuevoPedido/generarFacturaPedido)
 * — el modal real al que lleva el botón "Nuevo Pedido" (modalNuevaVenta y
 * guardarNuevaVenta existen en el original pero no los llama ningún botón:
 * es código muerto, no se replica). En modo normal reserva un número de
 * factura real (serie 1) y genera el PDF antes de crear el pedido; en
 * modo Garantía no hay factura ni cobro.
 */
export function NuevoPedidoDialog({ onCreado }: { onCreado: () => void }) {
  const confirmar = useConfirm();
  const [open, setOpen] = useState(false);
  const [datos, setDatos] = useState<DatosNuevoPedido>(vacio());
  const [suReferencia, setSuReferencia] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [numeroPreview, setNumeroPreview] = useState("");
  // Resultado del modo Ticket — a diferencia de Factura/Garantía, el
  // diálogo NO se cierra al generar: se queda abierto con el botón
  // "Enviar al cliente" deshabilitado hasta ese momento y habilitado en
  // cuanto el ticket existe. Petición del usuario, 2026-08-28: "un boton
  // para enviar, primero que este deshabilitado, cuando se genere el
  // ticket se habilite".
  const [resultadoTicket, setResultadoTicket] = useState<{ ventaId: string; numeroTicket: string; urlTicket: string } | null>(null);
  const [enviandoTicket, setEnviandoTicket] = useState(false);
  const [buscarClienteAbierto, setBuscarClienteAbierto] = useState(false);

  useEffect(() => {
    if (open) {
      setDatos(vacio());
      setSuReferencia("");
      setNumeroPreview("");
      setResultadoTicket(null);
      fetch("/api/ventas/nuevo-pedido/peek")
        .then((r) => r.json())
        .then((data) => { if (data.ok) setNumeroPreview(data.numero); })
        .catch(() => {});
    }
  }, [open]);

  function actualizar<K extends keyof DatosNuevoPedido>(campo: K, valor: DatosNuevoPedido[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  function actualizarItem(i: number, campo: keyof ItemPedidoForm, valor: string | number) {
    setDatos((prev) => ({ ...prev, items: prev.items.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it)) }));
  }

  const { base, descuentoAmt, iva, total } = useMemo(() => {
    const baseCalc = datos.items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);
    const pct = Math.min(100, Math.max(0, datos.descuentoPct || 0));
    const descAmt = (baseCalc * pct) / 100;
    const baseDesc = baseCalc - descAmt;
    const ivaCalc = (baseDesc * 21) / 100;
    return { base: baseCalc, descuentoAmt: descAmt, iva: ivaCalc, total: baseDesc + ivaCalc };
  }, [datos.items, datos.descuentoPct]);

  function seleccionarCliente(c: Cliente) {
    setDatos((prev) => ({
      ...prev,
      clienteDni: c.dniCif || "",
      clienteNombre: c.nombre || "",
      clienteTelefono: c.telefono || "",
      clienteEmail: c.email || "",
      clienteDireccion: c.direccion || "",
    }));
    toast.success("Cliente cargado");
  }

  // Tras generar un Ticket, el pie solo ofrecía "Cerrar"/"Enviar al
  // cliente" — para volver a la vista de Factura había que cerrar el
  // diálogo entero y reabrirlo (queja real del usuario, 2026-09-02).
  // Reinicia el formulario sin cerrar el diálogo.
  function nuevoPedido() {
    setDatos(vacio());
    setSuReferencia("");
    setResultadoTicket(null);
    fetch("/api/ventas/nuevo-pedido/peek")
      .then((r) => r.json())
      .then((data) => { if (data.ok) setNumeroPreview(data.numero); })
      .catch(() => {});
  }

  function toggleGarantia() {
    setDatos((prev) => ({ ...prev, esGarantia: !prev.esGarantia, modoTicket: false }));
  }

  function toggleTicket() {
    setDatos((prev) => ({ ...prev, modoTicket: !prev.modoTicket, esGarantia: false }));
  }

  async function guardar() {
    if (!datos.clienteNombre.trim()) return toast.error("El nombre del cliente es obligatorio");
    if (!esEmailValido(datos.clienteEmail)) return toast.error("El email no es válido");
    if (datos.items.length === 0) return toast.error("Añade al menos una pieza");
    for (const [i, it] of datos.items.entries()) {
      if (!it.descripcion.trim()) return toast.error(`La descripción de la pieza ${i + 1} es obligatoria`);
      if (!datos.esGarantia && it.precioUnitario <= 0) return toast.error(`El precio de la pieza ${i + 1} debe ser mayor que 0`);
    }
    if (!datos.esGarantia) {
      if (!datos.formaPago) return toast.error("Selecciona la forma de pago");
      if (datos.formaPago === "tarjeta" && !datos.banco) return toast.error("Selecciona el banco");
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/ventas/nuevo-pedido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: crypto.randomUUID(), datos }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      if (data.urlPdf) window.open(data.urlPdf, "_blank");
      onCreado();
      if (datos.modoTicket) {
        toast.success(`Ticket ${data.numeroTicket} generado correctamente`);
        guardarSuReferencia(data.numeroTicket, suReferencia);
        setResultadoTicket({ ventaId: data.ventaId, numeroTicket: data.numeroTicket, urlTicket: data.urlPdf });
      } else {
        toast.success(datos.esGarantia ? `Garantía #${data.ventaId} registrada` : `Factura ${data.numeroFactura} generada`);
        if (!datos.esGarantia) guardarSuReferencia(data.numeroFactura, suReferencia);
        setOpen(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  async function enviarTicket() {
    if (!resultadoTicket) return;
    const email = datos.clienteEmail.trim();
    if (!email) return toast.error("No hay ningún correo de destino disponible");
    const ok = await confirmar(`¿Enviar el ticket ${resultadoTicket.numeroTicket} a ${email}?`);
    if (!ok) return;

    setEnviandoTicket(true);
    try {
      const res = await fetch(`/api/ventas/${resultadoTicket.ventaId}/ticket-venta/enviar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "ticket", emailDestino: email }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      if (!data.enviado) throw new Error(data.motivo || "No se pudo enviar");
      toast.success(`Ticket enviado a ${email}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviandoTicket(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enviando && !enviandoTicket && setOpen(o)}>
      <DialogTrigger className={buttonVariants({ size: "sm", className: "gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" })}>
        <ShoppingCart className="size-4" /> Nuevo Pedido
      </DialogTrigger>
      <DialogContent className="max-w-6xl gap-0 p-0 sm:max-w-6xl" showCloseButton={false}>
        <header className="flex items-center gap-2 rounded-t-xl bg-emerald-600 px-4 py-3 text-white">
          <ShoppingCart className="size-4.5 shrink-0" />
          <DialogTitle className="text-sm font-semibold text-white">Nuevo Pedido de Piezas</DialogTitle>
        </header>

        <ScrollArea className="max-h-[75vh]">
          <div className="space-y-4 bg-muted/30 p-4">
            {!datos.esGarantia && (
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>{datos.modoTicket ? "Nº Ticket" : "Nº Factura"}</Label>
                  <Input value={datos.modoTicket ? resultadoTicket?.numeroTicket || "" : numeroPreview} disabled placeholder={datos.modoTicket ? "Se asignará al generar" : "1-000001"} className="bg-muted/50" />
                </div>
                <div className="space-y-1.5">
                  <Label>{datos.modoTicket ? "Fecha" : "Fecha de factura"}</Label>
                  <Input value={fechaHoyCorta()} disabled className="bg-muted/50" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="npSuReferencia">Su Referencia</Label>
                  <Input id="npSuReferencia" value={suReferencia} onChange={(e) => setSuReferencia(e.target.value)} placeholder="Opcional" disabled={!!resultadoTicket} />
                </div>
                <div className="space-y-1.5">
                  <Label>Forma de pago *</Label>
                  <Select value={datos.formaPago} onValueChange={(v) => { actualizar("formaPago", (v as FormaPagoPedido) || ""); if (v !== "tarjeta") actualizar("banco", ""); }}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona —" /></SelectTrigger>
                    <SelectContent>
                      {FORMAS_PAGO.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {datos.formaPago === "tarjeta" && (
                    <Select value={datos.banco} onValueChange={(v) => actualizar("banco", v || "")}>
                      <SelectTrigger className="mt-2 w-full"><SelectValue placeholder="— Selecciona banco —" /></SelectTrigger>
                      <SelectContent>
                        {BANCOS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            )}

            {datos.modoTicket && !resultadoTicket && (
              <div className="flex items-center gap-1.5 rounded-md bg-sky-500/10 px-3 py-2 text-sm text-sky-800 dark:text-sky-400">
                <Ticket className="size-4 shrink-0" /> <strong>Modo Ticket</strong> — Se generará un Ticket de Venta (Serie 4), sin factura fiscal, y se registrará el pago.
              </div>
            )}

            {resultadoTicket && (
              <div className="space-y-1 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
                <p>Ticket <strong>{resultadoTicket.numeroTicket}</strong> generado correctamente.</p>
                <p className="text-xs">
                  {datos.clienteEmail.trim()
                    ? <>Se enviará a: <strong>{datos.clienteEmail.trim()}</strong></>
                    : "Sin correo de destino — vuelve a Email para añadir uno."}
                </p>
              </div>
            )}

            {datos.esGarantia && (
              <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-400">
                <ShieldTick className="size-4 shrink-0" /> <strong>Modo Garantía</strong> — No se generará factura ni se registrará pago.
              </div>
            )}

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

                <div className="rounded-lg border bg-card shadow-sm">
                  <div className="flex items-center justify-between gap-1.5 rounded-t-lg bg-muted-foreground/80 px-3 py-2 text-xs font-semibold text-white">
                    <span className="flex items-center gap-1.5"><Profile className="size-3.5" /> Cliente</span>
                    <Button size="sm" variant="secondary" className="h-6 gap-1 px-2 text-xs" onClick={() => setBuscarClienteAbierto(true)} disabled={!!resultadoTicket}>
                      <SearchNormal1 className="size-3" /> Buscar
                    </Button>
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="grid grid-cols-[5rem_1fr] items-center gap-2 text-sm">
                      <Label htmlFor="npClienteDni" className="text-xs text-muted-foreground">DNI / CIF</Label>
                      <Input id="npClienteDni" className="h-8 text-sm" placeholder="12345678A" value={datos.clienteDni} onChange={(e) => actualizar("clienteDni", e.target.value)} />
                      <Label htmlFor="npClienteNombre" className="text-xs text-muted-foreground">Nombre *</Label>
                      <Input id="npClienteNombre" className="h-8 text-sm" value={datos.clienteNombre} onChange={(e) => actualizar("clienteNombre", e.target.value)} />
                      <Label htmlFor="npClienteTel" className="text-xs text-muted-foreground">Teléfono</Label>
                      <Input id="npClienteTel" className="h-8 text-sm" placeholder="612345678" value={datos.clienteTelefono} onChange={(e) => actualizar("clienteTelefono", e.target.value)} />
                      <Label htmlFor="npClienteEmail" className="text-xs text-muted-foreground">Email</Label>
                      <Input id="npClienteEmail" className="h-8 text-sm" type="email" placeholder="cliente@email.com" value={datos.clienteEmail} onChange={(e) => actualizar("clienteEmail", e.target.value)} />
                      <Label htmlFor="npClienteDir" className="text-xs text-muted-foreground">Dirección</Label>
                      <Input id="npClienteDir" className="h-8 text-sm" placeholder="Calle, nº, ciudad" value={datos.clienteDireccion} onChange={(e) => actualizar("clienteDireccion", e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border bg-card shadow-sm">
                  <div className="flex items-center justify-between rounded-t-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
                    <span>Conceptos</span>
                    <Button size="sm" variant="secondary" className="h-6 gap-1 px-2 text-xs" onClick={() => actualizar("items", [...datos.items, itemVacio()])}>
                      <Add className="size-3" /> Añadir pieza
                    </Button>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs text-muted-foreground">
                      <tr>
                        <th className="p-2 text-left">Descripción</th>
                        <th className="w-16 p-2 text-center">Cant.</th>
                        <th className="w-24 p-2 text-right">P. unit.</th>
                        <th className="w-24 p-2 text-right">Total</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {datos.items.map((it, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-1">
                            <Input className="h-8 border-0 text-sm" placeholder="Descripción de la pieza" value={it.descripcion} onChange={(e) => actualizarItem(i, "descripcion", e.target.value)} />
                          </td>
                          <td className="p-1">
                            <DecimalInput className="h-8 border-0 text-center text-sm" value={it.cantidad} onChange={(n) => actualizarItem(i, "cantidad", n || 1)} />
                          </td>
                          <td className="p-1">
                            <DecimalInput className="h-8 border-0 text-right text-sm" value={it.precioUnitario} onChange={(n) => actualizarItem(i, "precioUnitario", n)} />
                          </td>
                          <td className="p-2 text-right whitespace-nowrap">{euros(it.cantidad * it.precioUnitario)}</td>
                          <td className="p-1 text-center">
                            <Button size="icon-sm" variant="ghost" className="text-destructive" onClick={() => actualizar("items", datos.items.filter((_, idx) => idx !== i))}>
                              <Trash className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30 text-sm">
                      <tr>
                        <td colSpan={3} className="p-1.5 text-right text-xs text-muted-foreground">Base imponible</td>
                        <td className="p-1.5 text-right font-semibold" colSpan={2}>{euros(base)}</td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="p-1.5 text-right text-xs text-muted-foreground">Descuento</td>
                        <td className="p-1.5">
                          <div className="flex items-center justify-end gap-1">
                            <DecimalInput
                              className="h-7 w-14 border-0 bg-transparent text-right text-xs"
                              value={datos.descuentoPct}
                              onChange={(n) => actualizar("descuentoPct", Math.min(100, Math.max(0, n)))}
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                        </td>
                        <td className="p-1.5 text-right text-xs text-muted-foreground" colSpan={2}>{euros(descuentoAmt)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="p-1.5 text-right text-xs text-muted-foreground">IVA (21%)</td>
                        <td className="p-1.5 text-right" colSpan={2}>{euros(iva)}</td>
                      </tr>
                      <tr className="bg-primary/10">
                        <td colSpan={3} className="p-1.5 text-right font-bold">TOTAL</td>
                        <td className="p-1.5 text-right text-base font-bold" colSpan={2}>{euros(total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="observacionesVenta">Observaciones</Label>
                  <Textarea id="observacionesVenta" rows={2} placeholder="Notas internas..." value={datos.observaciones} onChange={(e) => actualizar("observaciones", e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <footer className="flex flex-col-reverse gap-2 border-t bg-muted/50 px-4 py-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={enviando || enviandoTicket}>
            {resultadoTicket ? "Cerrar" : "Cancelar"}
          </Button>
          {!resultadoTicket && (
            <>
              <Button
                variant="outline"
                className={datos.modoTicket ? "gap-1.5 bg-sky-600 text-white hover:bg-sky-700" : "gap-1.5 border-sky-500 text-sky-700 hover:bg-sky-50 dark:text-sky-400"}
                onClick={toggleTicket}
                disabled={enviando}
              >
                <Ticket className="size-3.5" /> Ticket
              </Button>
              <Button
                variant="outline"
                className={datos.esGarantia ? "gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" : "gap-1.5 border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400"}
                onClick={toggleGarantia}
                disabled={enviando}
              >
                <ShieldTick className="size-3.5" /> Garantía
              </Button>
              <Button className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={guardar} disabled={enviando}>
                {enviando ? "Generando…" : datos.esGarantia ? "Registrar Garantía" : datos.modoTicket ? "Generar Ticket" : "Generar Factura"}
              </Button>
            </>
          )}
          {resultadoTicket && (
            <>
              <Button variant="outline" className="gap-1.5" onClick={nuevoPedido} disabled={enviandoTicket}>
                <Refresh2 className="size-3.5" /> Nuevo pedido
              </Button>
              <Button
                className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={enviarTicket}
                disabled={enviandoTicket || !datos.clienteEmail.trim()}
              >
                <Send2 className="size-4" /> {enviandoTicket ? "Enviando…" : "Enviar al cliente"}
              </Button>
            </>
          )}
        </footer>
      </DialogContent>

      <BuscarClienteDialog open={buscarClienteAbierto} onOpenChange={setBuscarClienteAbierto} onSeleccionar={seleccionarCliente} />
    </Dialog>
  );
}
