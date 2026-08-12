"use client";

import { useEffect, useState } from "react";
import { Refresh2, SearchNormal1, ArrowDown2, Calendar, Hierarchy } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EventoRegistro } from "@/lib/registro-acciones";
import { derivarEventoHistorial } from "../reparaciones/historial-evento";
import { estiloEntidad, humanizarTipo, colorAvatar, iniciales } from "@/lib/registro-acciones-estilo";

function fechaHoraCorta(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function tiempoRelativo(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "ahora mismo";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 30) return `hace ${diffD} d`;
  const diffMonth = Math.round(diffD / 30);
  if (diffMonth < 12) return `hace ${diffMonth} mes${diffMonth > 1 ? "es" : ""}`;
  return `hace ${Math.round(diffMonth / 12)} año${Math.round(diffMonth / 12) > 1 ? "s" : ""}`;
}

function EntidadBadge({ entidad }: { entidad: string }) {
  const estilo = estiloEntidad(entidad);
  const Icono = estilo.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${estilo.badge}`}>
      <Icono className="size-3.5 shrink-0" />
      {entidad}
    </span>
  );
}

function TipoCelda({ tipo, entidad }: { tipo: string; entidad: string }) {
  const meta = derivarEventoHistorial(tipo);
  const tieneMeta = meta.clase !== "bg-muted text-muted-foreground";
  const dot = tieneMeta ? meta.clase.match(/text-[a-z]+-\d+/)?.[0].replace("text-", "bg-") : estiloEntidad(entidad).dot;
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className={`size-1.5 shrink-0 rounded-full ${dot || "bg-muted-foreground/40"}`} />
      {humanizarTipo(tipo)}
    </span>
  );
}

function UsuarioCelda({ nombre }: { nombre: string }) {
  if (!nombre) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <span className="flex items-center gap-2">
      <Avatar size="sm">
        <AvatarFallback className={colorAvatar(nombre)}>{iniciales(nombre)}</AvatarFallback>
      </Avatar>
      <span className="text-sm">{nombre}</span>
    </span>
  );
}

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
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Hierarchy className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Registro de Acciones</h1>
            <p className="text-sm text-muted-foreground">Historial de eventos de todo el sistema — reparaciones, clientes, ventas, alquileres...</p>
          </div>
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

      <div className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3.5 shadow-sm">
        <div className="relative">
          <SearchNormal1 className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Resguardo, usuario..." className="w-56 pl-8" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="mb-2 size-4 text-muted-foreground" />
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Desde</label>
            <Input type="date" className="w-36" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Hasta</label>
            <Input type="date" className="w-36" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
          </div>
        </div>
        {(busqueda || fechaDesde || fechaHasta) && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setBusqueda(""); setFechaDesde(""); setFechaHasta(""); }}>
            Limpiar filtros
          </Button>
        )}
        {!cargando && (
          <span className="ml-auto inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            {total.toLocaleString("es-ES")} eventos
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
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
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Sin eventos
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              // Índice en la clave: evento_id no es único de forma fiable
              // en filas heredadas (hay nulos y algún ID repetido) — la
              // ruta ni siquiera expone el id interno de PostgreSQL.
              eventos.map((ev, i) => (
                <TableRow key={`${ev.eventoId || "sin-id"}-${i}`} className="align-top">
                  <TableCell className="text-sm whitespace-nowrap">
                    <div className="font-medium tabular-nums">{fechaHoraCorta(ev.fechaHora)}</div>
                    <div className="text-xs text-muted-foreground">{tiempoRelativo(ev.fechaHora)}</div>
                  </TableCell>
                  <TableCell>
                    <EntidadBadge entidad={ev.entidad} />
                  </TableCell>
                  <TableCell>
                    <TipoCelda tipo={ev.tipo} entidad={ev.entidad} />
                  </TableCell>
                  <TableCell className="max-w-md text-sm" title={ev.descripcion}>
                    <span className="line-clamp-2">{ev.descripcion || "-"}</span>
                  </TableCell>
                  <TableCell>
                    <UsuarioCelda nombre={ev.empleadoId} />
                  </TableCell>
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
