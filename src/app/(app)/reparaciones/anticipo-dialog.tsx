"use client";

import { useMemo, useState } from "react";
import { Wallet, TickCircle, CloseCircle } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ReparacionDetalle } from "@/lib/reparacion-detalle";

const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta bancaria" },
  { value: "transferencia", label: "Transferencia bancaria" },
  { value: "bizum", label: "Bizum" },
];
const BANCOS = ["Santander", "Sabadell", "BBVA", "CaixaBank"];
const PORCENTAJE = 50;

interface LineaAnticipo {
  descripcion: string;
  cantidad: number;
  precio: number;
}

/** Reproduce la construcción de líneas de _slAbrirVistaFactura() (Index.html): una línea al 50% por cada pieza con precio, otra de mano de obra al 50% — nunca un único importe global. */
function construirLineas(detalle: ReparacionDetalle): LineaAnticipo[] {
  const ppto =
    detalle.presupuestos.find((p) => p.estado.toLowerCase() === "aceptado") ||
    detalle.presupuestos.filter((p) => p.estado.toLowerCase() !== "rechazado").slice(-1)[0];
  if (!ppto) return [];

  const factor = PORCENTAJE / 100;
  const lineas: LineaAnticipo[] = [];
  if (ppto.piezas.length > 0) {
    for (const pz of ppto.piezas) {
      if (pz.precio > 0) lineas.push({ descripcion: `${pz.descripcion || "Pieza"} (${PORCENTAJE}%)`, cantidad: 1, precio: pz.precio * factor });
    }
  } else if (ppto.precioPiezas > 0) {
    lineas.push({ descripcion: `Material / Piezas (${PORCENTAJE}%)`, cantidad: 1, precio: ppto.precioPiezas * factor });
  }
  if (ppto.manoObra > 0) {
    lineas.push({ descripcion: `Mano de obra (${PORCENTAJE}%)`, cantidad: 1, precio: ppto.manoObra * factor });
  }
  return lineas;
}

/**
 * Reproduce clienteSeYLlevaConFactura()/_slAbrirVistaFactura() (Index.html)
 * — el cliente se lleva el equipo dejando un anticipo del 50% del
 * presupuesto aceptado (piezas + mano de obra, cada línea a mitad de
 * precio); orquesta el saga de facturas existente con tipo "anticipo",
 * que ya persiste anticipo_importe/numero_factura_anticipo/
 * url_factura_anticipo y pone equipo_en_local en 'NO' (ver server.js,
 * rama op.tipo === "anticipo" de /facturas/confirmar).
 */
export function AnticipoDialog({
  detalle,
  open,
  onOpenChange,
  onCompletado,
}: {
  detalle: ReparacionDetalle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompletado: () => void;
}) {
  const lineas = useMemo(() => construirLineas(detalle), [detalle]);
  const [nombre, setNombre] = useState(detalle.cliente.nombre || "");
  const [direccion, setDireccion] = useState(detalle.cliente.direccion || "");
  const [dni, setDni] = useState(detalle.dniCif || "");
  const [telefono, setTelefono] = useState(detalle.cliente.telefono || "");
  const [metodo, setMetodo] = useState("");
  const [banco, setBanco] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);

  const totalSinIva = lineas.reduce((s, l) => s + l.cantidad * l.precio, 0);
  const totalConIva = totalSinIva * 1.21;

  function cerrar(o: boolean) {
    if (enviando) return;
    if (!o) setRequestId(null);
    onOpenChange(o);
  }

  async function confirmar() {
    if (lineas.length === 0) return toast.error("No hay presupuesto aceptado con importe para calcular el anticipo");
    if (!nombre.trim()) return toast.error("El nombre del cliente es obligatorio");
    if (!metodo) return toast.error("Selecciona la forma de pago");
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
          tipo: "anticipo",
          datos: {
            cliente: { nombre: nombre.trim(), direccion: direccion.trim(), dni: dni.trim(), telefono: telefono.trim(), email: detalle.cliente.email },
            formaPago: metodo === "tarjeta" && banco ? `${banco} · tarjeta bancaria` : metodo,
            lineas,
          },
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Anticipo registrado — Factura ${data.numeroFactura} generada`);
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
      <DialogContent className="gap-0 p-0 sm:max-w-md" showCloseButton={false}>
        <header className="flex items-center gap-2 rounded-t-xl bg-amber-600 px-4 py-3 text-white">
          <Wallet className="size-4.5 shrink-0" />
          <DialogTitle className="text-sm font-semibold text-white">Cliente se lleva el equipo — Anticipo {PORCENTAJE}%</DialogTitle>
          <Button variant="ghost" size="icon-sm" className="ml-auto text-white hover:bg-white/15 hover:text-white" onClick={() => cerrar(false)}>
            <CloseCircle className="size-4" />
          </Button>
        </header>

        <div className="space-y-3 p-4">
          <p className="text-sm text-muted-foreground">
            El cliente se lleva el equipo mientras llega la pieza, dejando un anticipo del {PORCENTAJE}% del presupuesto aceptado.
          </p>

          {lineas.length > 0 && (
            <ul className="space-y-1 rounded-md border bg-muted/30 p-2.5 text-sm">
              {lineas.map((l, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{l.descripcion}</span>
                  <span className="tabular-nums">{(l.cantidad * l.precio).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="anNombre">Nombre / Razón social *</Label>
            <Input id="anNombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo o empresa" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="anDireccion">Dirección fiscal</Label>
            <Input id="anDireccion" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle, número, CP, ciudad" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="anDni">DNI / CIF</Label>
              <Input id="anDni" value={dni} onChange={(e) => setDni(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="anTelefono">Teléfono</Label>
              <Input id="anTelefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
          </div>

          <hr className="my-1" />

          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            <div className="space-y-1.5">
              <Label>Forma de pago</Label>
              <Select value={metodo} onValueChange={(v) => { setMetodo(v || ""); if (v !== "tarjeta") setBanco(""); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona —" /></SelectTrigger>
                <SelectContent>
                  {METODOS_PAGO.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="pb-1.5 text-sm text-muted-foreground">
              Anticipo: <span className="font-semibold text-foreground">{totalConIva.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
            </p>
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
          <Button className="bg-amber-600 text-white hover:bg-amber-700 gap-1.5" onClick={confirmar} disabled={enviando}>
            <TickCircle className="size-3.5" /> {enviando ? "Procesando…" : "Emitir factura de anticipo"}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
