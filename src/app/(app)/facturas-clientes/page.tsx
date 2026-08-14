"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Refresh2,
  SearchNormal1,
  DocumentText,
  Receipt,
  Eye,
  Bank,
  ExportSquare,
  Box,
  ArrowLeft2,
  ArrowLeft3,
  ArrowRight2,
  ArrowRight3,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfirm } from "@/components/confirm-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatearFecha } from "@/lib/dias-entrega";
import { fechaMadrid } from "@/lib/reportes";
import {
  FacturaCliente,
  TipoFactura,
  ETIQUETA_TIPO_FACTURA,
  serieFactura,
  montoConIva,
  estadoFacturaDerivado,
  tipoPermiteMarcarCobrada,
  formaPagoLabel,
} from "@/lib/facturas-cliente";
import { ColumnaFiltro } from "./columna-filtro";
import { DetalleFacturaDialog } from "./detalle-factura-dialog";

function euros(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

const BANCOS = ["Santander", "Sabadell", "BBVA", "CaixaBank"];

type ColumnaFiltrable = "resguardo" | "numero" | "serie" | "cliente" | "equipo" | "fecha" | "total" | "tipo" | "formaPago";
const COLUMNAS_FILTRABLES: ColumnaFiltrable[] = ["resguardo", "numero", "serie", "cliente", "equipo", "fecha", "total", "tipo", "formaPago"];

function valorColumna(f: FacturaCliente, columna: ColumnaFiltrable): string {
  switch (columna) {
    case "resguardo":
      return f.resguardo || "—";
    case "numero":
      return f.numero || "—";
    case "serie": {
      const s = serieFactura(f.numero);
      return s || "—";
    }
    case "cliente":
      return f.cliente || "—";
    case "equipo":
      return f.equipo || "—";
    case "fecha":
      return formatearFecha(f.fecha) || "—";
    case "total": {
      const m = montoConIva(f);
      return m ? euros(m) : "—";
    }
    case "tipo":
      return ETIQUETA_TIPO_FACTURA[f.tipo] || "—";
    case "formaPago":
      return formaPagoLabel(f);
  }
}

type FiltroFecha = "todas" | "hoy" | "semana" | "mes" | `mes${number}` | `trim${number}`;

/**
 * Reproduce _fcDentroRango() del original, con un ajuste: el original
 * truncaba fechaStr.substring(0,10) porque ahí las fechas ya llegaban
 * pre-formateadas en Europe/Madrid (Utilities.formatDate(...)) — aquí
 * fecha_factura/etc. son timestamptz y llegan como ISO en UTC
 * (p.ej. "2026-08-14T22:21:00.000Z" para una factura generada a las 00:21
 * del día 15 en Madrid). Truncar esa cadena directamente se queda con el
 * día UTC, no el de Madrid: una factura generada justo pasada la
 * medianoche española caía en el filtro "Hoy" del día anterior (bug real
 * reportado: factura de las 00:21 del 15 invisible al filtrar por hoy).
 * fechaMadrid() convierte primero al día calendario correcto.
 */
function dentroDeRango(fecha: string | null, filtro: FiltroFecha): boolean {
  if (!fecha) return filtro === "todas";
  const iso = fechaMadrid(fecha);
  if (!iso) return filtro === "todas";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return filtro === "todas";
  const hoyIso = fechaMadrid(new Date());
  const hoy = hoyIso ? new Date(`${hoyIso}T00:00:00`) : new Date();
  if (!hoyIso) hoy.setHours(0, 0, 0, 0);

  if (filtro === "todas") return true;
  if (filtro === "hoy") return d.getTime() === hoy.getTime();
  if (filtro === "semana") {
    const hace7 = new Date(hoy);
    hace7.setDate(hoy.getDate() - 6);
    return d >= hace7 && d <= hoy;
  }
  if (filtro === "mes") {
    const hace30 = new Date(hoy);
    hace30.setDate(hoy.getDate() - 29);
    return d >= hace30 && d <= hoy;
  }
  const mMatch = /^mes(\d+)$/.exec(filtro);
  if (mMatch) {
    const mesN = parseInt(mMatch[1], 10);
    return d.getFullYear() === hoy.getFullYear() && d.getMonth() + 1 === mesN;
  }
  const tMatch = /^trim(\d)$/.exec(filtro);
  if (tMatch) {
    const trimN = parseInt(tMatch[1], 10);
    const mesInicio = (trimN - 1) * 3 + 1;
    const mesFin = trimN * 3;
    const mesDoc = d.getMonth() + 1;
    return d.getFullYear() === hoy.getFullYear() && mesDoc >= mesInicio && mesDoc <= mesFin;
  }
  return true;
}

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const TIPO_BADGE_ESTILO: Partial<Record<TipoFactura, { bg: string; color: string }>> = {
  reparacion: { bg: "#0d6efd", color: "#fff" },
  revision: { bg: "#fd7e14", color: "#fff" },
  mensajeria: { bg: "#0dcaf0", color: "#000" },
  anticipo: { bg: "#6c757d", color: "#fff" },
  rectificativa: { bg: "#dc3545", color: "#fff" },
  recogida: { bg: "#6c757d", color: "#fff" },
  alquiler: { bg: "#198754", color: "#fff" },
  manual: { bg: "#6f42c1", color: "#fff" },
};

function TipoBadge({ f }: { f: FacturaCliente }) {
  // Una factura "corregida" reproduce el badge de su tipo de origen en vez
  // de tener uno propio — así se ve en el original (tipoBadge()).
  const tipoEfectivo: TipoFactura = f.tipo === "corregida" ? (f.tipoOriginal === "revision" ? "revision" : "reparacion") : f.tipo;
  const estilo = TIPO_BADGE_ESTILO[tipoEfectivo] ?? { bg: "#e9ecef", color: "#6c757d" };
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap" style={{ backgroundColor: estilo.bg, color: estilo.color }}>
      {f.tipo === "recogida" && <Box className="size-3" />}
      {ETIQUETA_TIPO_FACTURA[tipoEfectivo]}
    </span>
  );
}

