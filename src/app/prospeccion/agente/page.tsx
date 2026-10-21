"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { MODOS, type ConfigProspeccion, type DatosConfig } from "@/lib/prospeccion";
import { useApi } from "../../crm/use-api";

const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm";

export default function ProspeccionAgentePage() {
  const [recarga, setRecarga] = useState(0);
  const { datos, error } = useApi<DatosConfig>("/api/prospeccion/config", recarga);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Prospección · Agente</h1>
        <p className="text-sm text-muted-foreground">Cómo escribe el agente, a quién y con qué límites. Empieza apagado y en modo con aprobación: nada se envía sin que lo actives.</p>
      </div>
      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">No se pudo cargar: {error}</div>}
      {!datos && !error && <Skeleton className="h-64 w-full" />}
      {datos && <Formulario key={datos.config.actualizado_en} datos={datos} onGuardado={() => setRecarga((n) => n + 1)} />}
    </div>
  );
}

function Formulario({ datos, onGuardado }: { datos: DatosConfig; onGuardado: () => void }) {
  const [c, setC] = useState<ConfigProspeccion>(datos.config);
  const [guardando, setGuardando] = useState(false);
  const set = <K extends keyof ConfigProspeccion>(k: K, v: ConfigProspeccion[K]) => setC((x) => ({ ...x, [k]: v }));

  async function guardar() {
    setGuardando(true);
    try {
      const res = await fetch("/api/prospeccion/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activo: c.activo, modo: c.modo, limite_diario: c.limite_diario, hora_inicio: c.hora_inicio, hora_fin: c.hora_fin, intervalo_min: c.intervalo_min,
          buzon_id: c.buzon_id, grupo_envio: c.grupo_envio ?? "", sector: c.sector ?? "", propuesta: c.propuesta, tono: c.tono, firma: c.firma, texto_baja: c.texto_baja,
        }),
      });
      const d = (await res.json()) as { ok: boolean; error?: string };
      if (!d.ok) throw new Error(d.error || "No se pudo guardar");
      toast.success("Configuración guardada");
      onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  const num = (k: "limite_diario" | "hora_inicio" | "hora_fin" | "intervalo_min", min: number, max: number) => (
    <Input type="number" min={min} max={max} value={c[k]} onChange={(e) => set(k, Number(e.target.value))} />
  );

  return (
    <div className="space-y-6">
      <section className={`rounded-lg border p-4 ${c.activo ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" className="size-5" checked={c.activo} onChange={(e) => set("activo", e.target.checked)} />
          <span>
            <span className="block font-semibold">{c.activo ? "Agente activo" : "Agente apagado"}</span>
            <span className="block text-sm text-muted-foreground">Mientras esté apagado no redacta ni envía nada por su cuenta. Los botones manuales de «Mensajes» siguen funcionando.</span>
          </span>
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Modo de trabajo</h2>
        <div className="grid gap-2 md:grid-cols-3">
          {MODOS.map((m) => (
            <button key={m.id} type="button" onClick={() => set("modo", m.id)} className={`rounded-lg border p-3 text-left transition-colors ${c.modo === m.id ? "border-primary bg-primary/5" : "bg-card hover:bg-muted"}`}>
              <p className="text-sm font-semibold">{m.nombre}</p>
              <p className="mt-1 text-xs text-muted-foreground">{m.descripcion}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Buzón desde el que envía</Label>
          <select className={SELECT} value={c.buzon_id ?? ""} onChange={(e) => set("buzon_id", e.target.value ? Number(e.target.value) : null)}>
            <option value="">— elige un buzón —</option>
            {datos.buzones.map((b) => <option key={b.id} value={b.id}>{b.nombre} · {b.email}</option>)}
          </select>
        </div>
        <div className="space-y-1.5"><Label>Límite de envíos al día</Label>{num("limite_diario", 1, 200)}</div>
        <div className="space-y-1.5"><Label>Desde las (hora Madrid)</Label>{num("hora_inicio", 0, 23)}</div>
        <div className="space-y-1.5"><Label>Hasta las (hora Madrid)</Label>{num("hora_fin", 1, 24)}</div>
        <div className="space-y-1.5"><Label>Minutos mínimos entre envíos</Label>{num("intervalo_min", 1, 240)}</div>
        <div className="space-y-1.5">
          <Label>Grupo de envío (opcional)</Label>
          <select className={SELECT} value={c.grupo_envio ?? ""} onChange={(e) => set("grupo_envio", e.target.value || null)}>
            <option value="">Todos los grupos</option>
            {datos.grupos.map((g) => <option key={g.g} value={g.g}>{g.g} ({g.n})</option>)}
          </select>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Solo sectores que contengan (opcional)</Label>
          <Input value={c.sector ?? ""} placeholder="p. ej. informática" onChange={(e) => set("sector", e.target.value)} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Qué dice el mensaje</h2>
        <div className="space-y-1.5"><Label>Propuesta (qué ofrecemos)</Label><Textarea rows={4} value={c.propuesta} onChange={(e) => set("propuesta", e.target.value)} /></div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5"><Label>Tono</Label><Input value={c.tono} onChange={(e) => set("tono", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Firma</Label><Input value={c.firma} onChange={(e) => set("firma", e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label>Texto de baja (se añade siempre al final)</Label><Textarea rows={2} value={c.texto_baja} onChange={(e) => set("texto_baja", e.target.value)} /></div>
      </section>

      <section className="rounded-lg border bg-card p-4 text-sm">
        <h2 className="mb-2 font-semibold">A quién puede escribir</h2>
        <p className="text-muted-foreground">
          Solo a empresas de la base de Gestión MAILS con estado <strong className="text-foreground">«Pendiente»</strong> y correo, que no hayan rebotado antes. Ahora hay{" "}
          <strong className="text-foreground">{datos.candidatos}</strong> lista{datos.candidatos === 1 ? "" : "s"} con esta selección. Estado de toda la base:
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {datos.estados_leads.map((e) => <span key={e.estado} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">{e.estado}: {e.n}</span>)}
        </div>
        {datos.candidatos === 0 && <p className="mt-3 rounded-md bg-amber-50 p-2 text-xs text-amber-900">No hay ninguna empresa en «Pendiente». Para que el agente tenga a quién escribir, importa o marca como «Pendiente» las empresas en Gestión MAILS → Leads. El agente nunca toca las que están en «No contactar».</p>}
      </section>

      <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-background/90 py-3 backdrop-blur">
        <Button disabled={guardando} onClick={guardar}>{guardando ? "Guardando…" : "Guardar configuración"}</Button>
      </div>
    </div>
  );
}
