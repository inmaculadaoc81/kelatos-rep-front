"use client";

import { useEffect, useMemo, useState } from "react";
import { Refresh2, Filter, ArrowDown2, Eye, ClipboardTick, CloseCircle } from "@/lib/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Reparacion, COLOR_ESTADO } from "@/lib/reparaciones";
import { calcularDiasEntrega, formatearFecha } from "@/lib/dias-entrega";
import { DetalleReparacionDialog } from "./detalle-dialog";
import { NuevaReparacionDialog } from "./nueva-dialog";
import { FormularioPendienteDialog } from "./formulario-pendiente-dialog";

type Orden = { campo: "resguardo" | "fecha" | null; direccion: "asc" | "desc" | null };

// Mismos 10 estados que ESTADOS_REPARACION en Config.js (Apps Script) —
// duplicado aquí porque este módulo todavía no expone un endpoint de
// catálogos; ver nota en el informe de esta fase.
const ESTADOS_REPARACION = Object.keys(COLOR_ESTADO).concat(["Pieza Pendiente"]);

function EstadoBadge({ estado }: { estado: string }) {
  const color = COLOR_ESTADO[estado];
  if (!color) return <Badge variant="secondary">{estado}</Badge>;
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: color.bg, color: color.fg }}
    >
      {estado}
    </span>
  );
}