function SerieBadge({ numero }: { numero: string }) {
  const s = serieFactura(numero);
  if (s === "1") return <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: "#0d6efd" }}>Serie 1</span>;
  if (s === "3") return <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: "#ffc107", color: "#332701" }}>Serie 3</span>;
  return <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: "#6c757d" }}>—</span>;
}

const ESTADO_ESTILO: Record<string, { bg: string; color: string; dot: string }> = {
  Cobrada: { bg: "rgba(25,135,84,.13)", color: "#146c43", dot: "#198754" },
  Pendiente: { bg: "rgba(108,117,125,.1)", color: "#5a6268", dot: "" },
  Anulada: { bg: "rgba(220,53,69,.11)", color: "#842029", dot: "#dc3545" },
  "Devolución": { bg: "rgba(25,135,84,.13)", color: "#146c43", dot: "#198754" },
};

function EstadoBadge({ f, onClick }: { f: FacturaCliente; onClick?: () => void }) {
  const estado = estadoFacturaDerivado(f);
  const estilo = ESTADO_ESTILO[estado] ?? ESTADO_ESTILO.Pendiente;
  const clicable = !!onClick && estado === "Pendiente";
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", clicable && "cursor-pointer")}
      style={{ backgroundColor: estilo.bg, color: estilo.color }}
      onClick={clicable ? onClick : undefined}
      title={clicable ? "Pendiente — clic para marcar como Cobrada" : estado}
    >
      {estado}
      <span
        className="inline-block size-2 rounded-[2px]"
        style={estado === "Pendiente" ? { border: "1.5px solid #6c757d" } : { backgroundColor: estilo.dot }}
      />
    </span>
  );
}

function FacturaBadge({ f }: { f: FacturaCliente }) {
  const contenido = (
    <>
      <Receipt className="size-3.5" /> {f.numero} {f.url && <ExportSquare className="size-2.5" />}
    </>
  );
  const clase = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white";
  if (f.url) {
    return (
      <a href={f.url} target="_blank" rel="noopener noreferrer" className={cn(clase, "hover:opacity-90")} style={{ backgroundColor: "#198754" }}>
        {contenido}
      </a>
    );
  }
  return (
    <span className={clase} style={{ backgroundColor: "#198754" }}>
      {contenido}
    </span>
  );
}

