"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PillBadge } from "@/components/pill-badge";
import { AgentRun, ESTADO_RUN_COLOR, ESTADO_RUN_LABEL } from "@/lib/agentes";
import { type Campaign, type CampaignLead } from "@/lib/campanas";

/** Formulario de "nuevo run" — cada tipo de agente tiene su propia forma
    de arrancar (lead_research parte de sector/ubicación; linkedin_
    intelligence parte de una campaña YA calificada), así que se branchea
    por agentType en vez de forzar un único formulario genérico. */
function NuevoRunLeadResearch({ agentType, onCreado }: { agentType: string; onCreado: (runId: number) => void }) {
  const [sector, setSector] = useState("");
  const [location, setLocation] = useState("");
  const [limit, setLimit] = useState("20");
  const [goal, setGoal] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function crearRun() {
    if (!sector.trim() || !location.trim()) return toast.error("Sector y ubicación son obligatorios");
    const limitNum = Number(limit);
    if (!Number.isInteger(limitNum) || limitNum < 1) return toast.error("El límite debe ser un número entero mayor que 0");

    setEnviando(true);
    try {
      const objetivo = goal.trim() || `Buscar ${sector.trim()} en ${location.trim()}`;
      const res = await fetch("/api/agentes/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentType, goal: objetivo, input: { sector: sector.trim(), location: location.trim(), limit: limitNum } }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Run creado — se ejecutará en breve");
      onCreado(data.runId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <CardContent className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor="sector">Sector *</Label>
        <Input id="sector" placeholder="Ej: clínicas dentales" value={sector} onChange={(e) => setSector(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="location">Ubicación *</Label>
        <Input id="location" placeholder="Ej: Madrid" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="limit">Límite de empresas</Label>
        <Input id="limit" type="number" min={1} max={200} value={limit} onChange={(e) => setLimit(e.target.value)} />
      </div>
      <div className="space-y-1.5 sm:col-span-3">
        <Label htmlFor="goal">Objetivo (opcional — se genera uno automático si lo dejas vacío)</Label>
        <Input
          id="goal"
          placeholder="Ej: Buscar clínicas dentales en Madrid que puedan necesitar automatización de citas"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
      </div>
      <div className="sm:col-span-3">
        <Button onClick={crearRun} disabled={enviando}>
          {enviando ? "Creando..." : "Lanzar run"}
        </Button>
      </div>
    </CardContent>
  );
}

/** Agente LinkedIn independiente: no busca empresas por su cuenta — parte
    de una campaña que YA calificó empresas (con oferta decidida) y, sobre
    ese subconjunto, busca decisores + redacta mensajes de LinkedIn en
    borrador. Por eso el formulario es "elige campaña -> elige empresas",
    no sector/ubicación. */
function NuevoRunLinkedIn({ onCreado }: { onCreado: (campaignId: number, runId: number) => void }) {
  const [campanas, setCampanas] = useState<Campaign[]>([]);
  const [cargandoCampanas, setCargandoCampanas] = useState(true);
  const [campaignId, setCampaignId] = useState<string>("");
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [cargandoLeads, setCargandoLeads] = useState(false);
  const [seleccionadas, setSeleccionadas] = useState<Set<number>>(new Set());
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch("/api/agentes/campanas")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setCampanas(d.campaigns as Campaign[]); })
      .catch(() => {})
      .finally(() => setCargandoCampanas(false));
  }, []);

  useEffect(() => {
    if (!campaignId) { setLeads([]); setSeleccionadas(new Set()); return; }
    setCargandoLeads(true);
    fetch(`/api/agentes/campanas/${campaignId}/leads`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) { setLeads([]); return; }
        // Solo empresas con oferta decidida (offer != none/null) -- sin
        // eso no hay "ángulo" real al que anclar un mensaje de LinkedIn.
        const conOferta = (d.leads as CampaignLead[]).filter((l) => l.offer && l.offer !== "none");
        setLeads(conOferta);
        setSeleccionadas(new Set(conOferta.map((l) => l.companyId)));
      })
      .catch(() => setLeads([]))
      .finally(() => setCargandoLeads(false));
  }, [campaignId]);

  function alternar(companyId: number) {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) next.delete(companyId); else next.add(companyId);
      return next;
    });
  }

  async function lanzar() {
    if (!campaignId) return toast.error("Elige una campaña");
    if (seleccionadas.size === 0) return toast.error("Selecciona al menos una empresa");
    setEnviando(true);
    try {
      const res = await fetch(`/api/agentes/campanas/${campaignId}/linkedin-launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceRunId: leads[0]?.runId, companyIds: [...seleccionadas] }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Agente LinkedIn lanzado — se ejecutará en breve");
      onCreado(Number(campaignId), data.runId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <CardContent className="space-y-4">
      <div className="space-y-1.5 sm:max-w-sm">
        <Label>Campaña de origen *</Label>
        {cargandoCampanas ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Select value={campaignId} onValueChange={(v) => setCampaignId(v || "")}>
            <SelectTrigger>
              {/* Sin esto, Select.Value muestra el id crudo en vez del
                  nombre de la campaña -- mismo bug ya resuelto antes en
                  registrar-pedido-dialog.tsx (el popup con las opciones
                  solo existe en el DOM mientras está abierto, así que no
                  puede resolver la etiqueta del valor ya seleccionado
                  salvo que se le indique explícitamente cómo hacerlo). */}
              <SelectValue>
                {(v: string) => (v ? campanas.find((c) => String(c.id) === v)?.name || v : "Selecciona una campaña")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {campanas.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {campaignId && (
        cargandoLeads ? (
          <Skeleton className="h-24 w-full" />
        ) : leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">Esta campaña no tiene empresas calificadas con oferta decidida todavía.</p>
        ) : (
          <div className="space-y-2">
            <Label>Empresas ({seleccionadas.size} de {leads.length} seleccionadas)</Label>
            <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-md border p-2">
              {leads.map((l) => (
                <label key={l.companyId} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted/50">
                  <Checkbox checked={seleccionadas.has(l.companyId)} onCheckedChange={() => alternar(l.companyId)} />
                  <span className="flex-1 truncate">{l.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{l.offer}</span>
                </label>
              ))}
            </div>
          </div>
        )
      )}

      <Button onClick={lanzar} disabled={enviando || !campaignId || seleccionadas.size === 0}>
        {enviando ? "Lanzando..." : "Lanzar Agente LinkedIn"}
      </Button>
    </CardContent>
  );
}

export default function AgenteTipoPage() {
  const params = useParams<{ agentType: string }>();
  const router = useRouter();
  const agentType = params.agentType;

  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [cargando, setCargando] = useState(true);

  async function cargarRuns() {
    setCargando(true);
    try {
      const res = await fetch(`/api/agentes/runs?agentType=${encodeURIComponent(agentType)}`);
      const data = await res.json();
      if (data.ok) setRuns(data.runs as AgentRun[]);
    } catch {
      // silencioso — la tabla queda vacía, no bloquea el formulario
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarRuns();
  }, [agentType]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo run</CardTitle>
        </CardHeader>
        {agentType === "linkedin_intelligence" ? (
          <NuevoRunLinkedIn onCreado={(_campaignId, runId) => router.push(`/agentes/${agentType}/${runId}`)} />
        ) : (
          <NuevoRunLeadResearch agentType={agentType} onCreado={(runId) => router.push(`/agentes/${agentType}/${runId}`)} />
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de runs</CardTitle>
        </CardHeader>
        <CardContent>
          {cargando ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : runs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Todavía no hay ningún run.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creado</TableHead>
                  <TableHead>Objetivo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Coste</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => {
                  const color = ESTADO_RUN_COLOR[run.status];
                  return (
                    <TableRow key={run.id}>
                      <TableCell className="text-sm text-muted-foreground">{new Date(run.createdAt).toLocaleString("es-ES")}</TableCell>
                      <TableCell className="max-w-xs truncate">{run.goalText}</TableCell>
                      <TableCell>
                        <PillBadge bg={color.bg} color={color.color}>
                          {ESTADO_RUN_LABEL[run.status]}
                        </PillBadge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">${run.totalCostUsd.toFixed(4)}</TableCell>
                      <TableCell className="font-mono text-sm">{run.totalTokensInput + run.totalTokensOutput}</TableCell>
                      <TableCell>
                        <Button variant="link" size="xs" render={<Link href={`/agentes/${agentType}/${run.id}`} />}>
                          Ver detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
