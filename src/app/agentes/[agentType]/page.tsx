"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PillBadge } from "@/components/pill-badge";
import { AgentRun, ESTADO_RUN_COLOR, ESTADO_RUN_LABEL } from "@/lib/agentes";
import { Refresh2 } from "@/lib/icons";

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

/** Agente LinkedIn independiente: no busca empresas por su cuenta, así
    que "lanzar" aquí en realidad crea y lanza una campaña normal del
    Equipo de Marketing IA (sourceConfig.autoChainLinkedin=true) — en
    cuanto esa campaña termina de calificar empresas, linkedinRunner.ts
    lo detecta solo y encadena el Agente LinkedIn sobre las calificadas,
    sin que el usuario tenga que volver aquí a elegir una "campaña de
    origen" a mano (petición del usuario, 2026-09-14: cada agente lanza
    con sus propios datos, no seleccionando un run ya existente). */
function NuevoRunLinkedIn({ onLanzada }: { onLanzada: (campaignId: number) => void }) {
  const [form, setForm] = useState({ name: "", goalText: "", sector: "", location: "", limit: "20", maxCostUsd: 10 });
  const [enviando, setEnviando] = useState(false);

  async function lanzar() {
    if (!form.name.trim() || !form.goalText.trim()) return toast.error("Nombre y objetivo son obligatorios");
    if (!form.sector.trim() || !form.location.trim()) return toast.error("Sector y ubicación son obligatorios");
    const limitNum = Number(form.limit);
    if (!Number.isInteger(limitNum) || limitNum < 1) return toast.error("El límite debe ser un número entero mayor que 0");

    setEnviando(true);
    try {
      const resCrear = await fetch("/api/agentes/campanas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          goalText: form.goalText.trim(),
          maxCostUsd: form.maxCostUsd,
          sourceConfig: {
            mode: "external",
            externalProviders: ["infoisinfo"],
            sector: form.sector.trim(),
            location: form.location.trim(),
            limit: limitNum,
            autoChainLinkedin: true,
          },
        }),
      });
      const dataCrear = await resCrear.json();
      if (!dataCrear.ok) throw new Error(dataCrear.error || "Error al crear la campaña");
      const campaignId = Number(dataCrear.campaign.id);

      const resLanzar = await fetch(`/api/agentes/campanas/${campaignId}/launch`, { method: "POST" });
      const dataLanzar = await resLanzar.json();
      if (!dataLanzar.ok) throw new Error(dataLanzar.error || "Error al lanzar la campaña");

      toast.success("Campaña lanzada — el Agente LinkedIn arrancará solo en cuanto termine de calificar empresas");
      onLanzada(campaignId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <CardContent className="grid gap-3 sm:grid-cols-3">
      <p className="text-sm text-muted-foreground sm:col-span-3">
        El Agente LinkedIn no busca empresas por su cuenta: con estos datos, el Equipo de
        Marketing IA busca y califica empresas primero y, en cuanto termina, el Agente LinkedIn
        arranca automáticamente sobre las calificadas — sin pasos intermedios.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="li-name">Nombre *</Label>
        <Input id="li-name" placeholder="Ej: Seguros Madrid Septiembre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="li-sector">Sector *</Label>
        <Input id="li-sector" placeholder="Ej: seguros" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="li-location">Ubicación *</Label>
        <Input id="li-location" placeholder="Ej: Madrid" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
      </div>
      <div className="space-y-1.5 sm:col-span-3">
        <Label htmlFor="li-goal">Objetivo (lenguaje natural) *</Label>
        <Input
          id="li-goal"
          placeholder="Ej: Conseguir 5 empresas de seguros en Madrid a las que ofrecer automatización"
          value={form.goalText}
          onChange={(e) => setForm({ ...form, goalText: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="li-limit">Límite de empresas</Label>
        <Input id="li-limit" type="number" min={1} max={200} value={form.limit} onChange={(e) => setForm({ ...form, limit: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="li-budget">Presupuesto máx. (USD)</Label>
        <Input id="li-budget" type="number" step="1" value={form.maxCostUsd} onChange={(e) => setForm({ ...form, maxCostUsd: Number(e.target.value) || 0 })} />
      </div>
      <div className="sm:col-span-3">
        <Button onClick={lanzar} disabled={enviando}>
          {enviando ? "Lanzando..." : "Buscar empresas y lanzar Agente LinkedIn"}
        </Button>
      </div>
    </CardContent>
  );
}

export default function AgenteTipoPage() {
  const params = useParams<{ agentType: string }>();
  const router = useRouter();
  const agentType = params.agentType;

  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [cargando, setCargando] = useState(true);

  // Campaña recién lanzada desde el formulario del Agente LinkedIn, cuyo
  // run de linkedin_intelligence TODAVÍA no existe (el Equipo de Marketing
  // IA va primero) -- mientras tanto se muestra un aviso aquí mismo, en la
  // propia pantalla del agente, en vez de mandar al usuario a la interfaz
  // de otro agente sin explicación (petición del usuario, 2026-09-14).
  const [pendienteCampaignId, setPendienteCampaignId] = useState<number | null>(null);
  const [pendienteNombre, setPendienteNombre] = useState<string | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentType]);

  useEffect(() => {
    if (!pendienteCampaignId) return;
    let cancelado = false;
    async function refrescar() {
      try {
        const res = await fetch(`/api/agentes/campanas/${pendienteCampaignId}`);
        const data = await res.json();
        if (!cancelado && data.ok) setPendienteNombre(data.campaign.name);
      } catch {
        // silencioso — se reintenta en el siguiente tick
      }
      await cargarRuns();
    }
    refrescar();
    const t = setInterval(refrescar, 4000);
    return () => { cancelado = true; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendienteCampaignId]);

  // En cuanto el run de linkedin_intelligence de esa campaña aparece en el
  // historial (el auto-encadenado ya lo creó), se apaga el aviso solo.
  useEffect(() => {
    if (pendienteCampaignId && runs.some((r) => r.campaignId === pendienteCampaignId)) {
      setPendienteCampaignId(null);
      setPendienteNombre(null);
    }
  }, [runs, pendienteCampaignId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo run</CardTitle>
        </CardHeader>
        {agentType === "linkedin_intelligence" ? (
          <NuevoRunLinkedIn onLanzada={(campaignId) => setPendienteCampaignId(campaignId)} />
        ) : (
          <NuevoRunLeadResearch agentType={agentType} onCreado={(runId) => router.push(`/agentes/${agentType}/${runId}`)} />
        )}
      </Card>

      {pendienteCampaignId && (
        <Card className="border-dashed border-sky-300 bg-sky-50/60">
          <CardContent className="flex items-center gap-3 py-4">
            <Refresh2 className="size-5 shrink-0 animate-spin text-sky-600" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">
                Buscando y calificando empresas{pendienteNombre ? ` — "${pendienteNombre}"` : ""}…
              </p>
              <p className="text-muted-foreground">
                El Equipo de Marketing IA va primero; el Agente LinkedIn arrancará solo en cuanto termine. Puede tardar unos minutos.
              </p>
            </div>
            <Button variant="outline" size="sm" render={<Link href={`/agentes/campanas/${pendienteCampaignId}`} />}>
              Ver progreso
            </Button>
          </CardContent>
        </Card>
      )}

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
