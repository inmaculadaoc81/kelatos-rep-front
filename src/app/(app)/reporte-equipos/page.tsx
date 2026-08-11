"use client";

import { useEffect, useMemo, useState } from "react";
import { Refresh2, SearchNormal1 } from "@/lib/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Reparacion, COLOR_ESTADO } from "@/lib/reparaciones";
import { formatearFecha } from "@/lib/dias-entrega";
import { cn } from "@/lib/utils";

type Periodo = "hoy" | "semana" | "mes" | "todo";

const PERIODOS: { valor: Periodo; label: string }[] = [
  { valor: "hoy", label: "Hoy" },
  { valor: "semana", label: "Esta semana" },
  { valor: "mes", label: "Este mes" },
  { valor: "todo", label: "Todo" },
];

// Mismo cálculo de rango que _re2Rango() en el original: hoy/semana/mes
// como fecha-solo (sin hora), comparados contra fechaRecepcion.
function inicioSemana(d: Date): Date {
  const dia = d.getDay() || 7; // lunes=1 ... domingo=7
  const r = new Date(d);
  r.setDate(d.getDate() - dia + 1);
  r.setHours(0, 0, 0, 0);
  return r;
}

function enRango(fechaRecepcion: string | null, periodo: Periodo): boolean {
  if (periodo === "todo" || !fechaRecepcion) return periodo === "todo" ? true : false;
  const f = new Date(fechaRecepcion);
  f.setHours(0, 0, 0, 0);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (periodo === "hoy") return f.getTime() === hoy.getTime();
  if (periodo === "semana") return f.getTime() >= inicioSemana(hoy).getTime();
  if (periodo === "mes") return f.getFullYear() === hoy.getFullYear() && f.getMonth() === hoy.getMonth();
  return true;
}

// Mismos 10 estados que en Todas las Reparaciones — este módulo aún no
// expone un endpoint de catálogos (ver nota en reparaciones/page.tsx).
const ESTADOS_REPARACION = Object.keys(COLOR_ESTADO).concat(["Pieza Pendiente"]);

export default function ReporteEquiposPage() {
  const [reparaciones, setReparaciones] = useState<Reparacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [estado, setEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      // finalizadas vacío -> sin filtrar por estado de entrega (activas +
      // finalizadas), igual que apiBuscarReparaciones({}) en el original.
      const res = await fetch("/api/reparaciones?finalizadas=&porPagina=0");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setReparaciones(data.resultados as Reparacion[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const filtradas = useMemo(() => {
    let lista = reparaciones.filter((r) => enRango(r.fechaRecepcion, periodo));
    if (estado) lista = lista.filter((r) => r.estado === estado);
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      lista = lista.filter((r) =>
        [r.resguardo, r.cliente.nombre, r.tecnicoAsignado, r.equipo.modelo, r.estado].join(" ").toLowerCase().includes(q)
      );
    }
    return [...lista].sort((a, b) => new Date(b.fechaRecepcion || 0).getTime() - new Date(a.fechaRecepcion || 0).getTime());
  }, [reparaciones, periodo, estado, busqueda]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Reporte Equipos</h1>
          <p className="text-sm text-muted-foreground">Equipos que llegan por día</p>
        </div>
        <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar">
          <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar: {error}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {PERIODOS.map((p) => (
            <button
              key={p.valor}
              onClick={() => setPeriodo(p.valor)}
              className={cn(
                buttonVariants({ variant: periodo === p.valor ? "default" : "ghost", size: "sm" }),
                "h-7"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Select value={estado || "__todos__"} onValueChange={(v) => setEstado(!v || v === "__todos__" ? "" : v)}>
          <SelectTrigger className="w-52">
            <SelectValue>{(v: string) => (v === "__todos__" ? "Todos los estados" : v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos los estados</SelectItem>
            {ESTADOS_REPARACION.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <SearchNormal1 className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar..." className="w-56 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        {!cargando && <span className="ml-auto text-sm text-muted-foreground">{filtradas.length} equipos</span>}
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>F. Entrada</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Técnico</TableHead>
              <TableHead>Aparato / Modelo</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!cargando && filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Sin resultados en este período
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              filtradas.map((r) => {
                const color = COLOR_ESTADO[r.estado];
                return (
                  <TableRow key={r.resguardo}>
                    <TableCell className="font-semibold">{r.resguardo}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{formatearFecha(r.fechaRecepcion)}</TableCell>
                    <TableCell className="text-sm">{r.cliente.nombre || "-"}</TableCell>
                    <TableCell className="text-sm">{r.tecnicoAsignado || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.equipo.modelo || "-"}</TableCell>
                    <TableCell>
                      {color ? (
                        <span
                          className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: color.bg, color: color.fg }}
                        >
                          {r.estado}
                        </span>
                      ) : (
                        r.estado
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
