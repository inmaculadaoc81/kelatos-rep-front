"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Refresh2, Filter, ArrowDown2, Eye, ClipboardTick, CloseCircle, AddCircle, SearchNormal1, Calendar } from "@/lib/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Reparacion, COLOR_ESTADO } from "@/lib/reparaciones";
import { calcularDiasEntrega, formatearFecha } from "@/lib/dias-entrega";
import { MetricasDashboard, CardFiltroId, CARD_FILTRO_ESTADOS } from "@/lib/metricas";
import { DetalleReparacionDialogLazy as DetalleReparacionDialog } from "./detalle-dialog-lazy";
import { ReparacionSheet } from "./reparacion-sheet";
import { RechazarFormularioDialog } from "./formulario-pendiente-dialog";
import { DashboardMetricas } from "./dashboard-metricas";

type Orden = { campo: "resguardo" | "fecha" | null; direccion: "asc" | "desc" | null };

// Mismos 10 estados que ESTADOS_REPARACION en Config.js (Apps Script) —
// duplicado aquí porque este módulo todavía no expone un endpoint de
// catálogos; ver nota en el informe de esta fase.
const ESTADOS_REPARACION = Object.keys(COLOR_ESTADO).concat(["Pieza Pendiente"]);

const NOMBRE_CARD: Record<CardFiltroId, string> = {
  pptoPendiente: "Ppto. Pendiente",
  piezaPendiente: "Pieza Pendiente",
  enReparacion: "En Reparación",
  listos: "Listos p/ Recoger",
  pptoEnviado: "Ppto. Enviado",
  pptoAceptado: "Ppto. Aceptado",
  piezaEntregada: "Pieza Entregada",
  garantia: "Garantía",
  mensajeriaActiva: "Envío Mensajería",
  formularioPendiente: "Form. Pendiente",
  cintasEnReparacion: "Cintas en Conversión",
  pptoRetrasado: "Presupuesto Retrasado (+24h)",
  entregaRetrasada: "Entrega Retrasada",
};

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

type OpcionFiltro = { value: string; label: string };

