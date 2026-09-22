"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Refresh2, SearchNormal1, Calendar, Link2, Truck, TickCircle, CloseCircle, MoneySend } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CompraFila, ESTADOS_PEDIDO, ESTILO_BADGE_ESTADO, KPIS_COMPRAS_VACIOS, KpisCompras } from "@/lib/compras";
import type { Proveedor } from "@/app/api/proveedores/route";

const PAGINA = 50;

const TARJETAS: { clave: keyof KpisCompras; etiqueta: string; filtroEstado: string | null }[] = [
  { clave: "total", etiqueta: "Todos", filtroEstado: null },
  { clave: "pendiente", etiqueta: "Pendiente", filtroEstado: "Pendiente" },
  { clave: "pedido", etiqueta: "Pedido", filtroEstado: "Pedido" },
  { clave: "en_transito", etiqueta: "En Tránsito", filtroEstado: "En Tránsito" },
  { clave: "recibido", etiqueta: "Recibido", filtroEstado: "Recibido" },
  { clave: "cancelado", etiqueta: "Cancelado", filtroEstado: "Cancelado" },
  { clave: "con_problema", etiqueta: "Con problema", filtroEstado: null },
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
  const [estado, setEstado] = useState<string | null>(null);
  const [conProblema, setConProblema] = useState(false);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedorId, setProveedorId] = useState<string>("");
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
      .then((d) => {
        if (d.ok) setProveedores(d.proveedores);
      })
      .catch(() => {});
  }, []);

  const parametros = useCallback(
    (pagina: number) => {
      const p = new URLSearchParams({ pagina: String(pagina), porPagina: String(PAGINA) });
      if (conProblema) p.set("estado", "Problema,Pieza Rota,Pieza Defectuosa");
      else if (estado) p.set("estado", estado);
      if (proveedorId) p.set("proveedorId", proveedorId);
      if (fechaDesde) p.set("fechaDesde", fechaDesde);
      if (fechaHasta) p.set("fechaHasta", fechaHasta);
      if (busquedaAplicada.trim()) p.set("busqueda", busquedaAplicada.trim());
      return p;
    },
    [estado, conProblema, proveedorId, fechaDesde, fechaHasta, busquedaAplicada]
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

  function elegirTarjeta(t: (typeof TARJETAS)[number]) {
    if (t.clave === "con_problema") {
      setConProblema((v) => !v);
      setEstado(null);
      return;
    }
    setConProblema(false);
    setEstado(t.filtroEstado === estado ? null : t.filtroEstado);
  }

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

  const tarjeta = (activa: boolean) => `rounded-lg border bg-card px-3 py-2 text-left transition-colors hover:bg-muted/40 ${activa ? "ring-2 ring-primary/50" : ""}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Compras</h1>
          <p className="text-sm text-muted-foreground">Pedidos de piezas registrados desde Reparaciones — proveedor, enlace de compra y estado de cada uno</p>
        </div>
        <Button variant="outline" size="icon" className="size-8" onClick={() => cargar(1, false)} title="Actualizar">
          <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {TARJETAS.map((t) => {
          const activa = t.clave === "con_problema" ? conProblema : t.clave === "total" ? !conProblema && estado === null : !conProblema && estado === t.filtroEstado;
          return (
            <button key={t.clave} type="button" aria-pressed={activa} onClick={() => elegirTarjeta(t)} className={tarjeta(activa)}>
              <p className="text-xs text-muted-foreground">{t.etiqueta}</p>
              <p className="text-lg font-semibold tabular-nums">{cargando && !compras.length ? "…" : kpis[t.clave].toLocaleString("es-ES")}</p>
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
          <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Proveedor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos los proveedores</SelectItem>
            {proveedores.map((p) => (
              <SelectItem key={p.proveedorId} value={p.proveedorId}>{p.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Calendar className="size-3.5 text-muted-foreground" />
          <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="h-8 w-36" title="Desde" />
          <span className="text-muted-foreground">-</span>
          <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="h-8 w-36" title="Hasta" />
        </div>
        {(fechaDesde || fechaHasta || proveedorId) && (
          <Button variant="ghost" size="sm" className="h-8" onClick={() => { setFechaDesde(""); setFechaHasta(""); setProveedorId(""); }}>
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
                  {Array.from({ length: 10 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            {!cargando && compras.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
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
                    <TableCell className="text-sm">{c.proveedorNombre || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="max-w-56 truncate text-sm" title={c.descripcion}>{c.descripcion || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{c.numeroPedido || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{fechaCorta(c.fechaPedido)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{fechaCorta(c.fechaEstimada)}</TableCell>
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
                      <div className="flex justify-end gap-1">
                        {sig && (
                          <Button size="sm" variant="outline" className="h-7 gap-1" disabled={enviando === c.pedidoId} onClick={() => cambiarEstado(c.pedidoId, sig.estado)}>
                            <sig.icono className="size-3.5" /> {sig.etiqueta}
                          </Button>
                        )}
                        {c.estado !== "Cancelado" && c.estado !== "Recibido" && (
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-destructive hover:text-destructive" disabled={enviando === c.pedidoId} onClick={() => cambiarEstado(c.pedidoId, "Cancelado")}>
                            <CloseCircle className="size-3.5" /> Cancelar
                          </Button>
                        )}
                      </div>
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
