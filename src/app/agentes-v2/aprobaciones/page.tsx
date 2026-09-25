"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { enviarV2, useV2 } from "@/components/agentes-v2/use-v2";
import { Cabecera, CargandoFilas, ErrorCaja, Vacio } from "@/components/agentes-v2/componentes";
import { ETIQUETA_ESTADO_APROBACION, fechaHora, type EstadoAprobacion } from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";

interface Aprobacion {
  id: string;
  kind: string;
  title: string;
  status: EstadoAprobacion;
  scheduled_for: string | null;
  requested_by: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  workflow_run_id: string | null;
  created_at: string;
  department_name: string | null;
  payload: Record<string, unknown>;
}

interface Detalle {
  ok: boolean;
  approval: Aprobacion;
  events: { actor: string; from_status: string | null; to_status: EstadoAprobacion; note: string | null; created_at: string }[];
  workflow_run: { id: string; status: string; current_stage: number } | null;
  proposal: { instruction: string; message: string; changes: { department: string; department_name: string; diff: { field: string; label: string; before: string; after: string }[] }[] } | null;
  allowed: string[];
}

const ORDEN: EstadoAprobacion[] = ["pending_approval", "approved", "scheduled", "executed", "rejected", "failed", "draft"];

const TIPO: Record<string, string> = {
  strategy_change: "Cambio de estrategia",
  content_draft: "Borrador de contenido",
  social_post: "Publicación en redes",
  ad_campaign: "Campaña de anuncios",
  workflow_step: "Paso de una ejecución",
};

const COLOR: Record<EstadoAprobacion, string> = {
  draft: "bg-slate-500/10 text-slate-600",
  pending_approval: "bg-amber-500/10 text-amber-700",
  approved: "bg-green-500/10 text-green-700",
  scheduled: "bg-sky-500/10 text-sky-700",
  executed: "bg-emerald-500/10 text-emerald-700",
  rejected: "bg-slate-500/10 text-slate-600",
  failed: "bg-red-500/10 text-red-700",
};

const tipo = (k: string) => TIPO[k] || k.replace(/_/g, " ");

