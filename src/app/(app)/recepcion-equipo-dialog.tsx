"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface DatosEquipo { nombre: string; marca: string | null; modelo: string | null; categoria: string | null }
interface Busqueda {
  ok: boolean; error?: string; ean: string; origen: "catalogo" | "externo" | "no_encontrado" | "error_externo"; datos: DatosEquipo | null;
  producto: { id: string; nombre: string; stock_actual: number | null } | null; aviso?: string | null;
}

const ORIGEN: Record<Busqueda["origen"], { texto: string; clase: string }> = {
  catalogo: { texto: "Está en tu catálogo", clase: "bg-emerald-100 text-emerald-800" },
  externo: { texto: "Datos de la base externa: revísalos", clase: "bg-sky-100 text-sky-800" },
  no_encontrado: { texto: "No lo encontramos: rellénalo a mano (solo la primera vez)", clase: "bg-amber-100 text-amber-800" },
  error_externo: { texto: "No se pudo consultar la base externa: rellénalo a mano", clase: "bg-amber-100 text-amber-800" },
};

/**
 * Recepción de un equipo nuevo con el lector de códigos de barras: el escáner da solo el código; aquí se completan marca, modelo y
 * nombre (catálogo propio → consulta externa → a mano), se anota el nº de serie y se suma la entrada al stock de Productos.
 * Si `codigo` es null pide el código a mano (por si no hay escáner a mano).
 */
export function RecepcionEquipoDialog({ codigo, onCerrar }: { codigo: string | null; onCerrar: () => void }) {
  const [ean, setEan] = useState(codigo ?? "");
  const [enviado, setEnviado] = useState<string | null>(codigo);
  const [busqueda, setBusqueda] = useState<Busqueda | null>(null);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [serie, setSerie] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [precio, setPrecio] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const campoSerie = useRef<HTMLInputElement>(null);

  // Cada vez que hay un código nuevo se consulta (catálogo → externo) y se rellena el formulario.
  useEffect(() => {
    if (!enviado) return;
    let vigente = true;
    (async () => {
      try {
        const res = await fetch(`/api/recepcion-equipos/buscar?ean=${encodeURIComponent(enviado)}`, { cache: "no-store" });
        const d = (await res.json()) as Busqueda;
        if (!d.ok) throw new Error(d.error || "No se pudo consultar el código");
        if (!vigente) return;
        setBusqueda(d);
        setErrorBusqueda(null);
        setNombre(d.datos?.nombre ?? d.producto?.nombre ?? "");
        setMarca(d.datos?.marca ?? "");
        setModelo(d.datos?.modelo ?? "");
        setCategoria(d.datos?.categoria ?? "");
        setTimeout(() => campoSerie.current?.focus(), 50);
      } catch (e) {
        if (vigente) { setBusqueda(null); setErrorBusqueda(e instanceof Error ? e.message : "Error"); }
      }
    })();
    return () => { vigente = false; };
  }, [enviado]);

  async function registrar() {
    if (!busqueda) return;
    if (!nombre.trim()) { toast.error("Escribe el nombre del equipo"); return; }
    setGuardando(true);
    try {
      const res = await fetch("/api/recepcion-equipos/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: requestId.current, ean: busqueda.ean, nombre, marca, modelo, categoria, numeroSerie: serie, cantidad: serie.trim() ? 1 : Number(cantidad) || 1,
          precioCompra: precio ? Number(precio.replace(",", ".")) : 0, ubicacion, fuente: busqueda.origen === "externo" ? "externo" : "manual",
        }),
      });
      const d = (await res.json()) as { ok: boolean; error?: string; stockResultante?: number; creado?: boolean; aviso?: string };
      if (!d.ok) throw new Error(d.error || "No se pudo registrar");
      toast.success(d.creado ? `Producto creado con stock ${d.stockResultante}` : `Entrada registrada: stock ahora ${d.stockResultante}`);
      if (d.aviso) toast.warning(d.aviso);
      onCerrar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !guardando) onCerrar(); }}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recepción de equipo</DialogTitle>
          <DialogDescription>Escanea o escribe el código de barras del equipo. Se suma una entrada al stock de Productos.</DialogDescription>
        </DialogHeader>

        {enviado === null ? (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (ean.trim()) setEnviado(ean.trim()); }}>
            <Input autoFocus inputMode="numeric" placeholder="Código de barras (EAN)" value={ean} onChange={(e) => setEan(e.target.value)} />
            <Button type="submit" disabled={!ean.trim()}>Buscar</Button>
          </form>
        ) : errorBusqueda ? (
          <div className="space-y-2">
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorBusqueda}</p>
            <Button variant="outline" size="sm" onClick={() => { setEnviado(null); setErrorBusqueda(null); setBusqueda(null); }}>Probar con otro código</Button>
          </div>
        ) : !busqueda ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md bg-muted px-2 py-1 font-mono">{busqueda.ean}</span>
              <span className={`rounded-full px-2 py-0.5 font-medium ${ORIGEN[busqueda.origen].clase}`}>{ORIGEN[busqueda.origen].texto}</span>
            </div>
            {busqueda.aviso && <p className="text-xs text-amber-800">{busqueda.aviso}</p>}
            {busqueda.producto && (
              <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                Ya existe en stock: <strong>{busqueda.producto.id}</strong> · {busqueda.producto.nombre} · {busqueda.producto.stock_actual ?? 0} uds. Se sumará a ese producto.
              </p>
            )}
            <div className="space-y-1.5"><Label>Nombre del equipo</Label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={200} /></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5"><Label>Marca</Label><Input value={marca} onChange={(e) => setMarca(e.target.value)} maxLength={80} /></div>
              <div className="space-y-1.5"><Label>Modelo</Label><Input value={modelo} onChange={(e) => setModelo(e.target.value)} maxLength={80} /></div>
              <div className="space-y-1.5"><Label>Categoría</Label><Input value={categoria} onChange={(e) => setCategoria(e.target.value)} maxLength={80} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Número de serie (escanéalo aquí)</Label>
                <Input ref={campoSerie} value={serie} onChange={(e) => setSerie(e.target.value)} maxLength={80} placeholder="Opcional" />
              </div>
              <div className="space-y-1.5"><Label>Cantidad</Label><Input type="number" min={1} max={500} value={serie.trim() ? "1" : cantidad} disabled={!!serie.trim()} onChange={(e) => setCantidad(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Precio de compra (€)</Label><Input inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Opcional" /></div>
              <div className="space-y-1.5"><Label>Ubicación</Label><Input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} maxLength={120} placeholder="Opcional" /></div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={guardando} onClick={onCerrar}>Cancelar</Button>
          <Button disabled={guardando || !busqueda} onClick={registrar}>{guardando ? "Registrando…" : "Registrar entrada en stock"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
