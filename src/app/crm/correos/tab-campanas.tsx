"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ETAPAS, ORIGENES, fechaHora, type Etapa, type Origen } from "@/lib/crm";
import { RECURRENCIAS, chipEstadoCampana, llamarCorreos, nombreEstadoCampana, type Campana, type EstadoCampana, type PasoCampana, type PlanCorreos, type Recurrencia, type Segmento, type TipoCorreo } from "@/lib/crm-correos";
import { useApi } from "../use-api";

const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm";
const CANALES_ELEGIBLES = ORIGENES.filter((o) => ["whatsapp", "llamada", "web", "email"].includes(o.id));

/** «2026-10-28T10:30» (hora local del navegador) ↔ ISO. */
const aLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function TabCampanas() {
  const [recarga, setRecarga] = useState(0);
  const { datos, error } = useApi<{ ok: boolean; envio_activo: boolean; campanas: Campana[] }>("/api/crm/correos/campanas", recarga);
  const { datos: tiposDatos } = useApi<{ ok: boolean; tipos: TipoCorreo[] }>("/api/crm/correos/tipos");
  const [editando, setEditando] = useState<Campana | "nueva" | null>(null);
  const { datos: plan } = useApi<PlanCorreos>("/api/crm/correos/plan", recarga);

  async function cambiarEstado(c: Campana, estado: EstadoCampana) {
    try {
      await llamarCorreos(`campanas/${c.id}`, "PATCH", { estado });
      toast.success(`Campaña ${nombreEstadoCampana(estado).toLowerCase()}`);
      setRecarga((n) => n + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-muted-foreground">Prepara cada envío: a quién (por canal, etapa o clientes), con qué tipo de correo y cuándo. Aunque la dejes «Programada», no saldrá nada mientras los envíos estén desactivados.</p>
        <Button className="gap-1.5" onClick={() => setEditando("nueva")}><Plus className="size-4" /> Nueva campaña</Button>
      </div>
      {plan && (
        <section className="rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">Plan de hoy <span className="font-normal text-muted-foreground">(solo cálculo: no se envía nada)</span></h2>
            <p className="text-xs text-muted-foreground">{plan.horario} · {plan.ritmo}</p>
          </div>
          <p className="mt-2 text-sm">Con los ajustes actuales saldrían hoy <strong>{plan.total_hoy}</strong> correo{plan.total_hoy === 1 ? "" : "s"} (ya enviados hoy: {plan.enviados_hoy} de un máximo de {plan.limite_diario}).</p>
          {plan.campanas.length > 0 && (
            <ul className="mt-2 grid gap-2 md:grid-cols-2">
              {plan.campanas.map((c) => (
                <li key={c.id} className="rounded-md border p-2 text-xs">
                  <p className="font-medium">{c.nombre}{c.pasos > 1 ? ` · ${c.pasos} pasos` : ""}</p>
                  <p className="text-muted-foreground">Hoy {c.hoy} · pendientes {c.pendientes} de {c.audiencia}{c.dias_restantes > 0 ? ` · unos ${c.dias_restantes} día${c.dias_restantes === 1 ? "" : "s"} para terminar` : ""}</p>
                </li>
              ))}
            </ul>
          )}
          {plan.motivos.length > 0 && <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-amber-800">{plan.motivos.map((m) => <li key={m}>{m}</li>)}</ul>}
        </section>
      )}
      {error && <p className="text-sm text-destructive">No se pudo cargar: {error}</p>}
      {!datos && !error && <Skeleton className="h-48 w-full" />}
      {datos && (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Campaña</TableHead><TableHead>Tipo de correo</TableHead><TableHead className="text-right">Audiencia</TableHead><TableHead>Cuándo</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
            <TableBody>
              {datos.campanas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell className="text-xs">{(c.pasos?.length ?? 0) > 1 ? `Secuencia de ${c.pasos.length} pasos` : c.tipo_nombre ?? "—"}</TableCell>
                  <TableCell className="text-right text-xs">{c.audiencia} contactos</TableCell>
                  <TableCell className="text-xs">{c.programado_para ? fechaHora(c.programado_para) : "Sin fecha"}{c.recurrencia !== "ninguna" ? ` · ${RECURRENCIAS.find((r) => r.id === c.recurrencia)?.nombre.toLowerCase()}` : ""}</TableCell>
                  <TableCell><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${chipEstadoCampana(c.estado)}`}>{nombreEstadoCampana(c.estado)}</span></TableCell>
                  <TableCell className="space-x-1 text-right">
                    {c.estado !== "cancelada" && <Button variant="outline" size="sm" onClick={() => setEditando(c)}>Editar</Button>}
                    {c.estado === "programada" && <Button variant="outline" size="sm" onClick={() => cambiarEstado(c, "pausada")}>Pausar</Button>}
                    {c.estado === "pausada" && <Button variant="outline" size="sm" onClick={() => cambiarEstado(c, "programada")}>Reanudar</Button>}
                    {c.estado !== "cancelada" && <Button variant="ghost" size="sm" onClick={() => cambiarEstado(c, "cancelada")}>Cancelar</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {datos.campanas.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Todavía no hay campañas. Pulsa «Nueva campaña» para preparar la primera.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
      {editando !== null && <EditorCampana campana={editando === "nueva" ? null : editando} tipos={tiposDatos?.tipos.filter((t) => t.activo) ?? []} onCerrar={() => setEditando(null)} onGuardado={() => { setEditando(null); setRecarga((n) => n + 1); }} />}
    </div>
  );
}

function EditorCampana({ campana, tipos, onCerrar, onGuardado }: { campana: Campana | null; tipos: TipoCorreo[]; onCerrar: () => void; onGuardado: () => void }) {
  const [nombre, setNombre] = useState(campana?.nombre ?? "");
  const [pasos, setPasos] = useState<PasoCampana[]>(campana?.pasos?.length ? campana.pasos : campana?.tipo_id ? [{ tipo_id: campana.tipo_id, espera_dias: 0 }] : [{ tipo_id: 0, espera_dias: 0 }]);
  const [limiteDia, setLimiteDia] = useState(campana?.limite_diario ? String(campana.limite_diario) : "");
  const [seg, setSeg] = useState<Segmento>(campana?.segmento ?? { canales: [], etapas: [], categorias: [], incluir_clientes: false });
  const [cuando, setCuando] = useState(aLocal(campana?.programado_para ?? null));
  const [recurrencia, setRecurrencia] = useState<Recurrencia>(campana?.recurrencia ?? "ninguna");
  const [audiencia, setAudiencia] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);

  // La audiencia se recalcula sola al cambiar el segmento.
  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const d = await llamarCorreos("audiencia", "POST", { segmento: seg });
        if (vigente) setAudiencia(Number(d.audiencia));
      } catch {
        if (vigente) setAudiencia(null);
      }
    })();
    return () => { vigente = false; };
  }, [seg]);

  const alternar = <K extends "canales" | "etapas">(k: K, v: Segmento[K][number]) =>
    setSeg((s) => ({ ...s, [k]: (s[k] as string[]).includes(v as string) ? (s[k] as string[]).filter((x) => x !== v) : [...(s[k] as string[]), v as string] }) as Segmento);

  async function guardar(estado: EstadoCampana) {
    if (!nombre.trim()) { toast.error("Ponle un nombre a la campaña"); return; }
    setGuardando(true);
    try {
      const pasosValidos = pasos.filter((x) => x.tipo_id > 0);
      const datos = { nombre, tipo_id: pasosValidos[0]?.tipo_id ?? null, pasos: pasosValidos, limite_diario: limiteDia ? Number(limiteDia) : null, segmento: seg, programado_para: cuando ? new Date(cuando).toISOString() : null, recurrencia, estado };
      if (campana) await llamarCorreos(`campanas/${campana.id}`, "PATCH", datos);
      else await llamarCorreos("campanas", "POST", datos);
      toast.success(estado === "programada" ? "Campaña programada (no se enviará hasta activar los envíos)" : "Borrador guardado");
      onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !guardando) onCerrar(); }}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{campana ? "Editar campaña" : "Nueva campaña"}</DialogTitle>
          <DialogDescription>Elige a quién, qué correo y cuándo. Solo se cuentan los contactos aptos (sin baja, rebote ni «No contactar»).</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Nombre de la campaña</Label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={160} placeholder="Promoción de noviembre" /></div>
          <fieldset className="space-y-2 rounded-lg border p-3">
            <legend className="px-1 text-sm font-medium">Qué correos se envían (secuencia)</legend>
            <p className="text-xs text-muted-foreground">El primer paso sale al empezar; cada paso siguiente, pasados los días indicados, solo a quien no haya respondido. Máximo 6 pasos.</p>
            {pasos.map((p, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">Paso {i + 1}</span>
                <select className={`${SELECT} min-w-52 flex-1`} value={p.tipo_id || ""} onChange={(e) => setPasos((x) => x.map((y, j) => (j === i ? { ...y, tipo_id: Number(e.target.value) } : y)))}>
                  <option value="">— elige un tipo —</option>
                  {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
                {i > 0 ? (
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">tras <Input type="number" min={0} max={60} className="h-9 w-16" value={p.espera_dias} onChange={(e) => setPasos((x) => x.map((y, j) => (j === i ? { ...y, espera_dias: Number(e.target.value) } : y)))} /> días</label>
                ) : <span className="w-28 text-xs text-muted-foreground">al empezar</span>}
                {pasos.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => setPasos((x) => x.filter((_, j) => j !== i))}>Quitar</Button>}
              </div>
            ))}
            {pasos.length < 6 && <Button type="button" variant="outline" size="sm" onClick={() => setPasos((x) => [...x, { tipo_id: 0, espera_dias: 3 }])}>+ Añadir paso</Button>}
          </fieldset>
          <div className="space-y-1.5">
            <Label>Límite diario de esta campaña (opcional)</Label>
            <Input type="number" min={1} max={500} value={limiteDia} placeholder="Sin límite propio: manda el de los ajustes" onChange={(e) => setLimiteDia(e.target.value)} />
          </div>
          <fieldset className="space-y-2 rounded-lg border p-3">
            <legend className="px-1 text-sm font-medium">¿A quién?</legend>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Leads por canal (si no marcas ninguno, todos)</p>
              <div className="flex flex-wrap gap-3">{CANALES_ELEGIBLES.map((o) => <label key={o.id} className="flex cursor-pointer items-center gap-1.5 text-sm"><input type="checkbox" checked={seg.canales.includes(o.id as Origen)} onChange={() => alternar("canales", o.id as Origen)} /> {o.nombre}</label>)}</div>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Etapa del lead (si no marcas ninguna, todas)</p>
              <div className="flex flex-wrap gap-3">{ETAPAS.map((e) => <label key={e.id} className="flex cursor-pointer items-center gap-1.5 text-sm"><input type="checkbox" checked={seg.etapas.includes(e.id as Etapa)} onChange={() => alternar("etapas", e.id as Etapa)} /> {e.nombre}</label>)}</div>
            </div>
            <label className="flex cursor-pointer items-center gap-1.5 text-sm"><input type="checkbox" checked={seg.incluir_clientes} onChange={(e) => setSeg((s) => ({ ...s, incluir_clientes: e.target.checked }))} /> Incluir también a los clientes de Reparaciones</label>
            <p className="rounded-md bg-muted px-3 py-2 text-sm">Audiencia: <strong>{audiencia === null ? "calculando…" : `${audiencia} contactos`}</strong></p>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Fecha y hora de envío</Label><Input type="datetime-local" value={cuando} onChange={(e) => setCuando(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Repetir</Label>
              <select className={SELECT} value={recurrencia} onChange={(e) => setRecurrencia(e.target.value as Recurrencia)}>{RECURRENCIAS.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</select>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" disabled={guardando} onClick={onCerrar}>Cancelar</Button>
          <Button variant="outline" disabled={guardando} onClick={() => guardar("borrador")}>Guardar borrador</Button>
          <Button disabled={guardando} onClick={() => guardar("programada")}>Programar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
