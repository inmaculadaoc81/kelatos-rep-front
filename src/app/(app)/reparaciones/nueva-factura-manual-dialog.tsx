"use client";

import { useState } from "react";
import Link from "next/link";
import { Receipt, CloseCircle, Building, Profile, SearchNormal1, Add, Trash, ArrowRight2 } from "@/lib/icons";
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
import { METODOS_PAGO, BANCOS, euros } from "./factura-acciones-tabs";

const IVA_PCT = 0.21;

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

function CampoLecturaManual({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={valor} disabled className="bg-muted/50" />
    </div>
  );
}

/**
 * Reproduce abrirVistaFacturaManual()/generarPdfFactura() (modo 'manual')
 * del original — botón verde junto a "Nueva Reparación" en Todas las
 * Reparaciones (#modalVistaFactura reutilizado, sin las cards de Equipo/
 * Servicio ni Reseña, ocultas en este modo). Mismo diseño de modal que
 * FaseCorregida (factura-acciones-tabs.tsx). Simplificación deliberada
 * frente al original: el cliente aquí es directamente editable + botón
 * "Buscar" (igual que el resto del puerto), en vez del autocompletado
 * por DNI mientras escribes.
 */
export function NuevaFacturaManualDialog({
  open,
  onOpenChange,
  onGenerada,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerada: () => void;
}) {
  const [serie, setSerie] = useState<"1" | "3">("1");
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [dni, setDni] = useState("");
  const [telefono, setTelefono] = useState("");
  const [buscarClienteAbierto, setBuscarClienteAbierto] = useState(false);
  const [metodo, setMetodo] = useState("");
  const [banco, setBanco] = useState("");
  const [estadoFactura, setEstadoFactura] = useState("Cobrada");
  const [lineas, setLineas] = useState<LineaFactura[]>([{ descripcion: "", cantidad: 1, precio: 0 }]);
  const [enviando, setEnviando] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ numeroFactura: string; urlPdf: string } | null>(null);

  const base = lineas.reduce((s, l) => s + l.cantidad * l.precio * (1 - (l.descuento || 0) / 100), 0);
  const iva = base * IVA_PCT;
  const totalConIva = base + iva;

  function actualizarLinea(i: number, campo: keyof LineaFactura, valor: string | number) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }

  function seleccionarCliente(c: Cliente) {
    setNombre(c.nombre || "");
    setDireccion(c.direccion || "");
    setDni(c.dniCif || "");
    setTelefono(c.telefono || "");
    toast.success("Cliente cargado");
  }

  function reiniciar() {
    setSerie("1"); setNombre(""); setDireccion(""); setDni(""); setTelefono("");
    setMetodo(""); setBanco(""); setEstadoFactura("Cobrada");
    setLineas([{ descripcion: "", cantidad: 1, precio: 0 }]);
    setRequestId(null); setResultado(null);
  }

  function cerrar(o: boolean) {
    if (enviando) return;
    if (!o) reiniciar();
    onOpenChange(o);
  }

  async function generar() {
    const validas = lineas.filter((l) => l.descripcion.trim() || l.precio);
    if (validas.length === 0) return toast.error("Añade al menos un concepto");
    if (!nombre.trim()) return toast.error("El nombre del cliente es obligatorio");
    if (!metodo) return toast.error("Selecciona la forma de pago");
    if (metodo === "tarjeta" && !banco) return toast.error("Selecciona el banco para tarjeta bancaria");

    setEnviando(true);
    const rid = requestId || crypto.randomUUID();
    setRequestId(rid);
    try {
      const res = await fetch("/api/facturas-manuales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: rid,
          serie,
          cliente: { nombre: nombre.trim(), direccion: direccion.trim(), dni: dni.trim(), telefono: telefono.trim() },
          formaPago: metodo,
          banco: metodo === "tarjeta" ? banco : "",
          estadoFactura,
          lineas: validas,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Factura ${data.numeroFactura} generada correctamente`);
      setResultado({ numeroFactura: data.numeroFactura, urlPdf: data.urlPdf });
      onGenerada();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="max-w-5xl gap-0 p-0 sm:max-w-5xl" showCloseButton={false}>
        <CabeceraFactura titulo="Nueva Factura Manual" onClose={() => cerrar(false)} />

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

            <div className="grid gap-3 sm:grid-cols-5">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tipo de factura</Label>
                <Select value={serie} onValueChange={(v) => setSerie((v as "1" | "3") || "1")} disabled={!!resultado}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Serie 1 — Cobros</SelectItem>
                    <SelectItem value="3">Serie 3 — Rectificativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <CampoLecturaManual label="N.º Factura" valor={resultado?.numeroFactura || "Se asignará al generar"} />
              <CampoLecturaManual label="Fecha de factura" valor={new Date().toLocaleDateString("es-ES")} />
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
                      <Label htmlFor="nfmNombre" className="text-xs text-muted-foreground">Nombre / Razón social *</Label>
                      <Input id="nfmNombre" className="h-8 text-sm" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={!!resultado} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="nfmDireccion" className="text-xs text-muted-foreground">Dirección</Label>
                      <Input id="nfmDireccion" className="h-8 text-sm" value={direccion} onChange={(e) => setDireccion(e.target.value)} disabled={!!resultado} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="nfmDni" className="text-xs text-muted-foreground">NIF / DNI</Label>
                        <Input id="nfmDni" className="h-8 text-sm" value={dni} onChange={(e) => setDni(e.target.value)} disabled={!!resultado} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="nfmTelefono" className="text-xs text-muted-foreground">Teléfono</Label>
                        <Input id="nfmTelefono" className="h-8 text-sm" value={telefono} onChange={(e) => setTelefono(e.target.value)} disabled={!!resultado} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border bg-card shadow-sm">
                  <div className="flex items-center justify-between rounded-t-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
                    <span>Conceptos</span>
                    {!resultado && (
                      <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-xs text-white hover:bg-white/15 hover:text-white" onClick={() => setLineas((prev) => [...prev, { descripcion: "", cantidad: 1, precio: 0 }])}>
                        <Add className="size-3" /> Añadir línea
                      </Button>
                    )}
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
                        {lineas.map((l, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-1"><Input className="h-8 text-sm" value={l.referencia || ""} onChange={(e) => actualizarLinea(i, "referencia", e.target.value)} disabled={!!resultado} /></td>
                            <td className="p-1"><Input className="h-8 text-sm" placeholder="Descripción" value={l.descripcion} onChange={(e) => actualizarLinea(i, "descripcion", e.target.value)} disabled={!!resultado} /></td>
                            <td className="p-1"><Input type="number" className="h-8 text-center text-sm" value={l.cantidad} onChange={(e) => actualizarLinea(i, "cantidad", parseFloat(e.target.value) || 0)} disabled={!!resultado} /></td>
                            <td className="p-1"><Input type="number" className="h-8 text-center text-sm" value={l.descuento || 0} onChange={(e) => actualizarLinea(i, "descuento", parseFloat(e.target.value) || 0)} disabled={!!resultado} /></td>
                            <td className="p-1"><Input type="number" step="0.01" className="h-8 text-right text-sm" value={l.precio} onChange={(e) => actualizarLinea(i, "precio", parseFloat(e.target.value) || 0)} disabled={!!resultado} /></td>
                            <td className="p-1">
                              {!resultado && (
                                <Button size="icon-sm" variant="ghost" className="text-destructive" onClick={() => setLineas((prev) => prev.filter((_, idx) => idx !== i))}>
                                  <Trash className="size-3.5" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="text-sm">
                        <tr className="border-t bg-muted/30">
                          <td colSpan={4}></td>
                          <td className="px-2 py-1 text-right text-xs text-muted-foreground">Base</td>
                          <td className="px-2 py-1 text-right font-medium">{euros(base)}</td>
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
          <Button variant="secondary" onClick={() => cerrar(false)} disabled={enviando}>
            {resultado ? "Cerrar" : "Cancelar"}
          </Button>
          {!resultado && (
            <Button className="gap-1.5" onClick={generar} disabled={enviando}>
              <ArrowRight2 className="size-4" /> {enviando ? "Generando…" : "Generar Factura"}
            </Button>
          )}
        </footer>
      </DialogContent>

      <BuscarClienteDialog open={buscarClienteAbierto} onOpenChange={setBuscarClienteAbierto} onSeleccionar={seleccionarCliente} />
    </Dialog>
  );
}
