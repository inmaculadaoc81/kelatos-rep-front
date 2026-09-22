"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Refresh2, SearchNormal1, Calendar, Link2, Truck, TickCircle, MoneySend, Category, Clock, Warning2, Timer1, CloseCircle,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CompraFila, ESTILO_BADGE_ESTADO, KPIS_COMPRAS_VACIOS, KpisCompras, colorProveedor } from "@/lib/compras";
import type { Proveedor } from "@/app/api/proveedores/route";
import type { Empleado } from "@/app/api/empleados/route";

const PAGINA = 50;

type Vista = "" | "Pendiente" | "Pedido" | "En Tránsito" | "Recibido" | "Cancelado" | "con_problema" | "retrasado";

const TARJETAS: { clave: keyof KpisCompras; etiqueta: string; vista: Vista; icono: typeof Truck; color: string }[] = [
  { clave: "total", etiqueta: "Todos", vista: "", icono: Category, color: "bg-slate-500/10 text-slate-600 dark:text-slate-300" },
  { clave: "pendiente", etiqueta: "Pendiente", vista: "Pendiente", icono: Clock, color: "bg-slate-500/10 text-slate-600 dark:text-slate-300" },
  { clave: "pedido", etiqueta: "Pedido", vista: "Pedido", icono: MoneySend, color: "bg-sky-500/10 text-sky-700 dark:text-sky-400" },
  { clave: "en_transito", etiqueta: "En Tránsito", vista: "En Tránsito", icono: Truck, color: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  { clave: "recibido", etiqueta: "Recibido", vista: "Recibido", icono: TickCircle, color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  { clave: "cancelado", etiqueta: "Cancelado", vista: "Cancelado", icono: CloseCircle, color: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400" },
  { clave: "con_problema", etiqueta: "Con problema", vista: "con_problema", icono: Warning2, color: "bg-red-500/10 text-red-700 dark:text-red-400" },
  { clave: "retrasado", etiqueta: "Retrasados", vista: "retrasado", icono: Timer1, color: "bg-orange-500/10 text-orange-700 dark:text-orange-400" },
];

function fechaCorta(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Siguiente estado sugerido para el botón rápido de la fila (mismo criterio que accion-requerida.tsx). */
function siguienteEstado(estado: string): { estado: string; etiqueta: string; icono: typeof Truck } | null {
  if (estado === "Pedido") return { estado: "En Tránsito", etiqueta: "En tránsito", icono: Truck };
  if (estado === "En Tránsito") return { estado: "Recibido", etiqueta: "Recibido", icono: TickCircle };
  if (estado === "Pendiente") return { estado: "Pedido", etiqueta: "Pedido", icono: MoneySend };
  return null;
}

export default function ComprasPage() {
  const [compras, setCompras] = useState<CompraFila[]>([]);
  const [total, setTotal] = useState(0);
  const [kpis, setKpis] = useState<KpisCompras>(KPIS_COMPRAS_VACIOS);
  const [vista, setVista] = useState<Vista>("");
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedorId, setProveedorId] = useState<string>("");
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [compradoPor, setCompradoPor] = useState<string>("");
  const [orden, setOrden] = useState<"" | "fechaEstimadaAsc">("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  const consulta = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setBusquedaAplicada(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    fetch("/api/proveedores")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setProveedores(d.proveedores); })
      .catch(() => {});
    fetch("/api/empleados")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setEmpleados(d.empleados); })
      .catch(() => {});
  }, []);

  const parametros = useCallback(
    (pagina: number) => {
      const p = new URLSearchParams({ pagina: String(pagina), porPagina: String(PAGINA) });
      if (vista === "con_problema") p.set("estado", "Problema,Pieza Rota,Pieza Defectuosa");
      else if (vista === "retrasado") p.set("retrasado", "true");
      else if (vista) p.set("estado", vista);
      if (proveedorId) p.set("proveedorId", proveedorId);
      if (compradoPor) p.set("compradoPor", compradoPor);
      if (fechaDesde) p.set("fechaDesde", fechaDesde);
      if (fechaHasta) p.set("fechaHasta", fechaHasta);
      if (orden) p.set("orden", orden);
      if (busquedaAplicada.trim()) p.set("busqueda", busquedaAplicada.trim());
      return p;
    },
    [vista, proveedorId, compradoPor, fechaDesde, fechaHasta, orden, busquedaAplicada]
  );

  const cargar = useCallback(
    async (pagina: number, acumular: boolean) => {
      const id = ++consulta.current;
      if (!acumular) {
        setCargando(true);
        setError(null);
      } else {
        setCargandoMas(true);
      }
      try {
        const res = await fetch(`/api/compras?${parametros(pagina).toString()}`);
        const data = await res.json();
        if (id !== consulta.current) return;
        if (!data.ok) throw new Error(data.error || "Error desconocido");
        const filas = data.compras as CompraFila[];
        setCompras((prev) => (acumular ? [...prev, ...filas.filter((f) => !prev.some((x) => x.pedidoId === f.pedidoId))] : filas));
        setTotal(data.total as number);
        setKpis(data.kpis as KpisCompras);
      } catch (e) {
        if (id === consulta.current) setError(e instanceof Error ? e.message : "Error desconocido");
      } finally {
        if (id === consulta.current) {
          setCargando(false);
          setCargandoMas(false);
        }
      }
    },
    [parametros]
  );

  useEffect(() => {
    cargar(1, false);
  }, [cargar]);

  async function cambiarEstado(pedidoId: string, nuevoEstado: string) {
    setEnviando(pedidoId);
    try {
      const res = await fetch("/api/pedidos/cambiar-estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidos: [pedidoId], estado: nuevoEstado }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Pedido actualizado a "${nuevoEstado}"`);
      cargar(1, false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(null);
    }
  }

  const hayFiltros = !!(fechaDesde || fechaHasta || proveedorId || compradoPor || orden);

  return (
    <div className="space-y-3 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Compras</h1>
          <p className="text-sm text-muted-foreground">Pedidos de piezas registrados desde Reparaciones — proveedor, enlace de compra y estado de cada uno</p>
        </div>
        <Button variant="outline" size="icon" className="size-8" onClick={() => cargar(1, false)} title="Actualizar">
          <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {TARJETAS.map((t) => {
          const activa = vista === t.vista;
          return (
            <button
              key={t.clave}
              type="button"
              aria-pressed={activa}
              onClick={() => setVista(activa ? "" : t.vista)}
              className={`flex items-center gap-2.5 rounded-lg border bg-card p-2.5 text-left transition-colors hover:bg-muted/40 ${activa ? "ring-2 ring-primary/50" : ""}`}
            >
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-md ${t.color}`}>
                <t.icono className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs text-muted-foreground">{t.etiqueta}</span>
                <span className="block text-lg leading-tight font-semibold tabular-nums">{cargando && !compras.length ? "…" : kpis[t.clave].toLocaleString("es-ES")}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar pedido, resguardo, cliente, nº de pedido…" className="h-8 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <Select value={proveedorId || "Todos"} onValueChange={(v) => setProveedorId(v && v !== "Todos" ? v : "")}>
          <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Proveedor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos los proveedores</SelectItem>
            {proveedores.map((p) => (
              <SelectItem key={p.proveedorId} value={p.proveedorId}>{p.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={compradoPor || "Todos"} onValueChange={(v) => setCompradoPor(v && v !== "Todos" ? v : "")}>
          <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Comprado por" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Cualquiera</SelectItem>
            {empleados.map((e) => (
              <SelectItem key={e.empleadoId} value={e.nombre}>{e.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={orden || "recientes"} onValueChange={(v) => setOrden(v === "fechaEstimadaAsc" ? "fechaEstimadaAsc" : "")}>
          <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Orden" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recientes">Pedidos más recientes</SelectItem>
            <SelectItem value="fechaEstimadaAsc">Llegada más próxima</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Calendar className="size-3.5 text-muted-foreground" />
          <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="h-8 w-36" title="Fecha de pedido desde" />
          <span className="text-muted-foreground">-</span>
          <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="h-8 w-36" title="Fecha de pedido hasta" />
        </div>
        {hayFiltros && (
          <Button variant="ghost" size="sm" className="h-8" onClick={() => { setFechaDesde(""); setFechaHasta(""); setProveedorId(""); setCompradoPor(""); setOrden(""); }}>
            Quitar filtros
          </Button>
        )}
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente / Equipo</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Nº de pedido</TableHead>
              <TableHead>Comprado por</TableHead>
              <TableHead>Fecha pedido</TableHead>
              <TableHead>Fecha estimada</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Enlace</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 11 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            {!cargando && compras.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                  Ningún pedido de piezas coincide con los filtros
                </TableCell>
              </TableRow>
            )}
            {!cargando &&
              compras.map((c) => {
                const sig = siguienteEstado(c.estado);
                return (
                  <TableRow key={c.pedidoId}>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{c.pedidoId}</TableCell>
                    <TableCell className="min-w-40">
                      {c.resguardo ? (
                        <Link href={`/reparaciones?resguardo=${encodeURIComponent(c.resguardo)}`} className="block hover:underline">
                          <span className="block text-sm font-medium">{c.clienteNombre || c.resguardo}</span>
                          <span className="block text-xs text-muted-foreground">{c.resguardo}{c.equipoModelo ? ` · ${c.equipoModelo}` : ""}</span>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.proveedorNombre ? (
                        <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${colorProveedor(c.proveedorNombre)}`}>
                          {c.proveedorNombre}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-sm" title={c.descripcion}>{c.descripcion || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{c.numeroPedido || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{c.compradoPor || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{fechaCorta(c.fechaPedido)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {fechaCorta(c.fechaEstimada)}
                      {c.retrasado && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs font-medium text-orange-600 dark:text-orange-400" title="Debería haber llegado y sigue sin recibirse">
                          <Timer1 className="size-3" /> Retrasado
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${ESTILO_BADGE_ESTADO[c.estado] || "border-muted-foreground/30 text-muted-foreground"}`}>
                        {c.estado || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {c.enlace ? (
                        <Button size="sm" variant="ghost" className="h-7 gap-1" nativeButton={false} render={<a href={c.enlace} target="_blank" rel="noopener noreferrer" />}>
                          <Link2 className="size-3.5" /> Abrir
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {sig ? (
                        <Button size="sm" variant="outline" className="h-7 gap-1" disabled={enviando === c.pedidoId} onClick={() => cambiarEstado(c.pedidoId, sig.estado)}>
                          <sig.icono className="size-3.5" /> {sig.etiqueta}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
        {!cargando && compras.length < total && (
          <div className="border-t p-3 text-center">
            <Button variant="outline" size="sm" disabled={cargandoMas} onClick={() => cargar(Math.floor(compras.length / PAGINA) + 1, true)}>
              {cargandoMas ? "Cargando…" : `Mostrar más (${compras.length.toLocaleString("es-ES")} de ${total.toLocaleString("es-ES")})`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
