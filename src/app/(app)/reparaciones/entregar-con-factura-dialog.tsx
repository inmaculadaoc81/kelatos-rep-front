"use client";

import { useMemo, useState } from "react";
import { BoxTick, Truck, TickCircle, CloseCircle } from "@/lib/icons";
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
const ESTADOS_SIN_FACTURA = ["presupuesto rechazado", "no tiene reparación", "no tiene reparacion", "garantía", "garantia"];

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface InfoEntrega {
  sinNuevaFactura: boolean;
  mostrarEnvio: boolean;
  gastosEnvioDefault: number;
  totalBase: number;
}

function calcularInfo(detalle: ReparacionDetalle, esEnvio: boolean): InfoEntrega {
  const recibidoMensajeria = (detalle.tipoRecepcion || "LOCAL") === "ENVIO";
  const tieneFact = !!detalle.numeroFactura;
  const tieneFactEnvio = !!detalle.numeroFacturaMensajeria;
  const estadoSinFactura = ESTADOS_SIN_FACTURA.includes((detalle.estado || "").toLowerCase());
  const sinNuevaFactura = esEnvio ? tieneFactEnvio || tieneFact : tieneFact || (estadoSinFactura && !recibidoMensajeria);
  const mostrarEnvio = esEnvio || recibidoMensajeria;
  const gastosEnvioDefault = esEnvio && recibidoMensajeria ? 24.8 : 12.4;

  let totalBase = 0;
  if (!esEnvio && !estadoSinFactura) {
    const ppto = detalle.presupuestos.find((p) => p.estado.toLowerCase() === "aceptado");
    if (ppto) {
      totalBase = Math.max(0, ppto.manoObra + ppto.precioPiezas - (detalle.revisionPagada === "SI" ? 20 : 0));
    }
  }
  return { sinNuevaFactura, mostrarEnvio, gastosEnvioDefault, totalBase };
}

/**
 * Reproduce abrirModalEntregarEquipo()/guardarEntregarEquipo() (Index.html)
 * — el modal genérico de salida que decide si hace falta generar una
 * factura nueva (reparación pendiente de cobro + gastos de envío/recogida)
 * antes de marcar la salida, o si basta con confirmar directamente porque
 * ya existe factura o el caso no la requiere. Dos disparadores del
 * original: "Entregado en Local" cuando es _garantiaConRecojo (tipoEntrega
 * ENTREGADO) y "Facturar y Enviar por Mensajería" (tipoEntrega ENVIO).
 */
