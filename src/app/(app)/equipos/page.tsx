"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Equipo, EstadoEquipo } from "@/lib/equipos";
import { NuevoEquipoDialog } from "./nuevo-equipo-dialog";
import { NuevoAlquilerDialog } from "./alquiler-dialogs";
import { DevolverAlquilerDialog } from "./devolver-alquiler-dialog";
import { AlquilerDetalleDialog } from "./alquiler-detalle-dialog";

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

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [alquilerAbierto, setAlquilerAbierto] = useState<Equipo | null>(null);
  const [devolverAbierto, setDevolverAbierto] = useState<Equipo | null>(null);
  const [detalleAbierto, setDetalleAbierto] = useState<Equipo | null>(null);
  const [confirmarAccion, setConfirmarAccion] = useState<{ equipo: Equipo; estado: EstadoEquipo } | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/equipos");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setEquipos(data.equipos as Equipo[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

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
            placeholder="Buscar por marca, modelo, serie, cliente..."
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
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!cargando && filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No se encontraron equipos
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              filtrados.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <div className="font-medium">{e.marca} {e.modelo}</div>
                    <div className="text-xs text-muted-foreground">{e.id}</div>
                  </TableCell>
                  <TableCell className="text-sm">{e.serie || "-"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${COLOR_ESTADO[e.estado] || ""}`}>
                      {ETIQUETAS_ESTADO[e.estado] ?? e.estado}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {e.clienteActual ? (
                      <button
                        type="button"
                        className="text-left hover:underline"
                        onClick={() => setDetalleAbierto(e)}
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
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
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
                            <DropdownMenuItem onClick={() => pedirConfirmacion(e, "VENDIDO")}>
                              <Wallet className="size-3.5" />
                              Marcar como vendido
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => pedirConfirmacion(e, "FUERA_SERVICIO")}>
                              <BoxRemove className="size-3.5" />
                              Dar de baja
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
