"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/app/crm/use-api";

type Config = {
  activa: boolean; por_dia: number; zona: string; sectores: string[]; siguiente: number; ultima_fecha: string | null;
  ultimo_resultado: { fecha: string; zona: string; sectores: { sector: string; nuevos?: number; revisados?: number; error?: string }[]; importados: number } | null;
};
type Datos = { ok: boolean; config: Config; sectores: { id: string; nombre: string }[]; en_marcha: boolean; rutina_en_curso: boolean };

async function llamar(url: string, metodo: string, cuerpo: object) {
  const res = await fetch(url, { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; mensaje?: string };
  if (!res.ok || !d.ok) throw new Error(d.error || "No se pudo completar la acción");
  return d;
}

/** Búsqueda automática de empresas: cada día, dentro del horario del agente de empresas, busca unas cuantas nuevas (rotando de sector), las importa a Gestión MAILS
    como «Pendiente» y el agente las redacta y las envía con su límite y su ritmo. */
export function BusquedaDiariaPanel() {
  const [recarga, setRecarga] = useState(0);
  const { datos, error } = useApi<Datos>("/api/prospeccion/busqueda-diaria", recarga);
  const [editado, setEditado] = useState<Config | null>(null); // cambios sin guardar; mientras no haya, se muestra lo guardado
  const c = editado ?? datos?.config ?? null;
  const setC = (x: Config) => setEditado(x);
  const [trabajando, setTrabajando] = useState(false);

  if (error) return <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">No se pudo cargar la búsqueda automática: {error}</div>;
  if (!datos || !c) return <Skeleton className="h-40 w-full" />;
  const nombre = (id: string) => datos.sectores.find((s) => s.id === id)?.nombre ?? id;
  const proximo = c.sectores.length ? nombre(c.sectores[c.siguiente % c.sectores.length]) : "—";
  const r = c.ultimo_resultado;

  async function guardar() {
    if (!c) return;
    setTrabajando(true);
    try {
      await llamar("/api/prospeccion/busqueda-diaria", "PUT", { activa: c.activa, por_dia: c.por_dia, zona: c.zona, sectores: c.sectores });
      toast.success("Búsqueda automática guardada");
      setEditado(null);
      setRecarga((n) => n + 1);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); } finally { setTrabajando(false); }
  }
  async function buscarAhora() {
    setTrabajando(true);
    try {
      const d = await llamar("/api/prospeccion/busqueda-diaria/ejecutar", "POST", {});
      toast.success(d.mensaje ?? "Buscando…");
      setTimeout(() => setRecarga((n) => n + 1), 120_000);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); } finally { setTrabajando(false); }
  }
  const alternar = (id: string) => setC({ ...c, sectores: c.sectores.includes(id) ? c.sectores.filter((s) => s !== id) : [...c.sectores, id] });

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Búsqueda automática de empresas</h2>
          <p className="max-w-3xl text-xs text-muted-foreground">
            Cada día, dentro del horario del agente de empresas, busca unas cuantas empresas nuevas (rotando de sector), las pasa a Gestión MAILS como «Pendiente» y el agente las analiza, redacta y envía con su límite diario. Si el agente de empresas está apagado, no busca.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={c.activa} onCheckedChange={(v) => setC({ ...c, activa: v === true })} /> Buscar cada día</label>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5"><Label>Empresas nuevas por día</Label><Input type="number" min={1} max={30} value={c.por_dia} onChange={(e) => setC({ ...c, por_dia: Number(e.target.value) || 1 })} /></div>
        <div className="space-y-1.5"><Label>Zona</Label><Input value={c.zona} onChange={(e) => setC({ ...c, zona: e.target.value })} placeholder="Madrid" /></div>
        <div className="space-y-1.5"><Label>Próximo sector</Label><p className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">{proximo}</p></div>
      </div>
      <div className="space-y-1.5">
        <Label>Sectores por los que rota ({c.sectores.length})</Label>
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {datos.sectores.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm"><Checkbox checked={c.sectores.includes(s.id)} onCheckedChange={() => alternar(s.id)} />{s.nombre}</label>
          ))}
        </div>
      </div>
      {r && (
        <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
          Última búsqueda ({r.fecha}, {r.zona}): {r.sectores.map((x) => `${nombre(x.sector)} → ${x.error ? "error" : `${x.nuevos ?? 0} nuevas`}`).join(" · ")}. Importadas a Gestión MAILS: <strong className="text-foreground">{r.importados}</strong>.
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" disabled={trabajando || datos.en_marcha || datos.rutina_en_curso} onClick={buscarAhora}>{datos.en_marcha || datos.rutina_en_curso ? "Buscando…" : "Buscar ahora"}</Button>
        <Button disabled={trabajando} onClick={guardar}>Guardar</Button>
      </div>
    </section>
  );
}
