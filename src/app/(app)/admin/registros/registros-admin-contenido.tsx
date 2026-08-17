"use client";

import { useEffect, useState } from "react";
import { Trash, SearchNormal1, Eye, Warning2, Refresh2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ENTIDADES_ADMIN, etiquetaColumna, formatearValorCelda } from "@/lib/admin-registros";

type Fila = Record<string, unknown>;

/**
 * Reproduce, con permiso de administrador, lo que antes se hacía a mano
 * en las pestañas azules del Sheet original: revisar la fila completa de
 * un registro (todas las columnas) y borrarlo si era de prueba. Antes
 * solo lo podía hacer quien tuviera acceso de administrador al propio
 * Sheet — aquí, solo las cuentas superadmin del dashboard.
 */
export function RegistrosAdminContenido() {
  const [tabla, setTabla] = useState(ENTIDADES_ADMIN[0].tabla);
  const entidad = ENTIDADES_ADMIN.find((e) => e.tabla === tabla) || ENTIDADES_ADMIN[0];

  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [filaSeleccionada, setFilaSeleccionada] = useState<Fila | null>(null);
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const [detalleCompleto, setDetalleCompleto] = useState<Fila | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [eliminando, setEliminando] = useState(false);

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/registros/${entidad.tabla}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setFilas(data.rows || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    setBusqueda("");
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabla]);

  const filasFiltradas = filas.filter((f) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return Object.values(f).some((v) => v !== null && v !== undefined && String(v).toLowerCase().includes(q));
  });

  async function abrirDetalle(fila: Fila) {
    setFilaSeleccionada(fila);
    setMotivo("");
    setDetalleAbierto(true);
    setCargandoDetalle(true);
    setDetalleCompleto(null);
    try {
      const id = String(fila[entidad.pk]);
      const res = await fetch(`/api/admin/registros/${entidad.tabla}/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setDetalleCompleto(data.row);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cargar el detalle");
    } finally {
      setCargandoDetalle(false);
    }
  }

  async function eliminar() {
    if (!filaSeleccionada) return;
    if (!motivo.trim()) return toast.error("El motivo es obligatorio");
    setEliminando(true);
    try {
      const id = String(filaSeleccionada[entidad.pk]);
      const res = await fetch(entidad.apiRutaDelete(id), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Registro eliminado de ${entidad.label}`);
      setDetalleAbierto(false);
      setFilaSeleccionada(null);
      setDetalleCompleto(null);
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-md bg-destructive/10 text-destructive">
          <Trash className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold">Eliminar Registros</h1>
          <p className="text-sm text-muted-foreground">Borrado real y auditado — solo cuentas de administrador. Revisa la fila completa antes de borrar.</p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-400">
        <Warning2 className="mt-0.5 size-3.5 shrink-0" />
        <span>Esta acción borra el registro de verdad de la base de datos — no hay papelera. Cada borrado queda registrado (quién, cuándo y por qué) en <code>registros_eliminados</code>.</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64 space-y-1">
          <Label className="text-xs text-muted-foreground">Tabla</Label>
          <Select value={tabla} onValueChange={(v) => setTabla(v || ENTIDADES_ADMIN[0].tabla)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ENTIDADES_ADMIN.map((e) => (
                <SelectItem key={e.tabla} value={e.tabla}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-56 flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">Buscar</Label>
          <div className="relative">
            <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar en cualquier columna..." className="pl-8" />
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={cargar} disabled={cargando} className="mt-5" title="Actualizar">
          <Refresh2 className={cargando ? "size-4 animate-spin" : "size-4"} />
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar: {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              {entidad.columnasLista.map((col) => (
                <th key={col} className="whitespace-nowrap px-3 py-2 text-left font-medium">{etiquetaColumna(col)}</th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={entidad.columnasLista.length + 1} className="py-8 text-center text-muted-foreground">Cargando…</td></tr>
            ) : filasFiltradas.length === 0 ? (
              <tr><td colSpan={entidad.columnasLista.length + 1} className="py-8 text-center text-muted-foreground">Sin resultados</td></tr>
            ) : (
              filasFiltradas.map((fila, i) => (
                <tr key={i} className="cursor-pointer border-t hover:bg-muted/40" onClick={() => abrirDetalle(fila)}>
                  {entidad.columnasLista.map((col) => (
                    <td key={col} className="max-w-64 truncate whitespace-nowrap px-3 py-2">{formatearValorCelda(fila[col])}</td>
                  ))}
                  <td className="px-2 text-right">
                    <Button size="icon-sm" variant="ghost" title="Ver todo y eliminar" onClick={(e) => { e.stopPropagation(); abrirDetalle(fila); }}>
                      <Eye className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{filasFiltradas.length} de {filas.length} filas mostradas (máx. 200 por tabla).</p>

      <Dialog open={detalleAbierto} onOpenChange={(o) => { if (!eliminando) setDetalleAbierto(o); }}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="size-4.5 text-primary" /> {entidad.label} — vista completa antes de eliminar
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {cargandoDetalle ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p>
            ) : detalleCompleto ? (
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(detalleCompleto).map(([col, valor]) => (
                    <tr key={col} className="border-t align-top">
                      <td className="w-40 shrink-0 py-1.5 pr-3 text-xs font-medium text-muted-foreground">{etiquetaColumna(col)}</td>
                      <td className="py-1.5 whitespace-pre-wrap break-words">{formatearValorCelda(valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="py-8 text-center text-sm text-destructive">No se pudo cargar el detalle.</p>
            )}
          </div>
          {detalleCompleto && (
            <div className="space-y-2 border-t pt-3">
              <Label htmlFor="motivoEliminar" className="text-xs">Motivo del borrado *</Label>
              <Textarea id="motivoEliminar" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: registro de prueba, duplicado, dato incorrecto…" />
              <Button variant="destructive" className="w-full gap-1.5" onClick={eliminar} disabled={eliminando || !motivo.trim()}>
                <Trash className="size-4" /> {eliminando ? "Eliminando…" : "Eliminar definitivamente"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
