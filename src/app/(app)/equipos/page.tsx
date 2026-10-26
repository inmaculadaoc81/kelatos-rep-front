"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Refresh2,
  Category2,
  TickCircle,
  TimerStart,
  Setting2,
  SearchNormal1,
  Eye,
  MoreCircle,
  Wallet,
  BoxRemove,
  Warning2,
  ScanBarcode,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-provider";
import { Equipo, EstadoEquipo } from "@/lib/equipos";
import { codigoBarrasEquipo, imprimirEtiquetaEquipo, numeroDeEquipo } from "@/lib/imprimir-etiqueta";
import { NuevoEquipoDialog } from "./nuevo-equipo-dialog";
import { NuevoAlquilerDialog } from "./alquiler-dialogs";
import { VenderEquipoDialog } from "./vender-equipo-dialog";
import { NuevaFacturaManualDialog } from "../reparaciones/nueva-factura-manual-dialog";
import { DevolverAlquilerDialog } from "./devolver-alquiler-dialog";
import { AlquilerDetalleDialog } from "./alquiler-detalle-dialog";
import { EquipoDetalleDialog } from "./equipo-detalle-dialog";

const ETIQUETAS_ESTADO: Record<string, string> = {
  DISPONIBLE: "Disponible",
  ALQUILADO: "Alquilado",
  MANTENIMIENTO: "Mantenimiento",
  FUERA_SERVICIO: "Fuera de servicio",
  VENDIDO: "Vendido",
};

const COLOR_ESTADO: Record<string, string> = {
  DISPONIBLE: "bg-green-500/10 text-green-600",
  ALQUILADO: "bg-amber-500/10 text-amber-600",
  MANTENIMIENTO: "bg-red-500/10 text-red-600",
  FUERA_SERVICIO: "bg-muted text-muted-foreground",
  VENDIDO: "bg-slate-500/10 text-slate-600",
};

const TEXTOS_CONFIRMACION: Record<EstadoEquipo, { titulo: string; boton: string; descripcion: string }> = {
  DISPONIBLE: {
    titulo: "Marcar como disponible",
    boton: "Marcar disponible",
    descripcion: "quedará disponible para alquilar de inmediato.",
  },
  MANTENIMIENTO: {
    titulo: "Enviar a mantenimiento",
    boton: "A mantenimiento",
    descripcion: "dejará de estar disponible para alquilar hasta que lo marques disponible de nuevo.",
  },
  VENDIDO: {
    titulo: "Marcar equipo como vendido",
    boton: "Vender",
    descripcion: "dejará de aparecer como disponible para alquilar. Esta acción no tiene un botón para deshacerla desde aquí.",
  },
  FUERA_SERVICIO: {
    titulo: "Dar de baja el equipo",
    boton: "Dar de baja",
    descripcion: "dejará de aparecer como disponible para alquilar hasta que lo reactives.",
  },
  ALQUILADO: { titulo: "", boton: "", descripcion: "" }, // no se usa: ALQUILADO se gestiona con Alquilar/Devolver, no con este diálogo
};

