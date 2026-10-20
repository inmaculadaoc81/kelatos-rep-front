"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { History, Pencil, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ZONAS, MOTIVO_ETIQUETA, estaLleno, nombreZona, textoOcupacion, type Casillero, type MovimientoCasillero } from "@/lib/casilleros";

type Filtro = "todos" | "con-equipos" | "libres" | "sin-limite";

const fechaHora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }) : "—";

export default function CasillerosPage() {
  const [casilleros, setCasilleros] = useState<Casillero[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [zona, setZona] = useState<string>("todas");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [editando, setEditando] = useState<Casillero | "nuevo" | null>(null);
  const [historial, setHistorial] = useState<Casillero | null>(null);

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const res = await fetch("/api/casilleros", { cache: "no-store" });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Error desconocido");
        if (vigente) { setCasilleros(data.casilleros as Casillero[]); setError(null); }
      } catch (e) {
        if (vigente) setError(e instanceof Error ? e.message : "Error desconocido");
      }
    })();
    return () => { vigente = false; };
  }, [recarga]);

  const recargar = () => setRecarga((n) => n + 1);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (casilleros ?? []).filter((c) => {
      if (zona !== "todas" && c.zona !== zona) return false;
      if (filtro === "con-equipos" && c.ocupados === 0) return false;
      if (filtro === "libres" && estaLleno(c)) return false;
      if (filtro === "sin-limite" && c.capacidad_max !== null) return false;
      if (!q) return true;
      return c.codigo.toLowerCase().includes(q) || c.contenido.toLowerCase().includes(q) || c.ocupantes.some((o) => `${o.resguardo} ${o.equipo} ${o.cliente}`.toLowerCase().includes(q));
    });
  }, [casilleros, busqueda, zona, filtro]);

  const totalEquipos = (casilleros ?? []).reduce((s, c) => s + c.ocupados, 0);
  const llenos = (casilleros ?? []).filter(estaLleno).length;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Casilleros</h1>
          <p className="text-sm text-muted-foreground">
            Dónde está guardado cada equipo del local. {casilleros ? `${casilleros.length} casilleros · ${totalEquipos} equipos guardados · ${llenos} llenos.` : ""}
          </p>
        </div>
        <Button className="gap-1.5" onClick={() => setEditando("nuevo")}><Plus className="size-4" /> Nuevo casillero</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar casillero, contenido, resguardo o cliente…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={zona} onChange={(e) => setZona(e.target.value)} aria-label="Zona">
          <option value="todas">Todas las zonas</option>
          {ZONAS.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
        </select>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)} aria-label="Filtro">
          <option value="todos">Todos</option>
          <option value="con-equipos">Con equipos dentro</option>
          <option value="libres">Con hueco</option>
          <option value="sin-limite">Sin capacidad definida</option>
        </select>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">No se pudo cargar: {error}</div>}
      {!casilleros && !error && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-36" />)}</div>
      )}

      {ZONAS.map((z) => {
        const lista = visibles.filter((c) => c.zona === z.id);
        if (!lista.length) return null;
        return (
          <section key={z.id} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">{z.nombre} <span className="font-normal">({lista.length})</span></h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {lista.map((c) => <TarjetaCasillero key={c.id} c={c} onEditar={() => setEditando(c)} onHistorial={() => setHistorial(c)} />)}
            </div>
          </section>
        );
      })}
      {casilleros && visibles.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Ningún casillero coincide con la búsqueda.</p>}

      {editando && <DialogoEditar casillero={editando === "nuevo" ? null : editando} onCerrar={() => setEditando(null)} onGuardado={() => { setEditando(null); recargar(); }} />}
      {historial && <DialogoHistorial casillero={historial} onCerrar={() => setHistorial(null)} />}
    </div>
  );
}