function ResguardoCell({ f }: { f: FacturaCliente }) {
  const router = useRouter();
  if (f.esAlquiler) return <span className="font-bold" style={{ color: "#198754" }}>{f.resguardo || "—"}</span>;
  if (f.esManual) return <span className="font-bold" style={{ color: "#6f42c1" }}>{f.resguardo || "—"}</span>;
  const cerrada = f.estadoEntrega === "ENTREGADO" || f.estadoEntrega === "ENVIO" || f.estadoEntrega === "RECICLAJE";
  return (
    <button
      type="button"
      className="font-bold text-primary underline-offset-2 hover:underline"
      onClick={() => router.push(`/${cerrada ? "historial" : "reparaciones"}?resguardo=${encodeURIComponent(f.resguardo)}`)}
    >
      {f.resguardo || "—"}
    </button>
  );
}

function VerBoton({ f }: { f: FacturaCliente }) {
  const router = useRouter();
  if (f.esManual) return <span className="mr-1 inline-block size-7" />;
  if (f.esAlquiler) {
    return (
      <Button variant="outline" size="icon-sm" className="mr-1" title="Ver alquiler" onClick={() => router.push("/equipos")}>
        <Bank className="size-3.5" />
      </Button>
    );
  }
  const cerrada = f.estadoEntrega === "ENTREGADO" || f.estadoEntrega === "ENVIO" || f.estadoEntrega === "RECICLAJE";
  return (
    <Button
      variant="outline"
      size="icon-sm"
      className="mr-1"
      title="Ver reparación"
      onClick={() => router.push(`/${cerrada ? "historial" : "reparaciones"}?resguardo=${encodeURIComponent(f.resguardo)}`)}
    >
      <Eye className="size-3.5" />
    </Button>
  );
}

