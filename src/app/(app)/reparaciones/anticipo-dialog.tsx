"use client";

import { useState } from "react";
import Link from "next/link";
import { Wallet, CloseCircle, Building, Profile, SearchNormal1, ArrowRight2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { Cliente } from "@/lib/clientes";
import { BuscarClienteDialog } from "@/components/buscar-cliente-dialog";
import type { LineaFactura } from "@/lib/factura";
import { ReparacionDetalle } from "@/lib/reparacion-detalle";
import { METODOS_PAGO, BANCOS, euros } from "./factura-acciones-tabs";

const IVA_PCT = 0.21;
const PORCENTAJE = 50;

function CampoLecturaAnticipo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={valor} disabled className="bg-muted/50" />
    </div>
  );
}

/** Reproduce la construcción de líneas de _slAbrirVistaFactura() (Index.html): una línea al 50% por cada pieza con precio, otra de mano de obra al 50% — nunca un único importe global. */
function construirLineas(detalle: ReparacionDetalle): LineaFactura[] {
  const ppto =
    detalle.presupuestos.find((p) => p.estado.toLowerCase() === "aceptado") ||
    detalle.presupuestos.filter((p) => p.estado.toLowerCase() !== "rechazado").slice(-1)[0];
  if (!ppto) return [{ descripcion: "", cantidad: 1, precio: 0 }];

  const factor = PORCENTAJE / 100;
  const lineas: LineaFactura[] = [];
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
  // El descuento de revisión pagada NO se prorratea aquí: se aplica entero
  // una sola vez, en la factura final (construirLineasIniciales en
  // factura-reparacion-dialog.tsx). Si se descontara también aquí, el "%
  // restante" de la factura final dejaría de ser un 50% limpio (p.ej. 58%)
  // porque el remanente se calcula sobre piezas+mano de obra sin descuento.
  return lineas.length > 0 ? lineas : [{ descripcion: "", cantidad: 1, precio: 0 }];
}

