"use client";

// Tabla de leads de la campaña, fuera del canvas -- el detalle por lead
// (antes un modal disparado desde dentro de la tarjeta "Leads" del
// canvas) dejó de abrirse sin ningún error visible (bug real reportado
// 2026-09-14, causa no confirmada: probablemente algo del árbol
// absolutamente posicionado del canvas/Fullscreen API se interponía).
// El usuario pidió moverlo "a otro lado" -- esta tabla vive a nivel de
// página, fuera de ese árbol, y usa el <Dialog> normal de shadcn (según
// la nota ya documentada en canvas-agente.tsx, ese bug fue específico
// del canvas, no un problema general del componente).

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, X, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PillBadge } from "@/components/pill-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CampaignLead, SERVICE_LABEL, mapearLead } from "@/lib/campanas";

const ESTADO_MENSAJE_LABEL: Record<string, string> = { draft: "Borrador", approved: "Aprobado", rejected: "Rechazado", dispatched: "Enviado" };
const ESTADO_MENSAJE_COLOR: Record<string, { bg: string; color: string }> = {
  draft: { bg: "#fef3c7", color: "#92400e" },
  approved: { bg: "#dcfce7", color: "#166534" },
  rejected: { bg: "#fee2e2", color: "#991b1b" },
  dispatched: { bg: "#e0f2fe", color: "#0369a1" },
};

