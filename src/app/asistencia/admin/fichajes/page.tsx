"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ColumnaFiltro } from "@/app/(app)/facturas-clientes/columna-filtro";
import { TipoFichajePill } from "../../pills";
import { colorAvatar, iniciales } from "@/lib/registro-acciones-estilo";
import { Filter, Category2, ArrowRight2 } from "@/lib/icons";

interface Empleado {
  id: number;
  nombre: string;
}
interface Fichaje {
  id: number;
  employee_id: number;
  empleado_nombre: string;
  check_in: string;
  check_out: string | null;
  tipo_fichaje: string;
  firmado: boolean;
  ip_registro: string | null;
  observaciones: string | null;
}

type ColumnaFiltrable = "empleado_nombre" | "tipo_fichaje" | "firmado";
type FiltroFecha = "todas" | "hoy" | "semana" | "mes" | "mes_anterior" | "personalizado";
type AgruparPor = "ninguno" | "empleado" | "mes" | "semana" | "dia";
const NUM_COLUMNAS = 7;

function fechaHora(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatHoras(h: number): string {
  return h.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function valorColumna(f: Fichaje, col: ColumnaFiltrable): string {
  if (col === "firmado") return f.firmado ? "Sí" : "No";
  return String(f[col] ?? "—");
}

function toYYYYMMDD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function lunesDeSemana(d: Date): Date {
  const diaSemana = (d.getDay() + 6) % 7; // 0=lunes..6=domingo
  const lunes = new Date(d);
  lunes.setDate(d.getDate() - diaSemana);
  return lunes;
}

/** Rango [desde, hasta] (YYYY-MM-DD) para cada filtro rápido — mismos
    períodos que el panel "Filtros" de Odoo (Hoy/Esta semana/Este mes/
    Mes anterior/Filtro personalizado), en vez de las ventanas móviles que
    ya usa Facturas de Clientes (últimos 7/30 días) — petición del
    usuario, 2026-08-31. */
function rangoParaFiltro(filtro: FiltroFecha, personalizado: { desde: string; hasta: string }): { desde?: string; hasta?: string } {
  const hoy = new Date();
  if (filtro === "todas") return {};
  if (filtro === "personalizado") return { desde: personalizado.desde || undefined, hasta: personalizado.hasta || undefined };
  if (filtro === "hoy") {
    const s = toYYYYMMDD(hoy);
    return { desde: s, hasta: s };
  }
  if (filtro === "semana") {
    const lunes = lunesDeSemana(hoy);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    return { desde: toYYYYMMDD(lunes), hasta: toYYYYMMDD(domingo) };
  }
  if (filtro === "mes") {
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    return { desde: toYYYYMMDD(inicio), hasta: toYYYYMMDD(fin) };
  }
  // mes_anterior
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
  return { desde: toYYYYMMDD(inicio), hasta: toYYYYMMDD(fin) };
}

const FILTROS_FECHA: { valor: FiltroFecha; label: string }[] = [
  { valor: "hoy", label: "Hoy" },
  { valor: "semana", label: "Esta semana" },
  { valor: "mes", label: "Este mes" },
  { valor: "mes_anterior", label: "Mes anterior" },
];

const OPCIONES_AGRUPAR: { valor: AgruparPor; label: string }[] = [
  { valor: "ninguno", label: "Sin agrupar" },
  { valor: "empleado", label: "Empleado" },
  { valor: "mes", label: "Mes" },
  { valor: "semana", label: "Semana" },
  { valor: "dia", label: "Día" },
];

function horasEntre(f: Fichaje): number {
  if (!f.check_in || !f.check_out) return 0;
  const ms = new Date(f.check_out).getTime() - new Date(f.check_in).getTime();
  return ms > 0 ? ms / 3600000 : 0;
}

interface Grupo {
  clave: string;
  label: string;
  filas: Fichaje[];
}

function agrupar(lista: Fichaje[], agruparPor: AgruparPor): Grupo[] | null {
  if (agruparPor === "ninguno") return null;
  const mapa = new Map<string, Grupo>();
  for (const f of lista) {
    let clave: string;
    let label: string;
    if (agruparPor === "empleado") {
      clave = String(f.employee_id);
      label = f.empleado_nombre;
    } else {
      const fecha = f.check_in ? new Date(f.check_in) : null;
      if (!fecha) { clave = "__sin_fecha"; label = "Sin fecha"; }
      else if (agruparPor === "mes") {
        clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
        label = fecha.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
        label = label.charAt(0).toUpperCase() + label.slice(1);
      } else if (agruparPor === "semana") {
        const lunes = lunesDeSemana(fecha);
        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);
        clave = toYYYYMMDD(lunes);
        label = `Semana del ${lunes.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })} al ${domingo.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
      } else {
        clave = toYYYYMMDD(fecha);
        label = fecha.toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
        label = label.charAt(0).toUpperCase() + label.slice(1);
      }
    }
    if (!mapa.has(clave)) mapa.set(clave, { clave, label, filas: [] });
    mapa.get(clave)!.filas.push(f);
  }
  return Array.from(mapa.values()).sort((a, b) => (agruparPor === "empleado" ? a.label.localeCompare(b.label, "es") : b.clave.localeCompare(a.clave)));
}

export default function AdminFichajesPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [fichajes, setFichajes] = useState<Fichaje[]>([]);
  const [empleadoId, setEmpleadoId] = useState("");
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>("todas");
  const [personalizado, setPersonalizado] = useState({ desde: "", hasta: "" });
  const [agruparPor, setAgruparPor] = useState<AgruparPor>("ninguno");
  const [gruposAbiertos, setGruposAbiertos] = useState<Set<string>>(new Set());
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [cargando, setCargando] = useState(true);
  const [filtrosColumna, setFiltrosColumna] = useState<Partial<Record<ColumnaFiltrable, Set<string>>>>({});

  async function cargar() {
    setCargando(true);
    try {
      const { desde, hasta } = rangoParaFiltro(filtroFecha, personalizado);
      const params = new URLSearchParams();
      if (empleadoId) params.set("employeeId", empleadoId);
      if (desde) params.set("desde", desde);
      if (hasta) params.set("hasta", hasta);
      const qs = params.toString();
      const res = await fetch(`/api/asistencia/admin/fichajes${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      if (data.ok) setFichajes(data.fichajes);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    fetch("/api/asistencia/admin/empleados").then((r) => r.json()).then((d) => { if (d.ok) setEmpleados(d.empleados); });
  }, []);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadoId, filtroFecha, personalizado]);

  function aplicarFiltrosColumna(lista: Fichaje[], colExcluida?: ColumnaFiltrable): Fichaje[] {
    let out = lista;
    for (const col of ["empleado_nombre", "tipo_fichaje", "firmado"] as ColumnaFiltrable[]) {
      if (col === colExcluida) continue;
      const seleccion = filtrosColumna[col];
      if (seleccion) out = out.filter((f) => seleccion.has(valorColumna(f, col)));
    }
    return out;
  }

  const listaFiltrada = useMemo(() => aplicarFiltrosColumna(fichajes), [fichajes, filtrosColumna]);
  const grupos = useMemo(() => agrupar(listaFiltrada, agruparPor), [listaFiltrada, agruparPor]);

  function opcionesColumna(col: ColumnaFiltrable): string[] {
    const base = aplicarFiltrosColumna(fichajes, col);
    const vistos = new Set<string>();
    const vals: string[] = [];
    for (const f of base) {
      const v = valorColumna(f, col);
      if (!vistos.has(v)) { vistos.add(v); vals.push(v); }
    }
    vals.sort((a, b) => a.localeCompare(b, "es"));
    return vals;
  }

  function aplicarFiltroColumna(col: ColumnaFiltrable, seleccion: Set<string> | null) {
    setFiltrosColumna((prev) => {
      const siguiente = { ...prev };
      if (seleccion === null) delete siguiente[col];
      else siguiente[col] = seleccion;
      return siguiente;
    });
  }

  function alternarGrupo(clave: string) {
    setGruposAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave);
      else next.add(clave);
      return next;
    });
  }

  function alternarFila(id: number) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function alternarTodas() {
    setSeleccionados((prev) => (prev.size === listaFiltrada.length ? new Set() : new Set(listaFiltrada.map((f) => f.id))));
  }

  const filtroFechaLabel = filtroFecha === "todas"
    ? "Todas las fechas"
    : filtroFecha === "personalizado"
      ? `${personalizado.desde || "…"} → ${personalizado.hasta || "…"}`
      : FILTROS_FECHA.find((f) => f.valor === filtroFecha)?.label || "Todas las fechas";

  const agruparLabel = OPCIONES_AGRUPAR.find((o) => o.valor === agruparPor)?.label || "Sin agrupar";

  function filaFichaje(f: Fichaje) {
    return (
      <TableRow key={f.id}>
        <TableCell className="w-10">
          <Checkbox checked={seleccionados.has(f.id)} onCheckedChange={() => alternarFila(f.id)} />
        </TableCell>
        <TableCell className="font-medium">
          <span className="inline-flex items-center gap-2">
            <Avatar size="sm">
              <AvatarFallback className={colorAvatar(f.empleado_nombre)}>{iniciales(f.empleado_nombre)}</AvatarFallback>
            </Avatar>
            {f.empleado_nombre}
          </span>
        </TableCell>
        <TableCell className="text-sm">{fechaHora(f.check_in)}</TableCell>
        <TableCell className="text-sm">{fechaHora(f.check_out)}</TableCell>
        <TableCell><TipoFichajePill tipo={f.tipo_fichaje} /></TableCell>
        <TableCell className="text-right text-sm tabular-nums">{formatHoras(horasEntre(f))}</TableCell>
        <TableCell>
          <Checkbox checked={f.firmado} disabled />
        </TableCell>
      </TableRow>
    );
  }

  function filaGrupo(g: Grupo) {
    const abierto = gruposAbiertos.has(g.clave);
    const totalHoras = g.filas.reduce((acc, f) => acc + horasEntre(f), 0);
    return (
      <TableRow key={g.clave} className="cursor-pointer bg-muted/40 hover:bg-muted/60" onClick={() => alternarGrupo(g.clave)}>
        <TableCell />
        <TableCell colSpan={4} className="font-medium">
          <span className="inline-flex items-center gap-2">
            <ArrowRight2 className={cn("size-3.5 text-muted-foreground transition-transform", abierto && "rotate-90")} />
            {g.label} ({g.filas.length})
          </span>
        </TableCell>
        <TableCell className="text-right text-sm font-medium tabular-nums">{formatHoras(totalHoras)}</TableCell>
        <TableCell />
      </TableRow>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Fichajes</h1>

      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm" className={cn("gap-1.5", filtroFecha !== "todas" && "border-primary text-primary")}>
                <Filter className="size-3.5" /> {filtroFechaLabel}
              </Button>
            }
          />
          <PopoverContent align="start" className="w-64 p-0">
            <div className="p-1">
              <button
                type="button"
                className={cn("w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted", filtroFecha === "todas" && "bg-primary/10 font-medium text-primary")}
                onClick={() => setFiltroFecha("todas")}
              >
                Todas las fechas
              </button>
              {FILTROS_FECHA.map((f) => (
                <button
                  key={f.valor}
                  type="button"
                  className={cn("w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted", filtroFecha === f.valor && "bg-primary/10 font-medium text-primary")}
                  onClick={() => setFiltroFecha(f.valor)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="space-y-2 border-t p-3">
              <p className="text-xs font-medium text-muted-foreground">Filtro personalizado</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Desde</Label>
                  <Input type="date" className="h-8 text-xs" value={personalizado.desde} onChange={(e) => setPersonalizado((p) => ({ ...p, desde: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hasta</Label>
                  <Input type="date" className="h-8 text-xs" value={personalizado.hasta} onChange={(e) => setPersonalizado((p) => ({ ...p, hasta: e.target.value }))} />
                </div>
              </div>
              <Button
                size="sm"
                className="w-full"
                disabled={!personalizado.desde && !personalizado.hasta}
                onClick={() => setFiltroFecha("personalizado")}
              >
                Aplicar rango
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" className={cn("gap-1.5", agruparPor !== "ninguno" && "border-primary text-primary")}>
                <Category2 className="size-3.5" /> Agrupar por: {agruparLabel}
              </Button>
            }
          />
          <DropdownMenuContent className="w-48">
            <DropdownMenuRadioGroup value={agruparPor} onValueChange={(v) => { setAgruparPor(v as AgruparPor); setGruposAbiertos(new Set()); }}>
              {OPCIONES_AGRUPAR.map((o) => (
                <DropdownMenuRadioItem key={o.valor} value={o.valor}>{o.label}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Select value={empleadoId || "__todos"} onValueChange={(v) => setEmpleadoId(!v || v === "__todos" ? "" : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos los empleados">
              {(v: string) => (!v || v === "__todos" ? "Todos los empleados" : empleados.find((e) => String(e.id) === v)?.nombre || "Todos los empleados")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos">Todos los empleados</SelectItem>
            {empleados.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={cargar}>Actualizar</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={listaFiltrada.length > 0 && seleccionados.size === listaFiltrada.length}
                  onCheckedChange={alternarTodas}
                />
              </TableHead>
              <TableHead>
                <span className="inline-flex items-center">
                  Empleado
                  <ColumnaFiltro opciones={opcionesColumna("empleado_nombre")} seleccion={filtrosColumna.empleado_nombre ?? null} onAplicar={(s) => aplicarFiltroColumna("empleado_nombre", s)} />
                </span>
              </TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Salida</TableHead>
              <TableHead>
                <span className="inline-flex items-center">
                  Tipo de Fichaje
                  <ColumnaFiltro opciones={opcionesColumna("tipo_fichaje")} seleccion={filtrosColumna.tipo_fichaje ?? null} onAplicar={(s) => aplicarFiltroColumna("tipo_fichaje", s)} />
                </span>
              </TableHead>
              <TableHead className="text-right">Total Horas</TableHead>
              <TableHead>
                <span className="inline-flex items-center">
                  Firmado
                  <ColumnaFiltro opciones={opcionesColumna("firmado")} seleccion={filtrosColumna.firmado ?? null} onAplicar={(s) => aplicarFiltroColumna("firmado", s)} />
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: NUM_COLUMNAS }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            ))}

            {!cargando && !grupos && listaFiltrada.length === 0 && (
              <TableRow><TableCell colSpan={NUM_COLUMNAS} className="py-8 text-center text-muted-foreground">Sin fichajes</TableCell></TableRow>
            )}
            {!cargando && !grupos && listaFiltrada.map(filaFichaje)}

            {!cargando && grupos && grupos.length === 0 && (
              <TableRow><TableCell colSpan={NUM_COLUMNAS} className="py-8 text-center text-muted-foreground">Sin fichajes</TableCell></TableRow>
            )}
            {!cargando && grupos && grupos.flatMap((g) => [
              filaGrupo(g),
              ...(gruposAbiertos.has(g.clave) ? g.filas.map(filaFichaje) : []),
            ])}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