/**
 * Reproduce clienteSeYLlevaConFactura()/_slAbrirVistaFactura() (Index.html)
 * — el cliente se lleva el equipo dejando un anticipo del 50% del
 * presupuesto aceptado. El original abre aquí el MISMO modal compartido
 * "Generar Factura" (Emisor/Cliente/Conceptos editable) que usa para
 * facturas normales, solo pre-rellenado al 50% y con el título "Anticipo —
 * Ref. {resguardo}" — no un formulario simplificado aparte, así que este
 * modal reutiliza el mismo diseño que NuevaFacturaManualDialog en vez de
 * una lista de solo lectura.
 *
 * A diferencia de una factura manual nueva: sin selector de "Tipo de
 * factura" (siempre serie 1, ligada a esta reparación) — sí tiene "Estado"
 * (Cobrada/Pendiente, columna estado_factura_anticipo, migración 028).
 * La tabla de Conceptos aquí es de solo lectura (a diferencia de una
 * factura manual): son líneas calculadas automáticamente al 50% del
 * presupuesto aceptado, no texto libre.
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
  const [nombre, setNombre] = useState(detalle.cliente.nombre || "");
  const [direccion, setDireccion] = useState(detalle.cliente.direccion || "");
  const [dni, setDni] = useState(detalle.dniCif || "");
  const [telefono, setTelefono] = useState(detalle.cliente.telefono || "");
  const [buscarClienteAbierto, setBuscarClienteAbierto] = useState(false);
  const [metodo, setMetodo] = useState("");
  const [banco, setBanco] = useState("");
  const [estadoFactura, setEstadoFactura] = useState("Cobrada");
  const [lineas, setLineas] = useState<LineaFactura[]>(() => construirLineas(detalle));
  const [enviando, setEnviando] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ numeroFactura: string; urlPdf: string } | null>(null);

  const base = lineas.reduce((s, l) => s + l.cantidad * l.precio * (1 - (l.descuento || 0) / 100), 0);
  const iva = base * IVA_PCT;
  const totalConIva = base + iva;

  function seleccionarCliente(c: Cliente) {
    setNombre(c.nombre || "");
    setDireccion(c.direccion || "");
    setDni(c.dniCif || "");
    setTelefono(c.telefono || "");
    toast.success("Cliente cargado");
  }

  function reiniciar() {
    setNombre(detalle.cliente.nombre || "");
    setDireccion(detalle.cliente.direccion || "");
    setDni(detalle.dniCif || "");
    setTelefono(detalle.cliente.telefono || "");
    setMetodo(""); setBanco(""); setEstadoFactura("Cobrada");
    setLineas(construirLineas(detalle));
    setRequestId(null); setResultado(null);
  }

  function cerrar(o: boolean) {
    if (enviando) return;
    if (!o) reiniciar();
    onOpenChange(o);
  }

  async function generar() {
    const validas = lineas.filter((l) => l.descripcion.trim() || l.precio);
    if (validas.length === 0) return toast.error("No hay presupuesto aceptado con importe para calcular el anticipo");
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
            estadoFactura,
            lineas: validas,
          },
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Anticipo registrado — Factura ${data.numeroFactura} generada`);
      setResultado({ numeroFactura: data.numeroFactura, urlPdf: data.url });
      onCompletado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="max-w-6xl gap-0 p-0 sm:max-w-6xl" showCloseButton={false}>
        <header className="flex items-center gap-2 rounded-t-xl bg-amber-600 px-4 py-3 text-white">
          <Wallet className="size-4.5 shrink-0" />
          <DialogTitle className="text-sm font-semibold text-white">Anticipo {PORCENTAJE}% — Ref. {detalle.resguardo}</DialogTitle>
          <Button variant="ghost" size="icon-sm" className="ml-auto text-white hover:bg-white/15 hover:text-white" onClick={() => cerrar(false)}>
            <CloseCircle className="size-4" />
          </Button>
        </header>

        <ScrollArea className="max-h-[75vh]">
          <div className="space-y-4 bg-muted/30 p-4">
            {resultado && (
              <div className="flex items-center justify-between gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
                <span>Factura <strong>{resultado.numeroFactura}</strong> generada correctamente.</span>
                {resultado.urlPdf && (
                  <Button variant="outline" size="sm" className="gap-1.5" nativeButton={false} render={<Link href={resultado.urlPdf} target="_blank" rel="noreferrer" />}>
                    Ver PDF
                  </Button>
                )}
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              El cliente se lleva el equipo mientras llega la pieza, dejando un anticipo del {PORCENTAJE}% del presupuesto aceptado.
            </p>

            <div className="grid gap-3 sm:grid-cols-5">
              <CampoLecturaAnticipo label="N.º Factura" valor={resultado?.numeroFactura || "Se asignará al generar"} />
              <CampoLecturaAnticipo label="Fecha de factura" valor={new Date().toLocaleDateString("es-ES")} />
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Forma de pago</Label>
                <Select value={metodo} onValueChange={(v) => { setMetodo(v || ""); if (v !== "tarjeta") setBanco(""); }} disabled={!!resultado}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona —" /></SelectTrigger>
                  <SelectContent>
                    {METODOS_PAGO.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {metodo === "tarjeta" && (
                  <Select value={banco} onValueChange={(v) => setBanco(v || "")} disabled={!!resultado}>
                    <SelectTrigger className="mt-1.5 w-full"><SelectValue placeholder="— Selecciona banco —" /></SelectTrigger>
                    <SelectContent>
                      {BANCOS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Estado</Label>
                <Select value={estadoFactura} onValueChange={(v) => setEstadoFactura(v || "Cobrada")} disabled={!!resultado}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cobrada">Cobrada</SelectItem>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col justify-end">
                <p className="text-xs text-muted-foreground">Total anticipo</p>
                <p className="text-lg font-bold tabular-nums">{euros(totalConIva)}</p>
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

                <div className="rounded-lg border bg-card shadow-sm">
                  <div className="flex items-center justify-between gap-1.5 rounded-t-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">
                    <span className="flex items-center gap-1.5"><Profile className="size-3.5" /> Cliente</span>
                    <Button size="sm" variant="secondary" className="h-6 gap-1 px-2 text-xs" onClick={() => setBuscarClienteAbierto(true)} disabled={!!resultado}>
                      <SearchNormal1 className="size-3" /> Buscar
                    </Button>
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="space-y-1">
                      <Label htmlFor="anNombre" className="text-xs text-muted-foreground">Nombre / Razón social *</Label>
                      <Input id="anNombre" className="h-8 text-sm" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={!!resultado} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="anDireccion" className="text-xs text-muted-foreground">Dirección</Label>
                      <Input id="anDireccion" className="h-8 text-sm" value={direccion} onChange={(e) => setDireccion(e.target.value)} disabled={!!resultado} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="anDni" className="text-xs text-muted-foreground">NIF / DNI</Label>
                        <Input id="anDni" className="h-8 text-sm" value={dni} onChange={(e) => setDni(e.target.value)} disabled={!!resultado} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="anTelefono" className="text-xs text-muted-foreground">Teléfono</Label>
                        <Input id="anTelefono" className="h-8 text-sm" value={telefono} onChange={(e) => setTelefono(e.target.value)} disabled={!!resultado} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border bg-card shadow-sm">
                  <div className="flex items-center justify-between rounded-t-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white">
                    <span>Conceptos</span>
                    <span className="text-[10px] font-normal text-white/80">Calculado automáticamente — no editable</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs text-muted-foreground">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-medium">Descripción</th>
                          <th className="w-14 px-2 py-1.5 text-center font-medium">Cant.</th>
                          <th className="w-24 px-2 py-1.5 text-right font-medium">P. unit.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineas.map((l, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-2 py-1.5">{l.descripcion || "—"}</td>
                            <td className="px-2 py-1.5 text-center tabular-nums">{l.cantidad}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">{euros(l.precio)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="text-sm">
                        <tr className="border-t bg-muted/30">
                          <td colSpan={1}></td>
                          <td className="px-2 py-1 text-right text-xs text-muted-foreground">Base</td>
                          <td className="px-2 py-1 text-right font-medium">{euros(base)}</td>
                        </tr>
                        <tr className="bg-muted/30">
                          <td colSpan={1}></td>
                          <td className="px-2 py-1 text-right text-xs text-muted-foreground">IVA (21%)</td>
                          <td className="px-2 py-1 text-right font-medium">{euros(iva)}</td>
                        </tr>
                        <tr className="border-t bg-primary/5">
                          <td colSpan={1}></td>
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
          <Button variant="secondary" onClick={() => cerrar(false)} disabled={enviando}>
            {resultado ? "Cerrar" : "Cancelar"}
          </Button>
          {!resultado && (
            <Button className="gap-1.5 bg-amber-600 text-white hover:bg-amber-700" onClick={generar} disabled={enviando}>
              <ArrowRight2 className="size-4" /> {enviando ? "Generando…" : "Emitir factura de anticipo"}
            </Button>
          )}
        </footer>
      </DialogContent>

      <BuscarClienteDialog open={buscarClienteAbierto} onOpenChange={setBuscarClienteAbierto} onSeleccionar={seleccionarCliente} />
    </Dialog>
  );
}
