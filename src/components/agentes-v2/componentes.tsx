"use client";

import Link from "next/link";
import { ArrowRight2, Category } from "@/lib/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ICONO_DEPARTAMENTO } from "@/app/agentes-v2/navegacion";
import {
  COLOR_ESTADO_DEPARTAMENTO, COLOR_ESTADO_RUN, ETIQUETA_ESTADO_DEPARTAMENTO, ETIQUETA_ESTADO_RUN, cuando, duracion, fechaHora, usd,
  type DepartamentoPanel, type EstadoDepartamento, type EstadoRun, type RunFila,
} from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";

export function Cabecera({ titulo, descripcion, acciones }: { titulo: string; descripcion?: string; acciones?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
        {descripcion && <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {acciones}
    </div>
  );
}

export function Kpi({ titulo, valor, sub, cargando }: { titulo: string; valor: string; sub?: string; cargando?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-2xl leading-none font-semibold tabular-nums">{cargando ? "…" : valor}</p>
      {sub && <p className="mt-1.5 truncate text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function EstadoDepartamentoBadge({ estado }: { estado: EstadoDepartamento }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium", COLOR_ESTADO_DEPARTAMENTO[estado])}>{ETIQUETA_ESTADO_DEPARTAMENTO[estado]}</span>;
}

export function EstadoRunBadge({ estado }: { estado: EstadoRun }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium", COLOR_ESTADO_RUN[estado])}>{ETIQUETA_ESTADO_RUN[estado]}</span>;
}

export function Vacio({ titulo, texto }: { titulo: string; texto?: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <p className="text-sm font-medium">{titulo}</p>
      {texto && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{texto}</p>}
    </div>
  );
}

export function ErrorCaja({ mensaje }: { mensaje: string }) {
  return <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700">{mensaje}</div>;
}

export function CargandoFilas({ n = 4 }: { n?: number }) {
  return <div className="space-y-2">{Array.from({ length: n }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
}

export function TarjetaDepartamento({ d }: { d: DepartamentoPanel }) {
  const Icono = ICONO_DEPARTAMENTO[d.icon] || Category;
  return (
    <Link href={`/agentes-v2/departamentos/${d.key}`} className="group flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/40">
      <div className="flex items-start justify-between gap-2">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary"><Icono className="size-5" /></span>
        <EstadoDepartamentoBadge estado={d.status} />
      </div>
      <div>
        <p className="font-medium">{d.name}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{d.description}</p>
      </div>
      <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
        <span>{d.next_run_at ? `Próxima: ${cuando(d.next_run_at)}` : "Sin ejecuciones programadas"}</span>
        <ArrowRight2 className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </Link>
  );
}

export function ProximasEjecuciones({ items }: { items: { at: string; department_name?: string; schedule: string }[] }) {
  if (!items.length) return <Vacio titulo="Sin ejecuciones programadas" texto="Cuando un departamento tenga horario, sus próximas ejecuciones aparecerán aquí." />;
  return (
    <ul className="divide-y rounded-lg border">
      {items.map((u, i) => (
        <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
          <span className="font-medium tabular-nums">{cuando(u.at)}</span>
          <span className="truncate text-muted-foreground">{[u.department_name, u.schedule].filter(Boolean).join(" · ")}</span>
        </li>
      ))}
    </ul>
  );
}

export function TablaRuns({ runs, conDepartamento }: { runs: RunFila[]; conDepartamento?: boolean }) {
  if (!runs.length) return <Vacio titulo="Sin ejecuciones todavía" texto="Cada disparo de un horario creará aquí una ejecución con su coste, duración y resultado." />;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Estado</TableHead>
            {conDepartamento && <TableHead>Departamento</TableHead>}
            <TableHead>Programada</TableHead>
            <TableHead>Duración</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead className="text-right">Coste de IA</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((r) => (
            <TableRow key={r.id}>
              <TableCell><EstadoRunBadge estado={r.status} /></TableCell>
              {conDepartamento && <TableCell className="text-sm">{r.department_name || "—"}{r.workflow_name ? ` · ${r.workflow_name}` : ""}</TableCell>}
              <TableCell className="whitespace-nowrap text-sm tabular-nums">{fechaHora(r.scheduled_for || r.started_at)}</TableCell>
              <TableCell className="whitespace-nowrap text-sm tabular-nums">{duracion(r.started_at, r.finished_at)}</TableCell>
              <TableCell className="text-sm capitalize">{r.trigger === "schedule" ? "Horario" : r.trigger === "cmo" ? "AI CMO" : r.trigger === "manual" ? "Manual" : r.trigger}</TableCell>
              <TableCell className="text-right text-sm tabular-nums">{usd(r.agent_cost_usd)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