export function EntregarConFacturaDialog({
  detalle,
  tipoEntrega,
  open,
  onOpenChange,
  onCompletado,
}: {
  detalle: ReparacionDetalle;
  tipoEntrega: "ENTREGADO" | "ENVIO";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompletado: () => void;
}) {
  const esEnvio = tipoEntrega === "ENVIO";
  const info = useMemo(() => calcularInfo(detalle, esEnvio), [detalle, esEnvio]);

  if (info.sinNuevaFactura) {
    return (
      <VistaSinFactura
        resguardo={detalle.resguardo}
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
    <header className="flex items-center gap-2 rounded-t-xl bg-emerald-600 px-4 py-3 text-white">
      <Icono className="size-4.5 shrink-0" />
      <DialogTitle className="text-sm font-semibold text-white">{titulo}</DialogTitle>
      <Button variant="ghost" size="icon-sm" className="ml-auto text-white hover:bg-white/15 hover:text-white" onClick={onClose}>
        <CloseCircle className="size-4" />
      </Button>
    </header>
  );
}

function VistaSinFactura({
  resguardo,
  tipoEntrega,
  open,
  onOpenChange,
  onCompletado,
}: {
  resguardo: string;
  tipoEntrega: "ENTREGADO" | "ENVIO";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompletado: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const esEnvio = tipoEntrega === "ENVIO";
  const titulo = esEnvio ? "Envío por Mensajería" : "Entregar Equipo";
  const pregunta = esEnvio
    ? "¿Confirmas que el equipo se ha enviado por mensajería? No se generará ninguna factura."
    : "¿Confirmas que el equipo ha sido entregado al cliente en local?";

  async function confirmar() {
    setEnviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${resguardo}/salidas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fechaRecogida: hoyIso(),
          tipoEntrega,
          numeroFactura: "",
          resena: "NO",
          observaciones: "",
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(esEnvio ? "Envío registrado" : "Equipo marcado como entregado");
      onOpenChange(false);
      onCompletado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enviando && onOpenChange(o)}>
      <DialogContent className="max-w-sm gap-0 p-0 sm:max-w-sm" showCloseButton={false}>
        <Cabecera titulo={titulo} icono={esEnvio ? Truck : BoxTick} onClose={() => !enviando && onOpenChange(false)} />
        <p className="px-4 py-6 text-center text-sm">{pregunta}</p>
        <footer className="flex justify-center gap-2 rounded-b-xl border-t bg-muted/50 px-4 py-2.5">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5" onClick={confirmar} disabled={enviando}>
            <TickCircle className="size-3.5" /> {enviando ? "Guardando…" : "Confirmar"}
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
  tipoEntrega: "ENTREGADO" | "ENVIO";
  info: InfoEntrega;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompletado: () => void;
}) {
  const esEnvio = tipoEntrega === "ENVIO";
  const [nombre, setNombre] = useState(detalle.cliente.nombre || "");
  const [direccion, setDireccion] = useState(detalle.cliente.direccion || "");
  const [dni, setDni] = useState(detalle.dniCif || "");
  const [telefono, setTelefono] = useState(detalle.cliente.telefono || "");
  const [gastosEnvio, setGastosEnvio] = useState(String(info.gastosEnvioDefault));
  const [metodo, setMetodo] = useState("");
  const [banco, setBanco] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);

  const gastosEnvioNum = info.mostrarEnvio ? parseFloat(gastosEnvio) || 0 : 0;
  const totalSinIva = esEnvio ? gastosEnvioNum : info.totalBase + gastosEnvioNum;
  const totalConIva = totalSinIva * 1.21;

  function cerrar(o: boolean) {
    if (enviando) return;
    if (!o) setRequestId(null);
    onOpenChange(o);
  }

  async function confirmar() {
    if (!nombre.trim()) return toast.error("El nombre del cliente es obligatorio");
    if (!metodo) return toast.error("Selecciona la forma de pago");
    if (metodo === "tarjeta" && !banco) return toast.error("Selecciona el banco para el pago con tarjeta");

    const lineas: { descripcion: string; cantidad: number; precio: number }[] = [];
    if (!esEnvio && info.totalBase > 0) {
      lineas.push({ descripcion: "Reparación", cantidad: 1, precio: info.totalBase });
    }
    if (info.mostrarEnvio) {
      lineas.push({ descripcion: esEnvio ? "Gastos de envío" : "Gastos de envío/recogida", cantidad: 1, precio: gastosEnvioNum });
    }
    if (lineas.length === 0) return toast.error("No hay ningún importe que facturar");

    const formaPago = metodo === "tarjeta" && banco ? `${banco} · tarjeta bancaria` : metodo;

    setEnviando(true);
    const rid = requestId || crypto.randomUUID();
    setRequestId(rid);
    try {
      const res = await fetch(`/api/reparaciones/${detalle.resguardo}/facturas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: rid,
          tipo: "mensajeria",
          datos: {
            cliente: { nombre: nombre.trim(), direccion: direccion.trim(), dni: dni.trim(), telefono: telefono.trim(), email: detalle.cliente.email },
            formaPago,
            lineas,
          },
          incluirEntrega: true,
          entregaDatos: { fecha: hoyIso(), tipoEntrega, resena: "NO", observaciones: "" },
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`${esEnvio ? "Envío registrado" : "Equipo entregado"} — Factura ${data.numeroFactura} generada`);
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
        <Cabecera
          titulo={esEnvio ? "Envío por Mensajería" : "Entregar Equipo"}
          icono={esEnvio ? Truck : BoxTick}
          onClose={() => cerrar(false)}
        />
        <div className="space-y-3 p-4">
          <p className="text-sm text-muted-foreground">
            {esEnvio
              ? "Factura de envío únicamente — la reparación se factura por separado."
              : info.totalBase > 0
                ? "Verifica los datos del cliente y confirma el cobro pendiente de la reparación."
                : "Sin cargo de reparación — solo se facturan los gastos de envío/recogida."}
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="efNombre">Nombre / Razón social *</Label>
            <Input id="efNombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo o empresa" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="efDireccion">Dirección fiscal</Label>
            <Input id="efDireccion" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle, número, CP, ciudad" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="efDni">DNI / CIF</Label>
              <Input id="efDni" value={dni} onChange={(e) => setDni(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="efTelefono">Teléfono</Label>
              <Input id="efTelefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
          </div>

          <hr className="my-1" />

          {info.mostrarEnvio && (
            <div className="w-40 space-y-1.5">
              <Label htmlFor="efGastosEnvio">Gastos de envío/recogida (€ s/IVA)</Label>
              <Input id="efGastosEnvio" type="number" min={0} step="0.01" value={gastosEnvio} onChange={(e) => setGastosEnvio(e.target.value)} />
            </div>
          )}

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
              Total: <span className="font-semibold text-foreground">{totalConIva.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
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
          <Button className="bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5" onClick={confirmar} disabled={enviando}>
            <TickCircle className="size-3.5" /> {enviando ? "Procesando…" : "Emitir factura y confirmar"}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
