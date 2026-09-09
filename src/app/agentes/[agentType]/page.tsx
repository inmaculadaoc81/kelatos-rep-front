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

/** Formulario de "nuevo run" + historial, para un tipo de agente. El
    formulario de abajo es específico de "lead_research" (único agente
    del MVP) — un tipo nuevo añade su propio bloque de formulario aquí
    (o se extrae a un registro de componentes por tipo si llegan a ser
    varios), sin tocar el resto de la página. */
export default function AgenteTipoPage() {
  const params = useParams<{ agentType: string }>();
  const router = useRouter();
  const agentType = params.agentType;

  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sector, setSector] = useState("");
  const [location, setLocation] = useState("");
  const [limit, setLimit] = useState("20");
  const [goal, setGoal] = useState("");
  const [enviando, setEnviando] = useState(false);

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
      router.push(`/agentes/${agentType}/${data.runId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo run</CardTitle>
        </CardHeader>
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
