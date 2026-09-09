"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PillBadge } from "@/components/pill-badge";
import { useConfirm } from "@/components/confirm-provider";
import { AgentLead, AgentRun, AgentStep, ESTADO_RUN_COLOR, ESTADO_RUN_LABEL } from "@/lib/agentes";
import { TrazaAgente } from "./traza-agente";

const ESTADO_MENSAJE_LABEL: Record<string, string> = { draft: "Borrador", approved: "Aprobado", rejected: "Rechazado" };
const ESTADO_MENSAJE_COLOR: Record<string, { bg: string; color: string }> = {
  draft: { bg: "#e5e7eb", color: "#374151" },
  approved: { bg: "#dcfce7", color: "#166534" },
  rejected: { bg: "#fee2e2", color: "#991b1b" },
};

export default function AgenteRunDetallePage() {
  const params = useParams<{ agentType: string; runId: string }>();
  const confirmar = useConfirm();

  const [run, setRun] = useState<AgentRun | null>(null);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [leads, setLeads] = useState<AgentLead[]>([]);
  const [cargando, setCargando] = useState(true);
  const [leadAbierto, setLeadAbierto] = useState<AgentLead | null>(null);
  const [tipoLabel, setTipoLabel] = useState(params.agentType);

  useEffect(() => {
    fetch("/api/agentes/tipos")
      .then((r) => r.json())
      .then((data) => {
        const tipo = data.ok ? data.tipos.find((t: { type: string }) => t.type === params.agentType) : null;
        if (tipo) setTipoLabel(tipo.label);
      })
      .catch(() => {});
  }, [params.agentType]);

  async function cargar() {
    try {
      const [resRun, resLeads] = await Promise.all([
        fetch(`/api/agentes/runs/${params.runId}`),
        fetch(`/api/agentes/runs/${params.runId}/leads`),
      ]);
      const dataRun = await resRun.json();
      const dataLeads = await resLeads.json();
      if (dataRun.ok) {
        setRun(dataRun.run as AgentRun);
        setSteps(dataRun.steps as AgentStep[]);
      }
      if (dataLeads.ok) setLeads(dataLeads.leads as AgentLead[]);
    } catch {
      // silencioso — el estado de carga previo se mantiene visible
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // Refresco periódico mientras el run está en curso, para ver el
    // progreso sin recargar la página a mano.
    const interval = setInterval(cargar, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.runId]);

  async function revisarLead(lead: AgentLead, status: "approved" | "rejected") {
    if (status === "rejected") {
      const ok = await confirmar(`¿Rechazar el mensaje para "${lead.name}"? No se enviará nada.`, { titulo: "Rechazar lead" });
      if (!ok) return;
    }
    try {
      const res = await fetch(`/api/agentes/runs/${params.runId}/leads/${lead.companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(status === "approved" ? "Mensaje aprobado" : "Mensaje rechazado");
      setLeadAbierto(null);
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  if (cargando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!run) {
    return <p className="text-sm text-muted-foreground">Run no encontrado.</p>;
  }

  const color = ESTADO_RUN_COLOR[run.status];
  const progreso = run.progress as Record<string, number | undefined>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">{run.goalText}</h1>
          <p className="text-sm text-muted-foreground">Creado el {new Date(run.createdAt).toLocaleString("es-ES")} por {run.createdBy}</p>
        </div>
        <PillBadge bg={color.bg} color={color.color} className="shrink-0">
          {ESTADO_RUN_LABEL[run.status]}
        </PillBadge>
      </div>

      {run.error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4 text-sm text-destructive">{run.error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card size="sm">
          <CardHeader><CardDescription>Coste total</CardDescription><CardTitle className="font-mono">${run.totalCostUsd.toFixed(4)}</CardTitle></CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader><CardDescription>Tokens</CardDescription><CardTitle className="font-mono">{run.totalTokensInput + run.totalTokensOutput}</CardTitle></CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader><CardDescription>Empresas encontradas</CardDescription><CardTitle>{progreso.companiesFound ?? "—"}</CardTitle></CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader><CardDescription>Leads calificados</CardDescription><CardTitle>{progreso.companiesQualified ?? "—"}</CardTitle></CardHeader>
        </Card>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <TrazaAgente run={run} steps={steps} tipoLabel={tipoLabel} />
        <div className="min-h-70 flex-1 rounded-xl border border-dashed" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leads calificados</CardTitle>
          <CardDescription>Ningún mensaje se envía automáticamente — revisa y aprueba/rechaza cada uno.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Servicio recomendado</TableHead>
                <TableHead>Mensaje</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => {
                const colorMsg = lead.messageStatus ? ESTADO_MENSAJE_COLOR[lead.messageStatus] : null;
                return (
                  <TableRow key={lead.companyId}>
                    <TableCell>
                      <div className="font-medium">{lead.name}</div>
                      {lead.website && <div className="text-xs text-muted-foreground">{lead.website}</div>}
                    </TableCell>
                    <TableCell>{lead.score ?? "—"}</TableCell>
                    <TableCell className="max-w-xs truncate">{lead.recommendedService || "—"}</TableCell>
                    <TableCell>
                      {colorMsg && lead.messageStatus && (
                        <PillBadge bg={colorMsg.bg} color={colorMsg.color}>{ESTADO_MENSAJE_LABEL[lead.messageStatus]}</PillBadge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="link" size="xs" onClick={() => setLeadAbierto(lead)}>Ver mensaje</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {leads.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sin leads calificados todavía.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={leadAbierto !== null} onOpenChange={(o) => !o && setLeadAbierto(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>{leadAbierto?.name}</DialogTitle>
          <div className="space-y-3 text-sm">
            {leadAbierto?.reason && <p className="text-muted-foreground">{leadAbierto.reason}</p>}
            <div className="rounded-md border bg-muted/30 p-3">
              {leadAbierto?.subject && <p className="mb-1 font-medium">{leadAbierto.subject}</p>}
              <p className="whitespace-pre-wrap">{leadAbierto?.message || "Sin mensaje generado."}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => leadAbierto && revisarLead(leadAbierto, "rejected")} disabled={leadAbierto?.messageStatus !== "draft"}>
              Rechazar
            </Button>
            <Button onClick={() => leadAbierto && revisarLead(leadAbierto, "approved")} disabled={leadAbierto?.messageStatus !== "draft"}>
              Aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
