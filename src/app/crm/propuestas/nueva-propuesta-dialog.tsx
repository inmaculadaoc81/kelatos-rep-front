"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CatalogoPropuestas, PrecioPropuesta } from "@/lib/propuestas";

const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm";

/** Datos del cliente + servicios + contexto → la IA redacta el texto (tarda ~1 min); los precios los pones tú. */
export function NuevaPropuestaDialog({ catalogo, onCerrar, onCreada }: { catalogo: CatalogoPropuestas; onCerrar: () => void; onCreada: (id: number) => void }) {
  const [cat, setCat] = useState<"agencia" | "reparacion">("agencia");
  const [cliente, setCliente] = useState("");
  const [contacto, setContacto] = useState("");
  const [email, setEmail] = useState("");
  const [sector, setSector] = useState("");
  const [servicios, setServicios] = useState<string[]>([]);
  const [contexto, setContexto] = useState("");
  const [precios, setPrecios] = useState<PrecioPropuesta[]>([]);
  const [enviando, setEnviando] = useState(false);

  const servicioss = catalogo.catalogos.find((c) => c.id === cat)?.servicios ?? [];
  const alternar = (id: string) => setServicios((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const cambiarPrecio = (i: number, parche: Partial<PrecioPropuesta>) => setPrecios((l) => l.map((p, j) => (j === i ? { ...p, ...parche } : p)));
  const t = catalogo.tarifasAlquiler;

  async function generar() {
    if (!cliente.trim()) { toast.error("Escribe el nombre del cliente"); return; }
    if (servicios.length === 0) { toast.error("Elige al menos un servicio"); return; }
    setEnviando(true);
    try {
      const res = await fetch("/api/crm/propuestas/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalogo: cat, cliente, contacto, email, sector, servicios, contexto, precios }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      onCreada(Number(data.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
      setEnviando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !enviando) onCerrar(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva propuesta</DialogTitle>
          <DialogDescription>La IA redacta el texto con lo que cuentes; los precios los pones tú (la IA no inventa cifras). Después puedes editarlo todo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="npCat">¿Qué ofreces?</Label>
            <select id="npCat" className={SELECT} value={cat} onChange={(e) => { setCat(e.target.value as "agencia" | "reparacion"); setServicios([]); }}>
              {catalogo.catalogos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="npCli">Cliente / empresa *</Label><Input id="npCli" value={cliente} maxLength={160} onChange={(e) => setCliente(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="npSec">Sector</Label><Input id="npSec" value={sector} maxLength={120} placeholder="Clínica dental, peluquería…" onChange={(e) => setSector(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="npCon">Persona de contacto</Label><Input id="npCon" value={contacto} maxLength={120} onChange={(e) => setContacto(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="npMail">Correo</Label><Input id="npMail" type="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Servicios a proponer *</Label>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {servicioss.map((s) => (
                <label key={s.id} title={s.descripcion} className={`flex cursor-pointer items-start gap-2 rounded-md border px-2.5 py-2 text-sm ${servicios.includes(s.id) ? "border-primary bg-primary/5" : ""}`}>
                  <input type="checkbox" className="mt-0.5" checked={servicios.includes(s.id)} onChange={() => alternar(s.id)} />
                  <span>{s.nombre}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="npCtx">Qué necesita el cliente (con sus palabras)</Label>
            <Textarea id="npCtx" rows={4} value={contexto} maxLength={3000} placeholder="Ej.: reciben muchas llamadas para pedir cita, la recepcionista no da abasto y un 20 % de pacientes no se presenta." onChange={(e) => setContexto(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Precios (sin IVA)</Label>
              <div className="flex gap-1.5">
                {cat === "reparacion" && servicios.includes("alquiler") && (
                  <>
                    <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => setPrecios((l) => [...l, { concepto: "Alquiler portátil (por mes)", cantidad: 1, precio: t.normal.mes }, { concepto: "Fianza portátil (reembolsable)", cantidad: 1, precio: t.normal.fianza }])}>Tarifa portátil normal</Button>
                    <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => setPrecios((l) => [...l, { concepto: "Alquiler portátil gamer (por mes)", cantidad: 1, precio: t.gamer.mes }, { concepto: "Fianza portátil gamer (reembolsable)", cantidad: 1, precio: t.gamer.fianza }])}>Tarifa gamer</Button>
                  </>
                )}
                <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => setPrecios((l) => [...l, { concepto: "", cantidad: 1, precio: 0 }])}>+ Línea</Button>
              </div>
            </div>
            {precios.length === 0 && <p className="text-xs text-muted-foreground">Opcional: puedes añadirlos ahora o después, al revisar la propuesta.</p>}
            {precios.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_5rem_6rem_2rem] gap-2">
                <Input value={p.concepto} placeholder="Concepto" onChange={(e) => cambiarPrecio(i, { concepto: e.target.value })} />
                <Input type="number" min={0} step="any" value={p.cantidad} onChange={(e) => cambiarPrecio(i, { cantidad: Number(e.target.value) })} aria-label="Cantidad" />
                <Input type="number" min={0} step="any" value={p.precio} onChange={(e) => cambiarPrecio(i, { precio: Number(e.target.value) })} aria-label="Precio" />
                <Button type="button" variant="ghost" size="icon" className="size-9" onClick={() => setPrecios((l) => l.filter((_, j) => j !== i))} aria-label="Quitar línea">×</Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCerrar} disabled={enviando}>Cancelar</Button>
          <Button onClick={generar} disabled={enviando}>{enviando ? "Enviando…" : "Generar propuesta"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
