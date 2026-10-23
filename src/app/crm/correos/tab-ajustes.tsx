"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { llamarCorreos, type ConfigCorreo, type DatosConfigCorreo } from "@/lib/crm-correos";
import { useApi } from "../use-api";

const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm";
const DIAS = [["L", "Lun"], ["M", "Mar"], ["X", "Mié"], ["J", "Jue"], ["V", "Vie"], ["S", "Sáb"], ["D", "Dom"]];

/** Ajustes del motor de envío: UN solo buzón remitente, límites por día y por hora, horario, pausa entre correos y copia a supervisión. */
export function TabAjustes() {
  const [recarga, setRecarga] = useState(0);
  const { datos, error } = useApi<DatosConfigCorreo>("/api/crm/correos/config", recarga);
  return (
    <div className="max-w-3xl space-y-5 pt-2">
      <p className="text-sm text-muted-foreground">
        Cómo enviará el sistema cuando se active: desde <strong>un único buzón</strong>, con un máximo de correos al día y por hora, dentro de un horario y con una pausa entre uno y otro, para cuidar la reputación del correo.
      </p>
      {error && <p className="text-sm text-destructive">No se pudo cargar: {error}</p>}
      {!datos && !error && <Skeleton className="h-64 w-full" />}
      {datos && <Formulario key={datos.config.actualizado_en} datos={datos} onGuardado={() => setRecarga((n) => n + 1)} />}
    </div>
  );
}

function Formulario({ datos, onGuardado }: { datos: DatosConfigCorreo; onGuardado: () => void }) {
  const [c, setC] = useState<ConfigCorreo>(datos.config);
  const [guardando, setGuardando] = useState(false);
  const set = <K extends keyof ConfigCorreo>(k: K, v: ConfigCorreo[K]) => setC((x) => ({ ...x, [k]: v }));
  const dias = c.dias_semana.split(",");
  const alternarDia = (d: string) => set("dias_semana", DIAS.map(([id]) => id).filter((id) => (id === d ? !dias.includes(id) : dias.includes(id))).join(","));
  const num = (k: "limite_diario" | "limite_hora" | "hora_inicio" | "hora_fin" | "intervalo_seg" | "comprobar_respuestas_min", min: number, max: number) => (
    <Input type="number" min={min} max={max} value={c[k]} onChange={(e) => set(k, Number(e.target.value))} />
  );

  async function guardar() {
    setGuardando(true);
    try {
      await llamarCorreos("config", "PUT", {
        buzon_id: c.buzon_id, limite_diario: c.limite_diario, limite_hora: c.limite_hora, hora_inicio: c.hora_inicio, hora_fin: c.hora_fin, intervalo_seg: c.intervalo_seg,
        dias_semana: c.dias_semana, cc_supervision: c.cc_supervision ?? "", cc_primero_por_tipo: c.cc_primero_por_tipo, comprobar_respuestas_min: c.comprobar_respuestas_min,
      });
      toast.success("Ajustes guardados");
      onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <div><p className="font-semibold">Envío automático: desactivado</p><p>No hay forma de activarlo desde aquí todavía. Estos ajustes quedan guardados para cuando se construya y se active el envío.</p></div>
        <span className="shrink-0 rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold">APAGADO</span>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Buzón remitente</h2>
        <div className="space-y-1.5">
          <Label>Todos los correos saldrán desde</Label>
          <select className={SELECT} value={c.buzon_id ?? ""} onChange={(e) => set("buzon_id", e.target.value ? Number(e.target.value) : null)}>
            <option value="">— elige el buzón —</option>
            {datos.buzones.map((b) => <option key={b.id} value={b.id}>{b.nombre} · {b.email}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">Son los buzones de Gestión MAILS. Las respuestas llegarán a su bandeja y el sistema las detecta solo.</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Cuántos y cuándo</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5"><Label>Máximo al día</Label>{num("limite_diario", 1, 500)}</div>
          <div className="space-y-1.5"><Label>Máximo por hora</Label>{num("limite_hora", 1, 100)}</div>
          <div className="space-y-1.5"><Label>Pausa entre correos (segundos)</Label>{num("intervalo_seg", 5, 3600)}</div>
          <div className="space-y-1.5"><Label>Desde las (hora Madrid)</Label>{num("hora_inicio", 0, 23)}</div>
          <div className="space-y-1.5"><Label>Hasta las (hora Madrid)</Label>{num("hora_fin", 1, 24)}</div>
          <div className="space-y-1.5"><Label>Revisar respuestas cada (min)</Label>{num("comprobar_respuestas_min", 5, 1440)}</div>
        </div>
        <div>
          <Label className="mb-1.5 block">Días de envío</Label>
          <div className="flex flex-wrap gap-2">
            {DIAS.map(([id, nombre]) => (
              <button key={id} type="button" onClick={() => alternarDia(id)} className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${dias.includes(id) ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>{nombre}</button>
            ))}
          </div>
        </div>
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Con estos valores: como máximo <strong>{c.limite_diario}</strong> correos al día, uno cada <strong>{c.intervalo_seg >= 60 ? `${Math.round(c.intervalo_seg / 60)} min` : `${c.intervalo_seg} s`}</strong>, hasta <strong>{c.limite_hora}</strong> por hora, de {c.hora_inicio}:00 a {c.hora_fin}:00.
          Escribir pocos al día y repartidos protege la reputación del buzón.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Copia a supervisión</h2>
        <div className="space-y-1.5">
          <Label>Correos que reciben copia oculta</Label>
          <Input value={c.cc_supervision ?? ""} placeholder="supervisor@empresa.com, otra@empresa.com" onChange={(e) => set("cc_supervision", e.target.value)} />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={c.cc_primero_por_tipo} onChange={(e) => set("cc_primero_por_tipo", e.target.checked)} /> Solo el primer envío de cada tipo de correo cada día lleva la copia (para revisar cómo queda sin llenar la bandeja)
        </label>
      </section>

      <div className="sticky bottom-0 flex justify-end border-t bg-background/90 py-3 backdrop-blur">
        <Button disabled={guardando} onClick={guardar}>{guardando ? "Guardando…" : "Guardar ajustes"}</Button>
      </div>
    </div>
  );
}