/** useSearchParams() exige un <Suspense> alrededor. El escáner global manda aquí con ?equipo=N (número del equipo, p. ej. 36 = EQ-0036). */
function AbrirEquipoPorQuery({ onAbrir }: { onAbrir: (numero: number) => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const n = Number(searchParams.get("equipo"));
    if (Number.isInteger(n) && n > 0) {
      onAbrir(n);
      router.replace("/equipos");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [alquilerAbierto, setAlquilerAbierto] = useState<Equipo | null>(null);
  const [devolverAbierto, setDevolverAbierto] = useState<Equipo | null>(null);
  const [detalleAbierto, setDetalleAbierto] = useState<Equipo | null>(null);
  // Ficha del equipo (se abre al pulsar la fila); se guarda el id para que se refresque con la lista.
  const [fichaId, setFichaId] = useState<string | null>(null);
  const [puedeEditarTarifas, setPuedeEditarTarifas] = useState(false);
  const [confirmarAccion, setConfirmarAccion] = useState<{ equipo: Equipo; estado: EstadoEquipo } | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  // Número de equipo escaneado mientras la lista aún cargaba.
  const pendienteRef = useRef<number | null>(null);
  const confirmar = useConfirm();
  const [imprimiendo, setImprimiendo] = useState<string | null>(null);
  // Venta: el equipo que se está vendiendo y si se factura aquí mismo (factura manual con el equipo precargado).
  const [vendiendo, setVendiendo] = useState<{ equipo: Equipo; soloFactura: boolean } | null>(null);
  const [facturandoVenta, setFacturandoVenta] = useState<Equipo | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/equipos");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setEquipos(data.equipos as Equipo[]);
      if (pendienteRef.current !== null) {
        abrirEscaneado(pendienteRef.current, data.equipos as Equipo[]);
        pendienteRef.current = null;
      }
      setPuedeEditarTarifas(data.puedeEditarTarifas === true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Abre la acción del equipo escaneado según su estado; si la lista aún no ha cargado, queda pendiente hasta que cargue. */
  function abrirEscaneado(numero: number, lista: Equipo[]) {
    const e = lista.find((x) => numeroDeEquipo(x.id) === numero);
    if (!e) toast.error(`No existe ningún equipo con el código escaneado (EQ-${numero})`);
    else if (e.estado === "DISPONIBLE") setAlquilerAbierto(e);
    else if (e.estado === "ALQUILADO") setDevolverAbierto(e);
    else setFichaId(e.id);
  }

  function alEscanear(numero: number) {
    if (cargando) pendienteRef.current = numero;
    else abrirEscaneado(numero, equipos);
  }

  async function imprimirEtiqueta(e: Equipo) {
    if (!codigoBarrasEquipo(e.id)) {
      toast.error(`El id ${e.id} no tiene la forma EQ-número, no se puede generar su código de barras`);
      return;
    }
    const ok0 = await confirmar(`¿Imprimir la etiqueta de ${e.marca} ${e.modelo} (${e.id})?`, {
      titulo: "Imprimir etiqueta",
      detalle: "Se mandará a la impresora conectada a este PC ahora mismo.",
    });
    if (!ok0) return;
    setImprimiendo(e.id);
    try {
      const ok = await imprimirEtiquetaEquipo(e.id, `${e.marca} ${e.modelo}`.trim());
      if (ok) toast.success(`Etiqueta de ${e.id} enviada a la impresora`);
      else toast.error("No se pudo imprimir — comprueba que el puente de impresión esté corriendo en este PC");
    } finally {
      setImprimiendo(null);
    }
  }

  const fichaEquipo = fichaId ? equipos.find((x) => x.id === fichaId) ?? null : null;

  const metricas = useMemo(
    () => ({
      total: equipos.length,
      disponibles: equipos.filter((e) => e.estado === "DISPONIBLE").length,
      alquilados: equipos.filter((e) => e.estado === "ALQUILADO").length,
      mantenimiento: equipos.filter((e) => e.estado === "MANTENIMIENTO").length,
    }),
    [equipos]
  );

  const filtrados = useMemo(() => {
    let lista = equipos;
    if (filtroEstado) lista = lista.filter((e) => e.estado === filtroEstado);
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      lista = lista.filter(
        (e) =>
          e.marca.toLowerCase().includes(q) ||
          e.modelo.toLowerCase().includes(q) ||
          e.serie.toLowerCase().includes(q) ||
          (e.facturaVenta ?? "").toLowerCase().includes(q) ||
          (e.comprador ?? "").toLowerCase().includes(q) ||
          e.clienteActual?.nombre.toLowerCase().includes(q) ||
          e.clienteActual?.telefono.includes(q)
      );
    }
    return lista;
  }, [equipos, busqueda, filtroEstado]);

  async function cambiarEstado(equipo: Equipo, nuevoEstado: EstadoEquipo) {
    try {
      const res = await fetch(`/api/equipos/${equipo.id}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nuevoEstado }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Equipo ${equipo.id} → ${ETIQUETAS_ESTADO[nuevoEstado] ?? nuevoEstado}`);
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  function pedirConfirmacion(equipo: Equipo, estado: EstadoEquipo) {
    setConfirmado(false);
    setConfirmarAccion({ equipo, estado });
  }

  async function confirmarCambioEstado() {
    if (!confirmarAccion || !confirmado) return;
    setConfirmando(true);
    try {
      await cambiarEstado(confirmarAccion.equipo, confirmarAccion.estado);
      setConfirmarAccion(null);
    } finally {
      setConfirmando(false);
    }
  }

  function estaVencido(e: Equipo): boolean {
    return e.estado === "ALQUILADO" && !!e.fechaFinPrevista && new Date(e.fechaFinPrevista) < new Date();
  }

  return (
    <div className="p-6">
      <Suspense fallback={null}>
        <AbrirEquipoPorQuery onAbrir={alEscanear} />
      </Suspense>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Equipos de Alquiler</h1>
          <p className="text-sm text-muted-foreground">Inventario y gestión de alquileres</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
          <NuevoEquipoDialog onCreado={cargar} />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button className="rounded-xl border bg-card p-4 text-left shadow-sm" onClick={() => setFiltroEstado("")}>
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{metricas.total}</p>
            </div>
            <Category2 className="size-8 text-muted-foreground/40" />
          </div>
        </button>
        <button className="rounded-xl border bg-card p-4 text-left shadow-sm" onClick={() => setFiltroEstado("DISPONIBLE")}>
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Disponibles</p>
              <p className="text-2xl font-bold text-green-600">{metricas.disponibles}</p>
            </div>
            <TickCircle className="size-8 text-green-600/40" />
          </div>
        </button>
        <button className="rounded-xl border bg-card p-4 text-left shadow-sm" onClick={() => setFiltroEstado("ALQUILADO")}>
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Alquilados</p>
              <p className="text-2xl font-bold text-amber-600">{metricas.alquilados}</p>
            </div>
            <TimerStart className="size-8 text-amber-600/40" />
          </div>
        </button>
        <button className="rounded-xl border bg-card p-4 text-left shadow-sm" onClick={() => setFiltroEstado("MANTENIMIENTO")}>
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Mantenimiento</p>
              <p className="text-2xl font-bold text-red-600">{metricas.mantenimiento}</p>
            </div>
            <Setting2 className="size-8 text-red-600/40" />
          </div>
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchNormal1 className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por marca, modelo, serie, cliente, factura..."
            className="w-72 pl-7"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <Select value={filtroEstado || "__todos__"} onValueChange={(v) => setFiltroEstado(!v || v === "__todos__" ? "" : v)}>
          <SelectTrigger className="w-48">
            <SelectValue>{(v: string) => ETIQUETAS_ESTADO[v] ?? "Todos los estados"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos los estados</SelectItem>
            <SelectItem value="DISPONIBLE">Disponible</SelectItem>
            <SelectItem value="ALQUILADO">Alquilado</SelectItem>
            <SelectItem value="MANTENIMIENTO">Mantenimiento</SelectItem>
            <SelectItem value="FUERA_SERVICIO">Fuera de servicio</SelectItem>
            <SelectItem value="VENDIDO">Vendido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar equipos: {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipo</TableHead>
              <TableHead>Serie</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Cliente actual</TableHead>
              <TableHead>Hasta</TableHead>
              <TableHead>Tarifas</TableHead>
              <TableHead>Venta</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!cargando && filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No se encontraron equipos
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              filtrados.map((e) => (
                <TableRow key={e.id} className="cursor-pointer" onClick={() => setFichaId(e.id)} title="Ver y editar la ficha del equipo">
                  <TableCell>
                    <div className="font-medium">{e.marca} {e.modelo}</div>
                    <div className="text-xs text-muted-foreground">{e.id}</div>
                  </TableCell>
                  <TableCell className="text-sm">{e.serie || "-"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${COLOR_ESTADO[e.estado] || ""}`}>
                      {ETIQUETAS_ESTADO[e.estado] ?? e.estado}
                    </span>
                    {e.estado === "VENDIDO" && (
                      <div className="mt-1 text-xs">
                        {e.facturaVenta ? (
                          <span className="font-medium text-foreground" title={[e.comprador, e.fechaVenta ? new Date(e.fechaVenta).toLocaleDateString("es-ES") : ""].filter(Boolean).join(" · ")}>Factura {e.facturaVenta}</span>
                        ) : (
                          <span className="text-amber-700">Sin factura registrada</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {e.clienteActual ? (
                      <button
                        type="button"
                        className="text-left hover:underline"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setDetalleAbierto(e);
                        }}
                        title="Ver detalle del alquiler"
                      >
                        <div className="font-medium text-primary">{e.clienteActual.nombre}</div>
                        <div className="text-xs text-muted-foreground">{e.clienteActual.telefono}</div>
                      </button>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {e.fechaFinPrevista ? (
                      <div className="flex items-center gap-1">
                        <span className={estaVencido(e) ? "font-medium text-destructive" : ""}>
                          {new Date(e.fechaFinPrevista).toLocaleDateString("es-ES")}
                        </span>
                        {estaVencido(e) && (
                          <span
                            className="flex items-center gap-0.5 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive"
                            title="La fecha de devolución prevista ya pasó"
                          >
                            <Warning2 className="size-3" />
                            Vencido
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {e.precioDia}€/d · {e.precioSemana}€/s · {e.precioMes}€/m
                  </TableCell>
                  <TableCell className="text-sm font-medium tabular-nums">
                    {e.precioVenta > 0 ? `${e.precioVenta.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : <span className="font-normal text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell onClick={(ev) => ev.stopPropagation()}>
                    <div className="flex flex-wrap items-center gap-1">
                      {e.estado !== "VENDIDO" && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="h-7 w-7"
                          disabled={imprimiendo === e.id}
                          onClick={() => imprimirEtiqueta(e)}
                          title="Imprimir etiqueta con código de barras para pegar en el equipo"
                        >
                          <ScanBarcode className="size-3.5" />
                        </Button>
                      )}
                      {e.estado === "DISPONIBLE" && (
                        <>
                          <Button size="sm" variant="outline" className="h-7" onClick={() => setAlquilerAbierto(e)}>
                            Alquilar
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => pedirConfirmacion(e, "MANTENIMIENTO")}>
                            A mantenimiento
                          </Button>
                        </>
                      )}
                      {e.estado === "ALQUILADO" && (
                        <>
                          <Button size="icon-sm" variant="ghost" className="h-7 w-7" onClick={() => setDetalleAbierto(e)} title="Ver detalle">
                            <Eye className="size-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-7" onClick={() => setDevolverAbierto(e)}>
                            Devolver
                          </Button>
                        </>
                      )}
                      {e.estado === "MANTENIMIENTO" && (
                        <Button size="sm" variant="outline" className="h-7" onClick={() => pedirConfirmacion(e, "DISPONIBLE")}>
                          Marcar disponible
                        </Button>
                      )}
                      {(e.estado === "DISPONIBLE" || e.estado === "MANTENIMIENTO") && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button size="icon-sm" variant="ghost" className="h-7 w-7" title="Más acciones">
                                <MoreCircle className="size-3.5" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setVendiendo({ equipo: e, soloFactura: false })}>
                              <Wallet className="size-3.5" />
                              Vender equipo
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => pedirConfirmacion(e, "FUERA_SERVICIO")}>
                              <BoxRemove className="size-3.5" />
                              Dar de baja
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      {e.estado === "VENDIDO" && (
                        <Button size="sm" variant="outline" className="h-7" onClick={() => setVendiendo({ equipo: e, soloFactura: true })}>
                          {e.facturaVenta ? "Cambiar factura" : "Añadir factura"}
                        </Button>
                      )}
                      {e.estado === "FUERA_SERVICIO" && (
                        <Button size="sm" variant="outline" className="h-7" onClick={() => pedirConfirmacion(e, "DISPONIBLE")}>
                          Reactivar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Badge variant="outline" className="mt-3">
        {filtrados.length} de {equipos.length} equipos
      </Badge>

      <NuevoAlquilerDialog
        equipo={alquilerAbierto}
        open={alquilerAbierto !== null}
        onOpenChange={(o) => !o && setAlquilerAbierto(null)}
        onCreado={cargar}
      />
      <DevolverAlquilerDialog
        equipo={devolverAbierto}
        open={devolverAbierto !== null}
        onOpenChange={(o) => !o && setDevolverAbierto(null)}
        onDevuelto={cargar}
      />
      <EquipoDetalleDialog
        equipo={fichaEquipo}
        puedeEditarTarifas={puedeEditarTarifas}
        open={fichaEquipo !== null}
        onOpenChange={(o) => !o && setFichaId(null)}
        onActualizado={cargar}
        onVerAlquiler={(x) => {
          setFichaId(null);
          setDetalleAbierto(x);
        }}
      />
      {vendiendo && (
        <VenderEquipoDialog
          equipo={vendiendo.equipo}
          soloFactura={vendiendo.soloFactura}
          onCerrar={() => setVendiendo(null)}
          onFacturar={() => { setFacturandoVenta(vendiendo.equipo); setVendiendo(null); }}
          onVendido={() => { setVendiendo(null); cargar(); }}
        />
      )}
      <NuevaFacturaManualDialog
        open={facturandoVenta !== null}
        onOpenChange={(o) => !o && setFacturandoVenta(null)}
        lineaInicial={facturandoVenta ? { referencia: facturandoVenta.id, descripcion: `Venta de equipo ${facturandoVenta.marca} ${facturandoVenta.modelo}${facturandoVenta.serie ? ` (S/N ${facturandoVenta.serie})` : ""} — ${facturandoVenta.id}`, precio: facturandoVenta.precioVenta } : undefined}
        onGenerada={async (r) => {
          const eq = facturandoVenta;
          if (!eq || !r) return;
          try {
            const d = await fetch(`/api/equipos/${encodeURIComponent(eq.id)}/vender`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ numeroFactura: r.numeroFactura, comprador: r.clienteNombre }),
            }).then((x) => x.json());
            if (!d.ok) throw new Error(d.error || "Error desconocido");
            toast.success(`${eq.id} vendido con la factura ${r.numeroFactura}`);
          } catch (err) {
            toast.error(`La factura ${r.numeroFactura} se generó, pero no se pudo vincular a ${eq.id}: ${err instanceof Error ? err.message : "error"}. Usa «Vender equipo → Ya tengo la factura».`);
          } finally {
            cargar();
          }
        }}
      />
      <AlquilerDetalleDialog
        equipo={detalleAbierto}
        open={detalleAbierto !== null}
        onOpenChange={(o) => !o && setDetalleAbierto(null)}
        onActualizado={cargar}
      />

      <Dialog open={confirmarAccion !== null} onOpenChange={(o) => !o && setConfirmarAccion(null)}>
        <DialogContent className="sm:max-w-sm">
          {confirmarAccion && (
            <>
              <DialogTitle>{TEXTOS_CONFIRMACION[confirmarAccion.estado].titulo}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {confirmarAccion.equipo.marca} {confirmarAccion.equipo.modelo}
                </span>{" "}
                ({confirmarAccion.equipo.id}) {TEXTOS_CONFIRMACION[confirmarAccion.estado].descripcion}
              </p>

              <label className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <Checkbox
                  checked={confirmado}
                  onCheckedChange={(v) => setConfirmado(v === true)}
                  className="mt-0.5"
                />
                Confirmo que quiero hacer este cambio en {confirmarAccion.equipo.id}
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setConfirmarAccion(null)} disabled={confirmando}>
                  Cancelar
                </Button>
                <Button
                  variant={confirmarAccion.estado === "VENDIDO" ? "default" : "outline"}
                  onClick={confirmarCambioEstado}
                  disabled={confirmando || !confirmado}
                >
                  {confirmando ? "Aplicando..." : TEXTOS_CONFIRMACION[confirmarAccion.estado].boton}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