export default function FacturasClientesPage() {
  const confirmar = useConfirm();

  const [facturas, setFacturas] = useState<FacturaCliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtroSerie, setFiltroSerie] = useState<"todas" | "1" | "3" | "alquiler">("todas");
  const [estPend, setEstPend] = useState(true);
  const [estCobr, setEstCobr] = useState(true);
  const [estAnul, setEstAnul] = useState(true);
  const [estDevol, setEstDevol] = useState(true);
  const [filtroBanco, setFiltroBanco] = useState("");
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>("todas");
  const [busqueda, setBusqueda] = useState("");
  const [filtrosColumna, setFiltrosColumna] = useState<Partial<Record<ColumnaFiltrable, Set<string>>>>({});

  const [pagina, setPagina] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(15);

  const [facturaAcciones, setFacturaAcciones] = useState<FacturaCliente | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/facturas-clientes");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setFacturas(data.facturas as FacturaCliente[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function actualizar() {
    setBusqueda("");
    setFiltrosColumna({});
    cargar();
  }

  // ── Filtrado (reproduce _fcListaFiltrada) ───────────────────────────────
  const filtroEstadosActivo = !(estPend && estCobr && estAnul && estDevol);

  function aplicarFiltrosBase(lista: FacturaCliente[]): FacturaCliente[] {
    let out = lista;
    if (filtroSerie === "alquiler") {
      out = out.filter((f) => f.esAlquiler);
    } else if (filtroSerie !== "todas") {
      out = out.filter((f) => serieFactura(f.numero) === filtroSerie && f.tipo !== "alquiler" && f.tipo !== "recogida");
    }
    if (filtroEstadosActivo) {
      out = out.filter((f) => {
        const est = (f.estadoFactura || "").trim();
        if (f.tipo === "rectificativa") return est === "Devolución" ? estDevol : estAnul;
        if (est === "Anulada") return estAnul;
        if (est === "Devolución") return estDevol;
        const esCobrada = est === "Cobrada" || (!est && !!(f.formaPago && f.formaPago.trim()));
        return esCobrada ? estCobr : estPend;
      });
    }
    out = out.filter((f) => dentroDeRango(f.fecha, filtroFecha));
    if (filtroBanco) out = out.filter((f) => (f.banco || "").trim() === filtroBanco);
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      out = out.filter(
        (f) =>
          f.resguardo.toLowerCase().includes(q) ||
          f.numero.toLowerCase().includes(q) ||
          f.cliente.toLowerCase().includes(q) ||
          f.email.toLowerCase().includes(q) ||
          f.dniCif.toLowerCase().includes(q)
      );
    }
    return out;
  }

  function aplicarFiltrosColumna(lista: FacturaCliente[], excluir?: ColumnaFiltrable): FacturaCliente[] {
    let out = lista;
    for (const col of COLUMNAS_FILTRABLES) {
      if (col === excluir) continue;
      const seleccion = filtrosColumna[col];
      if (!seleccion || !seleccion.size) continue;
      out = out.filter((f) => seleccion.has(valorColumna(f, col)));
    }
    return out;
  }

  const listaBase = useMemo(
    () => aplicarFiltrosBase(facturas),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [facturas, filtroSerie, estPend, estCobr, estAnul, estDevol, filtroFecha, filtroBanco, busqueda]
  );

  const listaFiltrada = useMemo(() => {
    const out = aplicarFiltrosColumna(listaBase, undefined);
    return [...out].sort((a, b) => {
      const na = parseInt(a.numero.replace(/\D/g, "") || "0", 10);
      const nb = parseInt(b.numero.replace(/\D/g, "") || "0", 10);
      return nb - na;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listaBase, filtrosColumna]);

  const sumaTotal = useMemo(() => listaFiltrada.reduce((acc, f) => acc + montoConIva(f), 0), [listaFiltrada]);

  const totalPaginas = filasPorPagina > 0 ? Math.max(1, Math.ceil(listaFiltrada.length / filasPorPagina)) : 1;
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicio = filasPorPagina > 0 ? (paginaSegura - 1) * filasPorPagina : 0;
  const fin = filasPorPagina > 0 ? Math.min(inicio + filasPorPagina, listaFiltrada.length) : listaFiltrada.length;
  const paginaActual = listaFiltrada.slice(inicio, fin);

  function opcionesColumna(col: ColumnaFiltrable): string[] {
    const base = aplicarFiltrosColumna(listaBase, col);
    const vistos = new Set<string>();
    const vals: string[] = [];
    for (const f of base) {
      const v = valorColumna(f, col);
      if (!vistos.has(v)) {
        vistos.add(v);
        vals.push(v);
      }
    }
    vals.sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
    return vals;
  }

  function aplicarFiltroColumna(col: ColumnaFiltrable, seleccion: Set<string> | null) {
    setFiltrosColumna((prev) => {
      const siguiente = { ...prev };
      if (seleccion === null) delete siguiente[col];
      else siguiente[col] = seleccion;
      return siguiente;
    });
    setPagina(1);
  }

  async function marcarComoCobrada(f: FacturaCliente) {
    const ok = await confirmar(`¿Confirma que la factura ${f.numero} ha sido cobrada?`);
    if (!ok) return;
    try {
      const res = await fetch("/api/facturas-clientes/marcar-cobrada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resguardo: f.resguardo, tipo: f.tipo }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Factura marcada como Cobrada");
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  const filtroFechaEsRapido = /^(todas|hoy|semana|mes)$/.test(filtroFecha);

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Receipt className="size-5 text-primary" />
          <h1 className="text-lg font-semibold">Facturas de Clientes</h1>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={actualizar}>
          <Refresh2 className={cn("size-4", cargando && "animate-spin")} /> Actualizar
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar facturas: {error}
        </div>
      )}

      {/* ── Barra de filtros (antes en un panel lateral) ── */}
      <div className="mb-4 space-y-3 rounded-lg border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative">
            <SearchNormal1 className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, email o DNI / NIE / CIF…"
              className="w-64 pl-7"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPagina(1);
              }}
            />
          </div>

          <div>
            <p className="mb-1 text-[.7rem] font-bold tracking-wider text-muted-foreground uppercase">Series</p>
            <Select
              value={filtroSerie}
              onValueChange={(v) => {
                setFiltroSerie(v as typeof filtroSerie);
                setPagina(1);
              }}
            >
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue>
                  {(v: string) => (v === "1" ? "Serie 1 — Cobros" : v === "3" ? "Serie 3 — Rectificativas" : v === "alquiler" ? "Alquiler" : "Todas")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="1">Serie 1 — Cobros</SelectItem>
                <SelectItem value="3">Serie 3 — Rectificativas</SelectItem>
                <SelectItem value="alquiler">Alquiler</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="mb-1 text-[.7rem] font-bold tracking-wider text-muted-foreground uppercase">Ref / Banco</p>
            <Select
              value={filtroBanco || "__todos__"}
              onValueChange={(v) => {
                setFiltroBanco(!v || v === "__todos__" ? "" : v);
                setPagina(1);
              }}
            >
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue>{(v: string) => (v === "__todos__" ? "Todos" : v)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__todos__">Todos</SelectItem>
                {BANCOS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="mb-1 text-[.7rem] font-bold tracking-wider text-muted-foreground uppercase">Estados</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["Pendientes", estPend, setEstPend, ESTADO_ESTILO.Pendiente],
                  ["Cobradas", estCobr, setEstCobr, ESTADO_ESTILO.Cobrada],
                  ["Anuladas", estAnul, setEstAnul, ESTADO_ESTILO.Anulada],
                  ["Devoluciones", estDevol, setEstDevol, ESTADO_ESTILO["Devolución"]],
                ] as const
              ).map(([label, valor, setValor, estilo]) => (
                <label key={label} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={valor}
                    onCheckedChange={(c) => {
                      setValor(c === true);
                      setPagina(1);
                    }}
                  />
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: estilo.bg, color: estilo.color }}
                  >
                    {label}
                    <span className="inline-block size-2 rounded-[2px]" style={estilo.dot ? { backgroundColor: estilo.dot } : { border: "1.5px solid #6c757d" }} />
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Fecha: rápidos + meses + trimestres, todo en una sola fila (antes
            "Recientes" en el panel lateral + la franja de meses/trimestres
            pegada al lateral de la tabla). */}
        <div className="flex flex-wrap items-center gap-1 border-t pt-3">
          {[
            ["todas", "Todas"],
            ["hoy", "Hoy"],
            ["semana", "Última semana"],
            ["mes", "Último mes"],
          ].map(([v, label]) => (
            <button
              key={v}
              type="button"
              className={cn(
                "rounded-md border px-2 py-1 text-xs font-medium",
                filtroFechaEsRapido && filtroFecha === v ? "border-transparent bg-primary text-primary-foreground" : "border-input hover:bg-muted"
              )}
              onClick={() => {
                setFiltroFecha(v as FiltroFecha);
                setPagina(1);
              }}
            >
              {label}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-border" />
          {MESES.map((label, i) => (
            <button
              key={label}
              type="button"
              className={cn(
                "rounded-md border px-2 py-1 text-xs font-medium",
                filtroFecha === `mes${i + 1}` ? "border-transparent bg-primary text-primary-foreground" : "border-input hover:bg-muted"
              )}
              onClick={() => {
                setFiltroFecha(`mes${i + 1}`);
                setPagina(1);
              }}
            >
              {label}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-border" />
          {[1, 2, 3, 4].map((t) => (
            <button
              key={t}
              type="button"
              className={cn(
                "rounded-md border px-2 py-1 text-xs font-medium",
                filtroFecha === `trim${t}` ? "border-transparent bg-primary text-primary-foreground" : "border-input hover:bg-muted"
              )}
              onClick={() => {
                setFiltroFecha(`trim${t}`);
                setPagina(1);
              }}
            >
              {t}T
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenido principal ── */}
      <div className="min-w-0 space-y-3">
            <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-sky-50 dark:bg-sky-950/40">
                      {(
                        [
                          ["resguardo", "Resguardo"],
                          ["numero", "Nº Factura"],
                          ["serie", "Serie"],
                          ["cliente", "Cliente"],
                          ["equipo", "Equipo"],
                          ["fecha", "Fecha"],
                        ] as [ColumnaFiltrable, string][]
                      ).map(([col, label]) => (
                        <TableHead key={col} className="text-[.78rem] tracking-wide uppercase">
                          <span className="inline-flex items-center">
                            {label}
                            <ColumnaFiltro opciones={opcionesColumna(col)} seleccion={filtrosColumna[col] ?? null} onAplicar={(s) => aplicarFiltroColumna(col, s)} />
                          </span>
                        </TableHead>
                      ))}
                      <TableHead className="text-[.78rem] tracking-wide uppercase">Estado</TableHead>
                      <TableHead className="text-right text-[.78rem] tracking-wide uppercase">
                        <span className="inline-flex items-center">
                          Total
                          <ColumnaFiltro opciones={opcionesColumna("total")} seleccion={filtrosColumna.total ?? null} onAplicar={(s) => aplicarFiltroColumna("total", s)} />
                        </span>
                      </TableHead>
                      <TableHead className="text-[.78rem] tracking-wide uppercase">
                        <span className="inline-flex items-center">
                          Tipo
                          <ColumnaFiltro opciones={opcionesColumna("tipo")} seleccion={filtrosColumna.tipo ?? null} onAplicar={(s) => aplicarFiltroColumna("tipo", s)} />
                        </span>
                      </TableHead>
                      <TableHead className="text-[.78rem] tracking-wide uppercase">
                        <span className="inline-flex items-center">
                          Forma de pago
                          <ColumnaFiltro opciones={opcionesColumna("formaPago")} seleccion={filtrosColumna.formaPago ?? null} onAplicar={(s) => aplicarFiltroColumna("formaPago", s)} />
                        </span>
                      </TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cargando &&
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 11 }).map((__, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}

                    {!cargando && paginaActual.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                          Sin resultados
                        </TableCell>
                      </TableRow>
                    )}

                    {!cargando &&
                      paginaActual.map((f, i) => (
                        <TableRow key={`${f.resguardo}-${f.numero}-${f.tipo}-${i}`}>
                          <TableCell>
                            <ResguardoCell f={f} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <FacturaBadge f={f} />
                              {f.historica && (
                                <span
                                  className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                                  title="Este número se generó de verdad, pero quedó sustituido por un ciclo de rectificativa/corregida posterior. El importe solo consta en el PDF."
                                >
                                  Sustituida
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <SerieBadge numero={f.numero} />
                          </TableCell>
                          <TableCell className="text-sm">{f.cliente || "—"}</TableCell>
                          <TableCell className="max-w-40 truncate text-sm text-muted-foreground">{f.equipo || "—"}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{formatearFecha(f.fecha)}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <EstadoBadge f={f} onClick={tipoPermiteMarcarCobrada(f.tipo) ? () => marcarComoCobrada(f) : undefined} />
                          </TableCell>
                          <TableCell className={cn("text-right text-sm font-semibold tabular-nums", montoConIva(f) < 0 && "text-destructive")}>
                            {montoConIva(f) ? euros(montoConIva(f)) : <span className="font-normal text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            <TipoBadge f={f} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formaPagoLabel(f)}</TableCell>
                          <TableCell className="text-nowrap">
                            <VerBoton f={f} />
                            {!f.historica && (
                              <Button variant="outline" size="icon-sm" title="Detalle de factura" onClick={() => setFacturaAcciones(f)}>
                                <DocumentText className="size-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  {listaFiltrada.length} factura{listaFiltrada.length !== 1 ? "s" : ""} ·{" "}
                  <span className="text-foreground">{euros(sumaTotal)}</span>
                </span>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Filas por página:</span>
                    <Select
                      value={String(filasPorPagina)}
                      onValueChange={(v) => {
                        if (!v) return;
                        setFilasPorPagina(parseInt(v, 10));
                        setPagina(1);
                      }}
                    >
                      <SelectTrigger className="h-7 w-20 text-xs">
                        <SelectValue>{(v: string) => (v === "0" ? "Todas" : v)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {["15", "25", "50", "100", "0"].map((v) => (
                          <SelectItem key={v} value={v}>
                            {v === "0" ? "Todas" : v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon-sm" disabled={filasPorPagina === 0 || paginaSegura <= 1} onClick={() => setPagina(1)}>
                      <ArrowLeft3 className="size-3.5" />
                    </Button>
                    <Button variant="outline" size="icon-sm" disabled={filasPorPagina === 0 || paginaSegura <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
                      <ArrowLeft2 className="size-3.5" />
                    </Button>
                    <span className="px-1 text-xs whitespace-nowrap text-muted-foreground">
                      {listaFiltrada.length === 0
                        ? ""
                        : filasPorPagina === 0 || totalPaginas <= 1
                          ? `Mostrando ${listaFiltrada.length}`
                          : `Página ${paginaSegura} de ${totalPaginas} (${inicio + 1}–${fin})`}
                    </span>
                    <Button variant="outline" size="icon-sm" disabled={filasPorPagina === 0 || paginaSegura >= totalPaginas} onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}>
                      <ArrowRight2 className="size-3.5" />
                    </Button>
                    <Button variant="outline" size="icon-sm" disabled={filasPorPagina === 0 || paginaSegura >= totalPaginas} onClick={() => setPagina(totalPaginas)}>
                      <ArrowRight3 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
      </div>

      <DetalleFacturaDialog factura={facturaAcciones} onOpenChange={(o) => !o && setFacturaAcciones(null)} onCobrada={cargar} />
    </div>
  );
}