function TarjetaCasillero({ c, onEditar, onHistorial }: { c: Casillero; onEditar: () => void; onHistorial: () => void }) {
  const lleno = estaLleno(c);
  const pct = c.capacidad_max ? Math.min(100, Math.round((c.ocupados / c.capacidad_max) * 100)) : 0;
  return (
    <div className={`flex flex-col rounded-lg border bg-card p-3 text-sm ${!c.activo ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xl font-bold leading-none">{c.codigo}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{nombreZona(c.zona)}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${lleno ? "bg-red-100 text-red-800" : c.ocupados > 0 ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground"}`}>
          {lleno ? "Lleno " : ""}{textoOcupacion(c)}
        </span>
      </div>
      <p className="mt-2 line-clamp-3 text-xs text-foreground" title={c.contenido}>{c.contenido || "Sin contenido indicado"}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {c.capacidad_texto ? `Caben: ${c.capacidad_texto}` : c.capacidad_max ? `Caben: ${c.capacidad_max}` : "Capacidad sin definir"}
      </p>
      {c.capacidad_max !== null && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className={`h-full ${lleno ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      {c.ocupantes.length > 0 && (
        <ul className="mt-2 space-y-0.5 border-t pt-2">
          {c.ocupantes.map((o) => (
            <li key={o.resguardo} className="truncate text-xs" title={`${o.cliente} · ${o.equipo} · ${o.estado}`}>
              <span className="font-semibold">{o.resguardo}</span> <span className="text-muted-foreground">{o.equipo || o.cliente}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex justify-end gap-1 pt-2">
        <Button size="sm" variant="ghost" className="gap-1" onClick={onHistorial}><History className="size-3.5" /> Historial</Button>
        <Button size="sm" variant="ghost" className="gap-1" onClick={onEditar}><Pencil className="size-3.5" /> Editar</Button>
      </div>
    </div>
  );
}

function DialogoEditar({ casillero, onCerrar, onGuardado }: { casillero: Casillero | null; onCerrar: () => void; onGuardado: () => void }) {
  const nuevo = casillero === null;
  const [codigo, setCodigo] = useState(casillero?.codigo ?? "");
  const [zona, setZona] = useState(casillero?.zona ?? ZONAS[0].id);
  const [contenido, setContenido] = useState(casillero?.contenido ?? "");
  const [min, setMin] = useState(casillero?.capacidad_min?.toString() ?? "");
  const [max, setMax] = useState(casillero?.capacidad_max?.toString() ?? "");
  const [texto, setTexto] = useState(casillero?.capacidad_texto ?? "");
  const [activo, setActivo] = useState(casillero?.activo ?? true);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (nuevo && !codigo.trim()) { toast.error("Indica el número o código del casillero"); return; }
    setGuardando(true);
    try {
      const cuerpo = {
        contenido: contenido.trim(),
        capacidad_min: min.trim() === "" ? null : Number(min),
        capacidad_max: max.trim() === "" ? null : Number(max),
        capacidad_texto: texto.trim() || null,
      };
      const res = nuevo
        ? await fetch("/api/casilleros", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...cuerpo, codigo: codigo.trim(), zona }) })
        : await fetch(`/api/casilleros/${casillero.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...cuerpo, activo }) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(nuevo ? "Casillero creado" : "Casillero actualizado");
      onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !guardando) onCerrar(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{nuevo ? "Nuevo casillero" : `Casillero ${casillero.codigo}`}</DialogTitle>
          <DialogDescription>{nuevo ? "Añade un casillero al mapa del local." : `${nombreZona(casillero.zona)} · ${casillero.ocupados} equipos dentro ahora.`}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {nuevo && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="csCodigo">Número / código *</Label>
                <Input id="csCodigo" value={codigo} maxLength={20} onChange={(e) => setCodigo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="csZona">Zona</Label>
                <select id="csZona" className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={zona} onChange={(e) => setZona(e.target.value)}>
                  {ZONAS.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                </select>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="csContenido">Contenido (qué se guarda ahí)</Label>
            <Textarea id="csContenido" rows={3} maxLength={500} value={contenido} onChange={(e) => setContenido(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="csMin">Entran, mínimo</Label>
              <Input id="csMin" type="number" min={1} value={min} onChange={(e) => setMin(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="csMax">Entran, máximo</Label>
              <Input id="csMax" type="number" min={1} value={max} onChange={(e) => setMax(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="csTexto">Texto</Label>
              <Input id="csTexto" placeholder="8 a 15 equipos" value={texto} onChange={(e) => setTexto(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">El máximo es el límite: el sistema no deja meter más equipos. Sin máximo, no hay límite.</p>
          {!nuevo && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} /> Casillero en uso (si lo desmarcas, no se puede elegir)
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={guardando} onClick={onCerrar}>Cancelar</Button>
          <Button disabled={guardando} onClick={guardar}>{guardando ? "Guardando…" : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoHistorial({ casillero, onCerrar }: { casillero: Casillero; onCerrar: () => void }) {
  const [filas, setFilas] = useState<MovimientoCasillero[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const res = await fetch(`/api/casilleros/${casillero.id}/historial`, { cache: "no-store" });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Error desconocido");
        if (vigente) setFilas(data.historial as MovimientoCasillero[]);
      } catch (e) {
        if (vigente) setError(e instanceof Error ? e.message : "Error desconocido");
      }
    })();
    return () => { vigente = false; };
  }, [casillero.id]);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCerrar(); }}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Historial del casillero {casillero.codigo}</DialogTitle>
          <DialogDescription>{casillero.contenido || nombreZona(casillero.zona)}</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!filas && !error && <Skeleton className="h-24 w-full" />}
        {filas && filas.length === 0 && <p className="text-sm text-muted-foreground">Todavía no ha pasado ningún equipo por este casillero.</p>}
        {filas && filas.length > 0 && (
          <ul className="divide-y rounded-md border text-sm">
            {filas.map((f) => (
              <li key={f.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-3 py-2">
                <div className="min-w-0">
                  <p><span className="font-semibold">{f.resguardo}</span> <span className="text-muted-foreground">{f.equipo || "—"}{f.cliente ? ` · ${f.cliente}` : ""}</span></p>
                  <p className="text-xs text-muted-foreground">Entró: {fechaHora(f.desde)}{f.asignadoPor ? ` (${f.asignadoPor})` : ""}</p>
                </div>
                <div className="text-right text-xs">
                  {f.hasta ? (
                    <>
                      <p>Salió: {fechaHora(f.hasta)}</p>
                      <p className="text-muted-foreground">{f.motivo ? MOTIVO_ETIQUETA[f.motivo] : ""}{f.retiradoPor && f.retiradoPor !== "sistema" ? ` (${f.retiradoPor})` : ""}</p>
                    </>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">Ahora dentro</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
