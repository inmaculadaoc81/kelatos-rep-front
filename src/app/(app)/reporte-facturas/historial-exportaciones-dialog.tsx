"use client";

import { useEffect, useState } from "react";
import { Clock, Refresh2 } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExportacionReporteFacturas } from "@/lib/reporte-facturas-exportaciones";
import { fechaMadrid } from "@/lib/reportes";

function euros(n: number): string {
  return (n || 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function fechaHoraCorta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// Mismo ajuste que en reporte-facturas/page.tsx: truncar el ISO en UTC
// directamente se queda con el día equivocado cerca de la medianoche
// española.
function fechaCorta(iso: string): string {
  const dia = fechaMadrid(iso);
  if (!dia) return "—";
  const p = dia.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(-2)}` : "—";
}

/**
 * Historial de exportaciones CSV del Reporte de Facturas — funcionalidad
 * nueva, sin equivalente en el original (apiExportarReporteFacturasCsv no
 * dejaba ningún rastro de sus propias ejecuciones). Cada fila queda
 * registrada al pulsar "CSV" en la vista (ver exportarCsv() en page.tsx).
 */
export function HistorialExportacionesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [exportaciones, setExportaciones] = useState<ExportacionReporteFacturas[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cargar() {
    setCargando(true);
    setError(null);
    fetch("/api/reporte-facturas/exportaciones")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error || "Error desconocido");
        setExportaciones(d.exportaciones);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error desconocido"))
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    if (open) cargar();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="size-5" /> Historial de exportaciones
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Cada exportación CSV del reporte queda registrada aquí.</p>
          <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={cargar} disabled={cargando}>
            <Refresh2 className={cn("size-3.5", cargando && "animate-spin")} /> Actualizar
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/70 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2">Fecha/Hora</th>
                <th className="p-2">Usuario</th>
                <th className="p-2">Período</th>
                <th className="p-2">Series</th>
                <th className="p-2 text-right">Nº Facturas</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">Cargando…</td></tr>
              ) : exportaciones.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">Todavía no se ha exportado ningún reporte.</td></tr>
              ) : (
                exportaciones.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="p-2 whitespace-nowrap">{fechaHoraCorta(e.fechaHora)}</td>
                    <td className="p-2">{e.usuario}</td>
                    <td className="p-2 whitespace-nowrap">{fechaCorta(e.fechaDesde)} — {fechaCorta(e.fechaHasta)}</td>
                    <td className="p-2">{e.series}</td>
                    <td className="p-2 text-right tabular-nums">{e.numFacturas}</td>
                    <td className="p-2 text-right tabular-nums">{euros(e.totalExportado)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
