"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft2, MoneyRecive, Gallery, Bank, CloseCircle } from "@/lib/icons";
import { resolverBlobImagen, comprimirImagen } from "@/lib/foto-captura";
import { METODOS_TPV, MovimientoTpv, TpvFotoApi, TpvImporteApi } from "@/lib/tpv";
import { useConfirm } from "@/components/confirm-provider";

function euros(n: number): string {
  return (n || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

function etiquetaDia(dia: string): string {
  const txt = new Date(`${dia}T12:00:00Z`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function formatearHora(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hora = d.toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", hour12: false });
  return hora === "00:00" ? "—" : hora;
}

/** Lista compacta de los cobros/devoluciones que suman el total "Sistema"
    de un tipo de pago — solo para consultar, no edita nada. Petición del
    usuario, 2026-10-12: "que salga el modal con cada uno de los cobros,
    solo para ver el listado, no tan grande". */
function ListadoMovimientosDialog({ metodo, movimientos, onOpenChange }: { metodo: (typeof METODOS_TPV)[number] | null; movimientos: MovimientoTpv[]; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={!!metodo} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{metodo?.label}</DialogTitle>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-8">Hora</TableHead>
                <TableHead className="h-8">Cliente</TableHead>
                <TableHead className="h-8 text-right">Importe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimientos.length === 0 && (
                <TableRow><TableCell colSpan={3} className="py-4 text-center text-sm text-muted-foreground">Sin movimientos</TableCell></TableRow>
              )}
              {movimientos.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap text-xs">{formatearHora(m.fecha)}</TableCell>
                  <TableCell className="max-w-36 truncate text-xs" title={`${m.cliente || "-"} · ${m.concepto}${m.numero ? ` · ${m.numero}` : ""}`}>
                    {m.cliente || m.concepto || "-"}
                  </TableCell>
                  <TableCell className={`whitespace-nowrap text-right text-xs font-medium tabular-nums ${m.importe < 0 ? "text-red-600" : "text-foreground"}`}>
                    {euros(m.importe)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Desglose de un día — vista de página normal (no modal: petición del
 * usuario, 2026-10-12, "no tiene que ser un modal, tiene que ser una
 * vista"). KPI arriba (Vendido/Confirmado/Diferencia), una fila por CADA
 * tipo de pago (tarjeta, tarjeta virtual, bizum, transferencia, efectivo
 * — todos juntos, ver METODOS_TPV en lib/tpv.ts) con lo que calcula el
 * sistema y una celda para confirmar lo que dice el banco, y una columna
 * de la derecha con el total CONFIRMADO acumulado fila a fila (misma
 * mecánica que la columna "Saldo" de Efectivo) terminando en una fila
 * "Total" al final.
 */
export function DiaDetalleVista({
  dia,
  segunSistemaDia,
  movimientosDia,
  importesDia,
  fotosDia,
  onVolver,
  onCambiado,
}: {
  dia: string;
  segunSistemaDia: Record<string, number>;
  movimientosDia: MovimientoTpv[];
  importesDia: TpvImporteApi[];
  fotosDia: TpvFotoApi[];
  onVolver: () => void;
  onCambiado: () => void;
}) {
  const [declarado, setDeclarado] = useState<Record<string, { importe: number; notas: string }>>({});
  const [guardando, setGuardando] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement | null>(null);
  const [metodoListado, setMetodoListado] = useState<(typeof METODOS_TPV)[number] | null>(null);
  const [eliminandoFoto, setEliminandoFoto] = useState<number | string | null>(null);
  // Quitar una fila de la vista — no borra ni cambia ningún dato, solo
  // deja de mostrarse en este repaso (no se recuerda al salir y volver
  // a entrar). Petición del usuario, 2026-10-12: "opción de eliminar
  // fila que solo quitará de la parte visual".
  const [filasOcultas, setFilasOcultas] = useState<Set<string>>(new Set());
  const confirmar = useConfirm();

  const importePorMetodo = new Map(importesDia.map((i) => [i.metodo, i]));

  function valorDeclarado(metodo: string): { importe: number; notas: string } {
    if (declarado[metodo]) return declarado[metodo];
    const guardado = importePorMetodo.get(metodo);
    return { importe: Number(guardado?.importe_declarado) || 0, notas: guardado?.notas || "" };
  }

  function esDirty(metodo: string): boolean {
    if (!declarado[metodo]) return false;
    const guardado = importePorMetodo.get(metodo);
    const importeGuardado = Number(guardado?.importe_declarado) || 0;
    const notasGuardadas = guardado?.notas || "";
    return declarado[metodo].importe !== importeGuardado || declarado[metodo].notas !== notasGuardadas;
  }

  async function guardarDeclaracion(metodo: string) {
    const v = valorDeclarado(metodo);
    setGuardando(metodo);
    try {
      const res = await fetch("/api/tpv/importes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: dia, metodo, importe: v.importe, notas: v.notas }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Importe confirmado guardado");
      setDeclarado((prev) => {
        const resto = { ...prev };
        delete resto[metodo];
        return resto;
      });
      onCambiado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(null);
    }
  }

  async function onSeleccionarFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files || []);
    e.target.value = "";
    if (!archivos.length) return;
    setSubiendoFoto(true);
    try {
      for (const file of archivos) {
        try {
          const blob = await resolverBlobImagen(file);
          const { base64, mime } = await comprimirImagen(blob);
          const res = await fetch("/api/tpv/fotos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fecha: dia, base64, mimeType: mime, nombre: file.name }),
          });
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || "Error desconocido");
        } catch (err) {
          toast.error(`No se pudo subir "${file.name}": ${err instanceof Error ? err.message : "error desconocido"}`);
        }
      }
      onCambiado();
    } finally {
      setSubiendoFoto(false);
    }
  }

  async function eliminarFoto(foto: TpvFotoApi) {
    const ok = await confirmar(`¿Eliminar esta foto del ticket de cierre?`, {
      titulo: "Eliminar foto",
      detalle: "No se puede deshacer.",
    });
    if (!ok) return;
    setEliminandoFoto(foto.id);
    try {
      const res = await fetch(`/api/tpv/fotos/${foto.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Foto eliminada");
      onCambiado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEliminandoFoto(null);
    }
  }

  const vendido = METODOS_TPV.reduce((acc, m) => acc + (segunSistemaDia[m.value] || 0), 0);

  // Todos los tipos, siempre — una fila en 0 € es información tan válida
  // como una con movimiento. Petición del usuario, 2026-10-12: "que
  // salgan todos los tipos de pago... si no se cobró nada que salga 0".
  const filas = METODOS_TPV.reduce<{ metodo: (typeof METODOS_TPV)[number]; sistema: number; confirmado: number; totalAcumulado: number }[]>(
    (acc, m) => {
      const sistema = segunSistemaDia[m.value] || 0;
      const v = valorDeclarado(m.value);
      const previo = acc.length ? acc[acc.length - 1].totalAcumulado : 0;
      const totalAcumulado = Math.round((previo + v.importe) * 100) / 100;
      return [...acc, { metodo: m, sistema, confirmado: v.importe, totalAcumulado }];
    },
    []
  );
  const confirmadoTotal = filas.length ? filas[filas.length - 1].totalAcumulado : 0;
  const diferencia = Math.round((vendido - confirmadoTotal) * 100) / 100;
  const filasVisibles = filas.filter((f) => !filasOcultas.has(f.metodo.value));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="size-8" onClick={onVolver} title="Volver al calendario">
          <ArrowLeft2 className="size-4" />
        </Button>
        <h2 className="text-lg font-semibold">{etiquetaDia(dia)}</h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-3">
          <p className="mb-1 text-xs text-muted-foreground">Vendido</p>
          <p className="text-xl font-bold tabular-nums">{euros(vendido)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground"><Bank className="size-3.5" /> Confirmado</p>
          <p className="text-xl font-bold tabular-nums">{euros(confirmadoTotal)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="mb-1 text-xs text-muted-foreground">Diferencia</p>
          <p className={`text-xl font-bold tabular-nums ${Math.abs(diferencia) <= 0.01 ? "text-green-600" : "text-amber-600"}`}>{euros(diferencia)}</p>
        </div>
      </div>

      {filasOcultas.size > 0 && (
        <button type="button" className="text-xs text-primary hover:underline" onClick={() => setFilasOcultas(new Set())}>
          {filasOcultas.size} fila(s) oculta(s) · Mostrar todas
        </button>
      )}

      {filasVisibles.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Sin filas que mostrar.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Sistema</TableHead>
                <TableHead>Confirmado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filasVisibles.map(({ metodo, sistema, confirmado, totalAcumulado }) => {
                const dirty = esDirty(metodo.value);
                const v = valorDeclarado(metodo.value);
                return (
                  <TableRow key={metodo.value}>
                    <TableCell className="whitespace-nowrap text-sm font-medium">{metodo.label}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                      {sistema !== 0 ? (
                        <button type="button" className="underline-offset-2 hover:underline" title="Ver los cobros de este tipo" onClick={() => setMetodoListado(metodo)}>
                          {euros(sistema)}
                        </button>
                      ) : (
                        euros(sistema)
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <DecimalInput
                          className="h-8 w-24"
                          placeholder="0,00"
                          value={confirmado}
                          onChange={(n) => setDeclarado((prev) => ({ ...prev, [metodo.value]: { importe: n, notas: v.notas } }))}
                        />
                        <Input
                          className="h-8 min-w-32 flex-1"
                          placeholder="Nota (opcional)"
                          maxLength={500}
                          value={v.notas}
                          onChange={(e) => setDeclarado((prev) => ({ ...prev, [metodo.value]: { importe: v.importe, notas: e.target.value } }))}
                        />
                        <Button
                          size="sm"
                          variant={dirty ? "default" : "outline"}
                          className="h-8 shrink-0"
                          disabled={guardando === metodo.value || !dirty}
                          onClick={() => guardarDeclaracion(metodo.value)}
                        >
                          {guardando === metodo.value ? "Guardando…" : "Guardar"}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-medium tabular-nums">{euros(totalAcumulado)}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        title="Quitar de la vista (no borra nada)"
                        onClick={() => setFilasOcultas((prev) => new Set(prev).add(metodo.value))}
                      >
                        <CloseCircle className="size-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={3} className="text-right text-sm">Total</TableCell>
                <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">{euros(confirmadoTotal)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><MoneyRecive className="size-3.5" /> Ticket de cierre:</span>
        {fotosDia.map((f) => (
          <div key={f.id} className="relative size-10 shrink-0">
            <a href={`/api/tpv/archivo/${f.drive_file_id}`} target="_blank" rel="noopener noreferrer" className="block size-10 overflow-hidden rounded-md border bg-background" title={f.nombre_original || "Foto de cierre"}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/tpv/archivo/${f.drive_file_id}`} alt="Foto de cierre TPV" className="size-full object-cover" />
            </a>
            <button
              type="button"
              className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-background text-muted-foreground shadow hover:text-destructive disabled:opacity-50"
              title="Eliminar foto"
              disabled={eliminandoFoto === f.id}
              onClick={() => eliminarFoto(f)}
            >
              <CloseCircle className="size-4" />
            </button>
          </div>
        ))}
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" disabled={subiendoFoto} onClick={() => inputFotoRef.current?.click()}>
          <Gallery className="size-3.5" /> {subiendoFoto ? "Subiendo…" : "Añadir foto"}
        </Button>
        <input ref={inputFotoRef} type="file" accept="image/*" multiple className="hidden" onChange={onSeleccionarFotos} />
      </div>

      <ListadoMovimientosDialog
        metodo={metodoListado}
        movimientos={metodoListado ? movimientosDia.filter((m) => m.metodo === metodoListado.value) : []}
        onOpenChange={(o) => !o && setMetodoListado(null)}
      />
    </div>
  );
}