export function CampaignLeadsTable({ campanaId }: { campanaId: number }) {
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abiertoId, setAbiertoId] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function cargar() {
    try {
      const res = await fetch(`/api/agentes/campanas/${campanaId}/leads`);
      const data = await res.json();
      if (data.ok) setLeads((data.leads as Record<string, unknown>[]).map(mapearLead));
    } catch {
      // silencioso -- la tabla se queda con lo último que tenía
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campanaId]);

  async function revisar(lead: CampaignLead, status: "approved" | "rejected") {
    setEnviando(true);
    try {
      const res = await fetch(`/api/agentes/campanas/${campanaId}/leads/${lead.companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error");
      toast.success(status === "approved" ? "Lead aprobado" : "Lead rechazado");
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) return <Skeleton className="h-24 w-full" />;
  if (leads.length === 0) return null;

  const abierto = leads.find((l) => l.companyId === abiertoId) || null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium">Leads calificados ({leads.length})</h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Oferta</TableHead>
              <TableHead>Mensaje</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.companyId}>
                <TableCell className="max-w-56 truncate font-medium">{lead.name}</TableCell>
                <TableCell className="tabular-nums">{lead.score ?? "—"}</TableCell>
                <TableCell>{lead.offer && lead.offer !== "none" ? (SERVICE_LABEL[lead.offer] ?? lead.offer) : "—"}</TableCell>
                <TableCell>
                  {lead.messageStatus ? (
                    <PillBadge bg={ESTADO_MENSAJE_COLOR[lead.messageStatus].bg} color={ESTADO_MENSAJE_COLOR[lead.messageStatus].color} className="text-[10px]">
                      {ESTADO_MENSAJE_LABEL[lead.messageStatus]}
                    </PillBadge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button size="xs" variant="link" onClick={() => setAbiertoId(lead.companyId)}>Ver detalle</Button>
                    {lead.messageStatus === "draft" && (
                      <>
                        <button
                          type="button"
                          title="Aprobar"
                          onClick={() => revisar(lead, "approved")}
                          disabled={enviando}
                          className="flex size-6 items-center justify-center rounded-sm border border-border text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          <Check className="size-3" />
                        </button>
                        <button
                          type="button"
                          title="Rechazar"
                          onClick={() => revisar(lead, "rejected")}
                          disabled={enviando}
                          className="flex size-6 items-center justify-center rounded-sm border border-border text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          <X className="size-3" />
                        </button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!abierto} onOpenChange={(o) => !o && setAbiertoId(null)}>
        <DialogContent className="sm:max-w-md">
          {abierto && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{abierto.name}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="max-h-[65vh] space-y-3 overflow-y-auto text-xs">
                <p className="text-muted-foreground">
                  {[abierto.sector, abierto.location].filter(Boolean).join(" · ") || "Sin datos de sector/ubicación"}
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <span><span className="text-muted-foreground">Score:</span> <b>{abierto.score ?? "—"}</b></span>
                  {abierto.fit && <span><span className="text-muted-foreground">Fit:</span> <b>{abierto.fit}</b></span>}
                  {abierto.confidence !== null && (
                    <span><span className="text-muted-foreground">Confianza:</span> <b>{Math.round(abierto.confidence * 100)}%</b></span>
                  )}
                </div>

                {abierto.offer && abierto.offer !== "none" && (
                  <div className="rounded-md border border-sky-200 bg-sky-50 p-3">
                    <p className="font-medium text-sky-800">Oferta: {SERVICE_LABEL[abierto.offer] ?? abierto.offer}</p>
                    {abierto.angle && <p className="mt-1">{abierto.angle}</p>}
                    {abierto.rationale && <p className="mt-1 text-muted-foreground">{abierto.rationale}</p>}
                  </div>
                )}

                {abierto.reason && (
                  <div>
                    <p className="font-medium text-muted-foreground">Calificación</p>
                    <p>{abierto.reason}</p>
                  </div>
                )}

                {abierto.briefOpportunities.length > 0 && (
                  <div>
                    <p className="font-medium text-muted-foreground">Oportunidades</p>
                    <ul className="list-disc pl-4">
                      {abierto.briefOpportunities.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                )}

                {(abierto.risks.length > 0 || abierto.possibleProblems.length > 0) && (
                  <div>
                    <p className="font-medium text-muted-foreground">Riesgos / puntos de dolor</p>
                    <ul className="list-disc pl-4">
                      {(abierto.risks.length ? abierto.risks : abierto.possibleProblems).map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                )}

                {abierto.briefSummary && (
                  <div>
                    <p className="font-medium text-muted-foreground">Research</p>
                    <p>{abierto.briefSummary}</p>
                  </div>
                )}

                {abierto.facts.length > 0 && (
                  <div>
                    <p className="font-medium text-muted-foreground">Hechos verificados</p>
                    <ul className="list-disc pl-4">
                      {abierto.facts.map((f, i) => (
                        <li key={i}>
                          {f.statement}
                          {f.evidenceUrls?.length ? <span className="text-muted-foreground"> — {f.evidenceUrls.join(", ")}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {abierto.inferences.length > 0 && (
                  <div>
                    <p className="font-medium text-muted-foreground">Inferencias</p>
                    <ul className="list-disc pl-4">
                      {abierto.inferences.map((f, i) => (
                        <li key={i}>{f.statement}{f.confidence != null ? ` (conf. ${Math.round(f.confidence * 100)}%)` : ""}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {abierto.evidence.length > 0 && (
                  <details>
                    <summary className="cursor-pointer font-medium text-muted-foreground select-none">Evidencia ({abierto.evidence.length})</summary>
                    <ul className="mt-1 space-y-1 border-l pl-3">
                      {abierto.evidence.map((e, i) => (
                        <li key={i}>
                          <span className="text-muted-foreground">[{e.type}] </span>
                          {e.statement || e.url}
                          {e.url && e.statement ? <span className="text-muted-foreground"> — {e.url}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {abierto.message && (
                  <div className="rounded-md border border-border p-3">
                    <p className="font-medium text-muted-foreground">
                      Mensaje {abierto.channel ? `(${abierto.channel})` : ""} {abierto.subject ? `— ${abierto.subject}` : ""}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{abierto.message}</p>
                  </div>
                )}

                {abierto.messageStatus === "draft" && (
                  <div className="flex justify-end gap-2 border-t pt-3">
                    <Button size="sm" variant="outline" onClick={() => { revisar(abierto, "rejected"); setAbiertoId(null); }} disabled={enviando}>
                      Rechazar
                    </Button>
                    <Button size="sm" onClick={() => { revisar(abierto, "approved"); setAbiertoId(null); }} disabled={enviando}>
                      Aprobar
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