function MultiselectFiltro({
  label,
  opciones,
  seleccionados,
  onCambiar,
}: {
  label: string;
  /** string[] cuando el valor ya es su propia etiqueta (Estado, Técnico); {value,label}[] cuando no (Equipo, Entrega — ver mapeo original en msEquipoMenu/msEntregaMenu). */
  opciones: string[] | OpcionFiltro[];
  seleccionados: string[];
  onCambiar: (valores: string[]) => void;
}) {
  const normalizadas: OpcionFiltro[] = opciones.map((op) => (typeof op === "string" ? { value: op, label: op } : op));

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
        {normalizadas.length === 0 && (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">Sin opciones</p>
        )}
        {normalizadas.map((op) => (
          <label
            key={op.value}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
          >
            <Checkbox checked={seleccionados.includes(op.value)} onCheckedChange={() => toggle(op.value)} />
            {op.label}
          </label>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * useSearchParams() exige un límite <Suspense> alrededor (si no, Next
 * falla el build de esta página) — se aísla aquí en vez de en el
 * componente principal, que ya tiene bastante estado propio.
 */
function AbrirNuevaPorQuery({ onAbrir }: { onAbrir: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("nueva") === "1") {
      onAbrir();
      router.replace("/reparaciones");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}

export default function ReparacionesPage() {
  const [reparaciones, setReparaciones] = useState<Reparacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtroEstado, setFiltroEstado] = useState<string[]>([]);
  const [filtroTecnico, setFiltroTecnico] = useState<string[]>([]);
  const [filtroEquipo, setFiltroEquipo] = useState<string[]>([]);
  const [filtroEntrega, setFiltroEntrega] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [cardFiltro, setCardFiltro] = useState<CardFiltroId | null>(null);
  const [orden, setOrden] = useState<Orden>({ campo: null, direccion: null });
  const [resguardoDetalle, setResguardoDetalle] = useState<string | null>(null);
  const [formularioPendiente, setFormularioPendiente] = useState<{ rep: Reparacion; modo: "confirmar" | "rechazar" } | null>(null);
  const [nuevaAbierta, setNuevaAbierta] = useState(false);

  const [metricas, setMetricas] = useState<MetricasDashboard | null>(null);
  const [errorMetricas, setErrorMetricas] = useState<string | null>(null);

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

  // Se sube aquí (antes vivía dentro de DashboardMetricas) porque las cards
  // de "Presupuesto Retrasado"/"Entrega Retrasada" necesitan los mismos
  // resguardos ya calculados por /api/metricas para poder filtrar la tabla,
  // sin reimplementar el cálculo de días laborables/horas en el cliente.
  async function cargarMetricas() {
    try {
      const res = await fetch("/api/metricas");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setMetricas(data.metricas as MetricasDashboard);
    } catch (e) {
      setErrorMetricas(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  useEffect(() => {
    cargar();
    cargarMetricas();
  }, []);

  const tecnicosDisponibles = useMemo(() => {
    // Los técnicos deberían venir de un catálogo propio (empleados) — de
    // momento se derivan de los datos ya cargados, como simplificación de
    // esta primera migración (ver informe).
    const set = new Set(reparaciones.map((r) => r.tecnicoAsignado).filter(Boolean));
    return Array.from(set).sort();
  }, [reparaciones]);

  // Mismos resguardos que ya se muestran en las AlertCard de abajo — evita
  // reimplementar el cálculo de horas/días laborables de retraso aquí.
  const resguardosPptoRetrasado = useMemo(
    () => new Set(metricas?.presupuestosRetrasados.map((p) => p.resguardo) || []),
    [metricas]
  );
  const resguardosEntregaRetrasada = useMemo(
    () => new Set(metricas?.equiposRetrasados.map((e) => e.resguardo) || []),
    [metricas]
  );

  const filtradas = useMemo(() => {
    let lista = reparaciones;
    if (filtroEstado.length) lista = lista.filter((r) => filtroEstado.includes(r.estado));
    if (filtroTecnico.length) lista = lista.filter((r) => filtroTecnico.includes(r.tecnicoAsignado));
    if (filtroEquipo.length) lista = lista.filter((r) => filtroEquipo.includes(r.equipoEnLocal));
    if (filtroEntrega.length) lista = lista.filter((r) => filtroEntrega.includes(r.entregaMensajeria));

    // Filtro por card — mismo orden/lógica que aplicarFiltrosCombinados() del
    // original: primero los estados del mapeo, luego el predicado extra.
    if (cardFiltro) {
      const estados = CARD_FILTRO_ESTADOS[cardFiltro];
      if (estados) lista = lista.filter((r) => estados.includes(r.estado));
      if (cardFiltro === "cintasEnReparacion") lista = lista.filter((r) => !!r.datosCintas);
      if (cardFiltro === "mensajeriaActiva") lista = lista.filter((r) => r.entregaMensajeria === "SI");
      if (cardFiltro === "pptoRetrasado") lista = lista.filter((r) => resguardosPptoRetrasado.has(r.resguardo));
      if (cardFiltro === "entregaRetrasada") lista = lista.filter((r) => resguardosEntregaRetrasada.has(r.resguardo));
    }

    // Búsqueda de texto libre — mismos campos que buscarReparaciones() del original.
    if (busqueda.trim()) {
      const texto = busqueda.trim().toLowerCase();
      lista = lista.filter((r) => {
        return (
          String(r.resguardo || "").toLowerCase().includes(texto) ||
          String(r.cliente.nombre || "").toLowerCase().includes(texto) ||
          String(r.cliente.telefono || "").toLowerCase().includes(texto) ||
          String(r.cliente.email || "").toLowerCase().includes(texto) ||
          String(r.equipo.modelo || "").toLowerCase().includes(texto) ||
          String(r.equipo.sintoma || "").toLowerCase().includes(texto)
        );
      });
    }

    // Rango de fechas sobre fechaRecepcion — mismo criterio que filtrarPorFecha().
    if (fechaDesde || fechaHasta) {
      lista = lista.filter((r) => {
        if (!r.fechaRecepcion) return false;
        const fecha = new Date(r.fechaRecepcion);
        fecha.setHours(0, 0, 0, 0);
        if (fechaDesde && fecha < new Date(fechaDesde + "T00:00:00")) return false;
        if (fechaHasta && fecha > new Date(fechaHasta + "T23:59:59")) return false;
        return true;
      });
    }

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
  }, [reparaciones, filtroEstado, filtroTecnico, filtroEquipo, filtroEntrega, cardFiltro, busqueda, fechaDesde, fechaHasta, orden, resguardosPptoRetrasado, resguardosEntregaRetrasada]);

  function alternarOrden(campo: "resguardo" | "fecha") {
    setOrden((prev) => {
      if (prev.campo !== campo) return { campo, direccion: "asc" };
      if (prev.direccion === "asc") return { campo, direccion: "desc" };
      return { campo: null, direccion: null };
    });
  }

  // Reproduce filtrarPorCard(): al elegir una card se limpia búsqueda y
  // fecha (pero NO los multiselects, que siempre se combinan con todo).
  function aplicarCardFiltro(id: CardFiltroId) {
    setCardFiltro((actual) => (actual === id ? null : id));
    setBusqueda("");
    setFechaDesde("");
    setFechaHasta("");
  }

  // Reproduce filtrarPorFecha(): fijar una fecha limpia el filtro de card
  // (pero no la búsqueda ni los multiselects).
  function cambiarFecha(campo: "desde" | "hasta", valor: string) {
    setCardFiltro(null);
    if (campo === "desde") setFechaDesde(valor);
    else setFechaHasta(valor);
  }

  function filtrarHoy() {
    const hoy = new Date().toISOString().split("T")[0];
    setCardFiltro(null);
    setFechaDesde(hoy);
    setFechaHasta(hoy);
  }

  function limpiarFiltros() {
    setFiltroEstado([]);
    setFiltroTecnico([]);
    setFiltroEquipo([]);
    setFiltroEntrega([]);
    setBusqueda("");
    setFechaDesde("");
    setFechaHasta("");
    setCardFiltro(null);
  }

  // Reproduce actualizarIndicadorFiltro() del original.
  const descripcionFiltros = useMemo(() => {
    const desc: string[] = [];
    if (cardFiltro) desc.push(`Card: ${NOMBRE_CARD[cardFiltro]}`);
    if (filtroEstado.length) desc.push(`Estado: ${filtroEstado.join(", ")}`);
    if (filtroTecnico.length) desc.push(`Técnico: ${filtroTecnico.join(", ")}`);
    if (filtroEquipo.length) desc.push(`Equipo: ${filtroEquipo.map((v) => (v === "SI" ? "En local" : "Cliente se llevó")).join(", ")}`);
    if (filtroEntrega.length) desc.push(`Entrega: ${filtroEntrega.map((v) => (v === "SI" ? "Mensajería" : "Local")).join(", ")}`);
    if (busqueda.trim()) desc.push(`Búsqueda: "${busqueda.trim()}"`);
    if (fechaDesde || fechaHasta) desc.push(`Fecha: ${fechaDesde || "*"} - ${fechaHasta || "*"}`);
    return desc.join(" | ");
  }, [cardFiltro, filtroEstado, filtroTecnico, filtroEquipo, filtroEntrega, busqueda, fechaDesde, fechaHasta]);

  const hayFiltrosActivos = descripcionFiltros.length > 0;

  return (
    <div className="p-6">
      {/* En el sistema original (vistaActivas) el dashboard y la tabla de
          reparaciones activas son la misma vista, no dos rutas separadas. */}
      <DashboardMetricas metricas={metricas} error={errorMetricas} cardFiltro={cardFiltro} onFiltrar={aplicarCardFiltro} />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Todas las Reparaciones</h1>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => {
              cargar();
              cargarMetricas();
            }}
            title="Actualizar datos"
          >
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
          {!cargando && <span className="text-sm text-muted-foreground">{filtradas.length} resultados</span>}
        </div>

        <Button className="h-8 gap-1.5" onClick={() => setNuevaAbierta(true)}>
          <AddCircle className="size-4" /> Nueva Reparación
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cliente, teléfono, resguardo..."
            className="h-8 w-64 pl-8"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Calendar className="size-3.5 text-muted-foreground" />
          <Input type="date" value={fechaDesde} onChange={(e) => cambiarFecha("desde", e.target.value)} className="h-8 w-36" title="Desde" />
          <span className="text-sm text-muted-foreground">-</span>
          <Input type="date" value={fechaHasta} onChange={(e) => cambiarFecha("hasta", e.target.value)} className="h-8 w-36" title="Hasta" />
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={filtrarHoy}>
            <Calendar className="size-3.5" /> Hoy
          </Button>
        </div>

        <MultiselectFiltro label="Estado" opciones={ESTADOS_REPARACION} seleccionados={filtroEstado} onCambiar={setFiltroEstado} />
        <MultiselectFiltro label="Técnico" opciones={tecnicosDisponibles} seleccionados={filtroTecnico} onCambiar={setFiltroTecnico} />
        <MultiselectFiltro
          label="Equipo"
          opciones={[{ value: "SI", label: "En local" }, { value: "NO", label: "Cliente se llevó" }]}
          seleccionados={filtroEquipo}
          onCambiar={setFiltroEquipo}
        />
        <MultiselectFiltro
          label="Entrega"
          opciones={[{ value: "SI", label: "Mensajería" }, { value: "NO", label: "Local" }]}
          seleccionados={filtroEntrega}
          onCambiar={setFiltroEntrega}
        />
        {hayFiltrosActivos && (
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={limpiarFiltros}>
            <CloseCircle className="size-3.5" /> Limpiar
          </Button>
        )}
      </div>

      {/* Reproduce el badge "filtroActivoIndicador" del original. */}
      {hayFiltrosActivos && (
        <div className="mb-4 flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs text-primary">
          <Filter className="size-3.5 shrink-0" />
          <span className="truncate">{descripcionFiltros}</span>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar reparaciones: {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-card">
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
              {/* Fija a la derecha: con 10 columnas la tabla se desborda y,
                  sin esto, el botón de acción queda fuera de la pantalla. */}
              <TableHead className="sticky right-0 bg-card shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.15)]">
                Acciones
              </TableHead>
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
                  <TableRow
                    key={rep.resguardo}
                    className="group cursor-pointer"
                    onClick={() => setResguardoDetalle(rep.resguardo)}
                    title={`Abrir reparación ${rep.resguardo}`}
                  >
                    <TableCell className="font-semibold">{rep.resguardo}</TableCell>
                    <TableCell className="text-sm">{formatearFecha(rep.fechaRecepcion)}</TableCell>
                    <TableCell className="max-w-47.5">
                      <div className="truncate" title={rep.cliente.nombre || "N/A"}>{rep.cliente.nombre || "N/A"}</div>
                      <div className="truncate text-xs text-muted-foreground">{rep.cliente.telefono || "N/A"}</div>
                      <div className="truncate text-xs text-muted-foreground" title={rep.cliente.email || ""}>{rep.cliente.email || ""}</div>
                    </TableCell>
                    <TableCell className="max-w-57.5">
                      <div className="truncate" title={rep.equipo.modelo || "N/A"}>{rep.equipo.modelo || "N/A"}</div>
                      {rep.pptoDescripcion && (
                        <div className="truncate text-xs text-muted-foreground" title={rep.pptoDescripcion}>
                          {rep.pptoDescripcion}
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
                    <TableCell className="sticky right-0 bg-card shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.15)] group-hover:bg-muted/50">
                      {rep.estado === "Formulario Pendiente" ? (
                        <div className="flex gap-1">
                          {/* stopPropagation: sin esto el clic tambien
                              dispararia el onClick de la fila. */}
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 gap-1 bg-amber-500 text-white hover:bg-amber-600"
                            onClick={(e) => { e.stopPropagation(); setFormularioPendiente({ rep, modo: "confirmar" }); }}
                          >
                            <ClipboardTick className="size-3.5" /> Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 border-destructive text-destructive hover:bg-destructive/10"
                            onClick={(e) => { e.stopPropagation(); setFormularioPendiente({ rep, modo: "rechazar" }); }}
                          >
                            <CloseCircle className="size-3.5" /> Rechazar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1"
                          onClick={(e) => { e.stopPropagation(); setResguardoDetalle(rep.resguardo); }}
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

      <Suspense fallback={null}>
        <AbrirNuevaPorQuery onAbrir={() => setNuevaAbierta(true)} />
      </Suspense>

      <DetalleReparacionDialog
        resguardo={resguardoDetalle}
        onOpenChange={(open) => !open && setResguardoDetalle(null)}
        onActualizado={() => {
          cargar();
          cargarMetricas();
        }}
      />

      <ReparacionSheet
        modo="nueva"
        open={nuevaAbierta}
        onOpenChange={setNuevaAbierta}
        onGuardado={() => {
          cargar();
          cargarMetricas();
        }}
      />

      <ReparacionSheet
        modo="confirmar"
        reparacionPendiente={formularioPendiente?.modo === "confirmar" ? formularioPendiente.rep : null}
        open={formularioPendiente?.modo === "confirmar"}
        onOpenChange={(open) => !open && setFormularioPendiente(null)}
        onGuardado={() => {
          cargar();
          cargarMetricas();
        }}
      />

      <RechazarFormularioDialog
        reparacion={formularioPendiente?.modo === "rechazar" ? formularioPendiente.rep : null}
        onOpenChange={(open) => !open && setFormularioPendiente(null)}
        onResuelto={() => {
          cargar();
          cargarMetricas();
        }}
      />
    </div>
  );
}
