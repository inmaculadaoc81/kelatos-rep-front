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
import { DetalleEquipoDialog } from "./detalle-equipo-dialog";

type Periodo = "hoy" | "ayer" | "semana" | "mes" | "todo";

const PERIODOS: { valor: Periodo; label: string }[] = [
  { valor: "hoy", label: "Hoy" },
  { valor: "ayer", label: "Ayer" },
  { valor: "semana", label: "Semana" },
  { valor: "mes", label: "Mes" },
  { valor: "todo", label: "Todos" },
];

// Mismos 9 estados que el desplegable del original (_re2 no incluye todos
// los estados reales — p. ej. "Formulario Pendiente" o "Presupuesto
// Aceptado" quedan fuera del filtro aunque sí aparecen en la tabla).
const ESTADOS_FILTRO = [
  "En Diagnóstico",
  "Presupuesto Pendiente",
  "Presupuesto Enviado",
  "Presupuesto Rechazado",
  "Pieza Pendiente",
  "En Reparación",
  "Reparado",
  "No tiene Reparación",
  "Garantía",
];

function soloDia(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return r;
}

// Reproduce _re2Rango() del original exactamente: hoy/ayer como un único
// día; semana/mes como los últimos 7/30 días (no "esta semana natural").
function enRango(fechaRecepcion: string | null, periodo: Periodo): boolean {
  if (periodo === "todo") return true;
  if (!fechaRecepcion) return false;
  const f = soloDia(new Date(fechaRecepcion));
  const hoy = soloDia(new Date());
  if (periodo === "hoy") return f.getTime() === hoy.getTime();
  if (periodo === "ayer") {
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    return f.getTime() === ayer.getTime();
  }
  if (periodo === "semana") {
    const inicio = new Date(hoy);
    inicio.setDate(inicio.getDate() - 6);
    return f.getTime() >= inicio.getTime() && f.getTime() <= hoy.getTime();
  }
  if (periodo === "mes") {
    const inicio = new Date(hoy);
    inicio.setDate(inicio.getDate() - 29);
    return f.getTime() >= inicio.getTime() && f.getTime() <= hoy.getTime();
  }
  return true;
}

/** Reproduce #vistaReporteEquipos (_reAplicarFiltros2/_re2Render) del original. */
export default function ReporteEquiposPage() {
  const [reparaciones, setReparaciones] = useState<Reparacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>("hoy");
  const [estado, setEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [detalle, setDetalle] = useState<Reparacion | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/reporte-equipos");
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
        [r.resguardo, r.codigoCliente, r.cliente.nombre, r.tecnicoAsignado, r.equipo.modelo, r.estado].join(" ").toLowerCase().includes(q)
      );
    }
    return [...lista].sort((a, b) => new Date(b.fechaRecepcion || 0).getTime() - new Date(a.fechaRecepcion || 0).getTime());
  }, [reparaciones, periodo, estado, busqueda]);

  return (
    <div className="p-6">
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
            {ESTADOS_FILTRO.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <SearchNormal1 className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cliente, código, modelo..." className="w-56 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        {!cargando && <span className="ml-auto text-sm text-muted-foreground">{filtradas.length} equipos</span>}
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-primary hover:bg-primary [&_th]:text-primary-foreground">
              <TableHead>Código</TableHead>
              <TableHead>F. Entrada</TableHead>
              <TableHead>Cód. Cliente</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Técnico</TableHead>
              <TableHead>Aparato / Modelo</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!cargando && filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Sin registros para los filtros seleccionados
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              filtradas.map((r) => {
                const color = COLOR_ESTADO[r.estado];
                return (
                  <TableRow key={r.resguardo} className="cursor-pointer" onClick={() => setDetalle(r)}>
                    <TableCell className="font-semibold text-primary">{r.resguardo}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap text-muted-foreground">{formatearFecha(r.fechaRecepcion)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.codigoCliente || "—"}</TableCell>
                    <TableCell className="text-sm">{r.cliente.nombre || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.tecnicoAsignado || "-"}</TableCell>
                    <TableCell className="text-sm" title={r.equipo.modelo}>{r.equipo.modelo || "-"}</TableCell>
                    <TableCell className="text-center">
                      {color ? (
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
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

      <DetalleEquipoDialog reparacion={detalle} open={detalle !== null} onOpenChange={(o) => !o && setDetalle(null)} />
    </div>
  );
}
