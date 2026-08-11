"use client";

import { useEffect, useState } from "react";
import { Refresh2, SearchNormal1, ArrowDown2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearFecha } from "@/lib/dias-entrega";
import { EventoRegistro } from "@/lib/registro-acciones";

export default function RegistroAccionesPage() {
  const [eventos, setEventos] = useState<EventoRegistro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);

  async function cargar(paginaActual: number) {
    setCargando(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ pagina: String(paginaActual) });
      if (busqueda.trim()) qs.set("busqueda", busqueda.trim());
      if (fechaDesde) qs.set("fechaDesde", fechaDesde);
      if (fechaHasta) qs.set("fechaHasta", fechaHasta);
      const res = await fetch(`/api/registro-acciones?${qs.toString()}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setEventos(data.eventos as EventoRegistro[]);
      setTotalPaginas(data.totalPaginas);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPagina(1);
      cargar(1);
    }, 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, fechaDesde, fechaHasta]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Registro de Acciones</h1>
          <p className="text-sm text-muted-foreground">Historial de eventos de todo el sistema — reparaciones, clientes, ventas, alquileres...</p>
        </div>
        <Button variant="outline" size="icon" className="size-8" onClick={() => cargar(pagina)} title="Actualizar">
          <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar: {error}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3">
        <div className="relative">
          <SearchNormal1 className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Resguardo, usuario..." className="w-56 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Desde</label>
          <Input type="date" className="w-36" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Hasta</label>
          <Input type="date" className="w-36" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
        </div>
        {(busqueda || fechaDesde || fechaHasta) && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setBusqueda(""); setFechaDesde(""); setFechaHasta(""); }}>
            Limpiar
          </Button>
        )}
        {!cargando && <span className="ml-auto text-sm text-muted-foreground">{total.toLocaleString("es-ES")} eventos</span>}
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Fecha / Hora</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Usuario</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!cargando && eventos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Sin eventos
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              // Índice en la clave: evento_id no es único de forma fiable
              // en filas heredadas (hay nulos y algún ID repetido) — la
              // ruta ni siquiera expone el id interno de PostgreSQL.
              eventos.map((ev, i) => (
                <TableRow key={`${ev.eventoId || "sin-id"}-${i}`}>
                  <TableCell className="text-sm whitespace-nowrap tabular-nums">{formatearFecha(ev.fechaHora)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{ev.entidad}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{ev.tipo}</TableCell>
                  <TableCell className="max-w-md truncate text-sm" title={ev.descripcion}>
                    {ev.descripcion || "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{ev.empleadoId || "-"}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {!cargando && totalPaginas > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={pagina <= 1}
            onClick={() => { const p = pagina - 1; setPagina(p); cargar(p); }}
          >
            <ArrowDown2 className="size-3.5 rotate-90" /> Anterior
          </Button>
          <span className="text-sm text-muted-foreground">Página {pagina} de {totalPaginas}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagina >= totalPaginas}
            onClick={() => { const p = pagina + 1; setPagina(p); cargar(p); }}
          >
            Siguiente <ArrowDown2 className="size-3.5 -rotate-90" />
          </Button>
        </div>
      )}
    </div>
  );
}