function PanelDetalle({ id, onCerrar, onCambio }: { id: string; onCerrar: () => void; onCambio: () => void }) {
  const { datos, error, cargando, recargar } = useV2<Detalle>(`approvals/${id}`);
  const [nota, setNota] = useState("");
  const [fecha, setFecha] = useState("");
  const [enviando, setEnviando] = useState(false);

  const decidir = async (accion: "approve" | "reject") => {
    setEnviando(true);
    try {
      await enviarV2("POST", `approvals/${id}/${accion}`, { note: nota.trim() || undefined, scheduled_for: accion === "approve" && fecha ? new Date(fecha).toISOString() : undefined });
      toast.success(accion === "approve" ? (fecha ? "Aprobada y programada" : "Aprobada") : "Rechazada");
      setNota("");
      recargar();
      onCambio();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo registrar la decisión");
      recargar();
    } finally {
      setEnviando(false);
    }
  };

  const ap = datos?.approval;
  const pendiente = ap?.status === "pending_approval";
  const cargaGenerica = ap && ap.kind !== "strategy_change" ? Object.entries(ap.payload || {}).filter(([, v]) => v !== null && v !== "") : [];

  return (
    <Dialog open onOpenChange={(abierto) => { if (!abierto) onCerrar(); }}>
      <DialogContent className="flex max-h-[88vh] flex-col overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{ap ? ap.title : "Aprobación"}</DialogTitle>
          <DialogDescription>{ap ? [tipo(ap.kind), ap.department_name].filter(Boolean).join(" · ") : "Cargando…"}</DialogDescription>
        </DialogHeader>

        {error && <ErrorCaja mensaje={error} />}
        {cargando && !datos && <CargandoFilas n={3} />}

        {datos && ap && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", COLOR[ap.status])}>{ETIQUETA_ESTADO_APROBACION[ap.status]}</span>
              {ap.scheduled_for && <span className="text-xs text-muted-foreground">Programada para {fechaHora(ap.scheduled_for)}</span>}
              {datos.workflow_run && <span className="text-xs text-muted-foreground">Ejecución #{datos.workflow_run.id} ({datos.workflow_run.status})</span>}
            </div>

            {datos.proposal && (
              <section className="space-y-3">
                <p className="text-muted-foreground">«{datos.proposal.instruction}»</p>
                {datos.proposal.changes.map((c) => (
                  <div key={c.department} className="overflow-hidden rounded-md border">
                    <div className="border-b bg-muted/40 px-3 py-1.5 font-medium">{c.department_name}</div>
                    <ul className="divide-y">
                      {c.diff.map((d) => (
                        <li key={d.field} className="grid gap-1 px-3 py-2 sm:grid-cols-[8rem_1fr_auto_1fr] sm:items-center sm:gap-3">
                          <span className="text-muted-foreground">{d.label}</span>
                          <span className="text-muted-foreground line-through decoration-muted-foreground/40">{d.before}</span>
                          <span className="hidden text-muted-foreground sm:block">→</span>
                          <span className="font-medium">{d.after}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            )}

            {cargaGenerica.length > 0 && (
              <section className="space-y-1 rounded-md border p-3">
                {cargaGenerica.map(([k, v]) => (
                  <div key={k} className="grid gap-1 sm:grid-cols-[8rem_1fr]">
                    <span className="text-muted-foreground">{k.replace(/_/g, " ")}</span>
                    <span className="break-words whitespace-pre-wrap">{typeof v === "string" ? v : JSON.stringify(v)}</span>
                  </div>
                ))}
              </section>
            )}

            <section>
              <h3 className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">Historial</h3>
              <ol className="space-y-1.5">
                {datos.events.map((e, i) => (
                  <li key={i} className="flex flex-wrap gap-x-2 text-xs">
                    <span className="text-muted-foreground tabular-nums">{fechaHora(e.created_at)}</span>
                    <span className="font-medium">{ETIQUETA_ESTADO_APROBACION[e.to_status]}</span>
                    <span className="text-muted-foreground">· {e.actor}</span>
                    {e.note && <span className="text-muted-foreground">— {e.note}</span>}
                  </li>
                ))}
              </ol>
            </section>

            {pendiente ? (
              <section className="space-y-3 border-t pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nota">Nota (opcional)</Label>
                  <Textarea id="nota" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Por qué apruebas o rechazas" maxLength={1000} />
                </div>
                {ap.kind !== "strategy_change" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="fecha">Programar para (opcional)</Label>
                    <Input id="fecha" type="datetime-local" className="w-56" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                  </div>
                )}
                <DialogFooter className="sm:justify-start">
                  <Button variant="outline" disabled={enviando} onClick={() => decidir("reject")}>Rechazar</Button>
                  <Button disabled={enviando} onClick={() => decidir("approve")}>
                    {ap.kind === "strategy_change" ? "Aprobar y aplicar cambios" : fecha ? "Aprobar y programar" : "Aprobar"}
                  </Button>
                </DialogFooter>
                {datos.workflow_run && <p className="text-xs text-muted-foreground">Aprobar reanuda la ejecución; rechazar la cancela.</p>}
              </section>
            ) : (
              ap.decision_note && <p className="border-t pt-3 text-muted-foreground">Nota: {ap.decision_note}</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Centro de aprobaciones: todo lo que necesita una decisión humana antes de ejecutarse. */
export default function AprobacionesPage() {
  const [estado, setEstado] = useState<"" | EstadoAprobacion>("pending_approval");
  const [abierta, setAbierta] = useState<string | null>(null);
  const { datos, error, cargando, recargar } = useV2<{ ok: boolean; approvals: Aprobacion[]; counts: Record<string, number> }>(`approvals${estado ? `?status=${estado}` : ""}`);
  return (
    <div>
      <Cabecera titulo="Aprobaciones" descripcion="Todo lo que necesita una decisión humana antes de ejecutarse: contenido, publicaciones, campañas, pasos de una ejecución y cambios de estrategia." />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["pending_approval", "", ...ORDEN.slice(1)] as ("" | EstadoAprobacion)[]).map((e) => (
          <button
            key={e || "todas"}
            type="button"
            aria-pressed={estado === e}
            onClick={() => setEstado(e)}
            className={cn("rounded-full border px-3 py-1 text-xs transition-colors", estado === e ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground hover:text-foreground")}
          >
            {e ? `${ETIQUETA_ESTADO_APROBACION[e]} (${datos?.counts[e] ?? 0})` : "Todas"}
          </button>
        ))}
      </div>
      {error && <ErrorCaja mensaje={error} />}
      {cargando && !datos ? (
        <CargandoFilas />
      ) : !datos || datos.approvals.length === 0 ? (
        <Vacio titulo={estado === "pending_approval" ? "No hay nada por aprobar" : "Sin resultados"} texto="Cuando un departamento o el AI CMO necesite tu decisión, aparecerá aquí." />
      ) : (
        <ul className="divide-y rounded-lg border">
          {datos.approvals.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => setAbierta(a.id)} className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/40">
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[tipo(a.kind), a.department_name, fechaHora(a.created_at)].filter(Boolean).join(" · ")}
                    {a.scheduled_for ? ` · programada ${fechaHora(a.scheduled_for)}` : ""}
                  </p>
                </div>
                <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-xs font-medium", COLOR[a.status])}>{ETIQUETA_ESTADO_APROBACION[a.status]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {abierta && <PanelDetalle id={abierta} onCerrar={() => setAbierta(null)} onCambio={recargar} />}
    </div>
  );
}
