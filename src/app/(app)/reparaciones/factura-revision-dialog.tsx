"use client";

import { useState } from "react";
import { Receipt, TickCircle, CloseCircle, SearchNormal1 } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle, esCierreAccidental } from "@/components/ui/dialog";
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
 * original — dos vistas según si ya hay factura de revisión generada
 * (solo lectura, con enlace al PDF) o todavía no ("opciones" del proceso:
 * datos fiscales del cliente + importe + método de pago + banco si es
 * tarjeta). Orquesta el saga completo (preparar→iniciar→generar-pdf→
 * confirmar) en una sola llamada a /api/reparaciones/:resguardo/facturas.
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
  const yaGenerada = !!(detalle.numeroFacturaRevision || detalle.urlFacturaRevision);

  if (yaGenerada) return <VistaGenerada detalle={detalle} open={open} onOpenChange={onOpenChange} onActualizado={onGenerada} />;
  return (
    <VistaGenerar
      detalle={detalle}
      open={open}
      onOpenChange={onOpenChange}
      onGenerada={onGenerada}
      metodoPagoInicial={metodoPagoInicial}
      bancoInicial={bancoInicial}
    />
  );
}

function CabeceraVerde({ titulo, onClose }: { titulo: string; onClose: () => void }) {
  return (
    <header className="flex items-center gap-2 rounded-t-xl bg-emerald-600 px-4 py-3 text-white">
      <Receipt className="size-4.5 shrink-0" />
      <DialogTitle className="text-sm font-semibold text-white">{titulo}</DialogTitle>
      <Button variant="ghost" size="icon-sm" className="ml-auto text-white hover:bg-white/15 hover:text-white" onClick={onClose}>
        <CloseCircle className="size-4" />
      </Button>
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

function VistaGenerar({
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
        <CabeceraVerde titulo="Marcar revisión pagada" onClose={() => cerrar(false)} />
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