function MultiselectFiltro({
  label,
  opciones,
  seleccionados,
  onCambiar,
}: {
  label: string;
  opciones: string[];
  seleccionados: string[];
  onCambiar: (valores: string[]) => void;
}) {
  function toggle(valor: string) {
    if (seleccionados.includes(valor)) {
      onCambiar(seleccionados.filter((v) => v !== valor));
    } else {
      onCambiar([...seleccionados, valor]);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5" })}>
        <Filter className="size-3.5" />
        {label}
        {seleccionados.length > 0 && (
          <Badge variant="default" className="ml-1 h-5 px-1.5">
            {seleccionados.length}
          </Badge>
        )}
        <ArrowDown2 className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto p-1">
        {opciones.length === 0 && (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">Sin opciones</p>
        )}
        {opciones.map((op) => (
          <label
            key={op}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
          >
            <Checkbox checked={seleccionados.includes(op)} onCheckedChange={() => toggle(op)} />
            {op}
          </label>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function ReparacionesPage() {
  const [reparaciones, setReparaciones] = useState<Reparacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtroEstado, setFiltroEstado] = useState<string[]>([]);
  const [filtroTecnico, setFiltroTecnico] = useState<string[]>([]);
  const [filtroEquipo, setFiltroEquipo] = useState<string[]>([]);
  const [filtroEntrega, setFiltroEntrega] = useState<string[]>([]);
  const [orden, setOrden] = useState<Orden>({ campo: null, direccion: null });
  const [resguardoDetalle, setResguardoDetalle] = useState<string | null>(null);
  const [formularioPendiente, setFormularioPendiente] = useState<{ rep: Reparacion; modo: "confirmar" | "rechazar" } | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/reparaciones?finalizadas=false&porPagina=0");
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

  const tecnicosDisponibles = useMemo(() => {
    // Los técnicos deberían venir de un catálogo propio (empleados) — de
    // momento se derivan de los datos ya cargados, como simplificación de
    // esta primera migración (ver informe).
    const set = new Set(reparaciones.map((r) => r.tecnicoAsignado).filter(Boolean));
    return Array.from(set).sort();
  }, [reparaciones]);

  const filtradas = useMemo(() => {
    let lista = reparaciones;
    if (filtroEstado.length) lista = lista.filter((r) => filtroEstado.includes(r.estado));
    if (filtroTecnico.length) lista = lista.filter((r) => filtroTecnico.includes(r.tecnicoAsignado));
    if (filtroEquipo.length) lista = lista.filter((r) => filtroEquipo.includes(r.equipoEnLocal));
    if (filtroEntrega.length) lista = lista.filter((r) => filtroEntrega.includes(r.entregaMensajeria));

    if (orden.campo) {
      lista = [...lista].sort((a, b) => {
        let cmp = 0;
        if (orden.campo === "resguardo") cmp = Number(a.resguardo) - Number(b.resguardo);
        if (orden.campo === "fecha")
          cmp = new Date(a.fechaRecepcion || 0).getTime() - new Date(b.fechaRecepcion || 0).getTime();
        return orden.direccion === "asc" ? cmp : -cmp;
      });
    }
    return lista;
  }, [reparaciones, filtroEstado, filtroTecnico, filtroEquipo, filtroEntrega, orden]);

  function alternarOrden(campo: "resguardo" | "fecha") {
    setOrden((prev) => {
      if (prev.campo !== campo) return { campo, direccion: "asc" };
      if (prev.direccion === "asc") return { campo, direccion: "desc" };
      return { campo: null, direccion: null };
    });
  }

  const hayFiltrosActivos =
    filtroEstado.length > 0 || filtroTecnico.length > 0 || filtroEquipo.length > 0 || filtroEntrega.length > 0;

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Todas las Reparaciones</h1>
          <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar datos">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
          {!cargando && <span className="text-sm text-muted-foreground">{filtradas.length} resultados</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <NuevaReparacionDialog onCreada={cargar} />
          <MultiselectFiltro label="Estado" opciones={ESTADOS_REPARACION} seleccionados={filtroEstado} onCambiar={setFiltroEstado} />
          <MultiselectFiltro label="Técnico" opciones={tecnicosDisponibles} seleccionados={filtroTecnico} onCambiar={setFiltroTecnico} />
          <MultiselectFiltro label="Equipo" opciones={["SI", "NO"]} seleccionados={filtroEquipo} onCambiar={setFiltroEquipo} />
          <MultiselectFiltro label="Entrega" opciones={["SI", "NO"]} seleccionados={filtroEntrega} onCambiar={setFiltroEntrega} />
          {hayFiltrosActivos && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground"
              onClick={() => {
                setFiltroEstado([]);
                setFiltroTecnico([]);
                setFiltroEquipo([]);
                setFiltroEntrega([]);
              }}
            >
              <CloseCircle className="size-3.5" /> Limpiar
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar reparaciones: {error}
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none" onClick={() => alternarOrden("resguardo")}>
                Resguardo {orden.campo === "resguardo" ? (orden.direccion === "asc" ? "↑" : "↓") : ""}
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => alternarOrden("fecha")}>
                Fecha Recepción {orden.campo === "fecha" ? (orden.direccion === "asc" ? "↑" : "↓") : ""}
              </TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Técnico</TableHead>
              <TableHead>Días</TableHead>
              <TableHead>F. Entrega</TableHead>
              <TableHead>Obs.</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 10 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!cargando && filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                  No se encontraron reparaciones
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              filtradas.map((rep) => {
                const dias = calcularDiasEntrega(rep);
                const obs = rep.observaciones || "";
                const obsTruncado = obs.length > 50 ? obs.slice(0, 50) + "…" : obs;

                return (
                  <TableRow key={rep.resguardo}>
                    <TableCell className="font-semibold">{rep.resguardo}</TableCell>
                    <TableCell className="text-sm">{formatearFecha(rep.fechaRecepcion)}</TableCell>
                    <TableCell>
                      <div>{rep.cliente.nombre || "N/A"}</div>
                      <div className="text-xs text-muted-foreground">{rep.cliente.telefono || "N/A"}</div>
                      <div className="text-xs text-muted-foreground">{rep.cliente.email || ""}</div>
                    </TableCell>
                    <TableCell>
                      <div>{rep.equipo.modelo || "N/A"}</div>
                      {rep.pptoDescripcion && (
                        <div className="text-xs text-muted-foreground">
                          {rep.pptoDescripcion.length > 50 ? rep.pptoDescripcion.slice(0, 50) + "…" : rep.pptoDescripcion}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <EstadoBadge estado={rep.estado} />
                        {rep.equipoEnLocal === "NO" && (
                          <Badge variant="outline" className="border-amber-500 text-[10px] text-amber-600">
                            Sin equipo
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{rep.tecnicoAsignado || "-"}</TableCell>
                    <TableCell className={`text-sm ${dias.clase}`}>{dias.texto}</TableCell>
                    <TableCell className="text-sm">{formatearFecha(rep.fechaEntrega)}</TableCell>
                    <TableCell className="max-w-40 truncate text-sm text-muted-foreground" title={obs}>
                      {obsTruncado || "-"}
                    </TableCell>
                    <TableCell>
                      {rep.estado === "Formulario Pendiente" ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 gap-1 bg-amber-500 text-white hover:bg-amber-600"
                            onClick={() => setFormularioPendiente({ rep, modo: "confirmar" })}
                          >
                            <ClipboardTick className="size-3.5" /> Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 border-destructive text-destructive hover:bg-destructive/10"
                            onClick={() => setFormularioPendiente({ rep, modo: "rechazar" })}
                          >
                            <CloseCircle className="size-3.5" /> Rechazar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1"
                          onClick={() => setResguardoDetalle(rep.resguardo)}
                        >
                          <Eye className="size-3.5" /> Ver
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      <DetalleReparacionDialog
        resguardo={resguardoDetalle}
        onOpenChange={(open) => !open && setResguardoDetalle(null)}
      />

      <FormularioPendienteDialog
        reparacion={formularioPendiente?.rep ?? null}
        modo={formularioPendiente?.modo ?? "confirmar"}
        onOpenChange={(open) => !open && setFormularioPendiente(null)}
        onResuelto={cargar}
      />
    </div>
  );
}
