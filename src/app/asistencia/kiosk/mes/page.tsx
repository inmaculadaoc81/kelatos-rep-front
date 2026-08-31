"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft2, ArrowRight2, DocumentDownload, Calendar, Clock } from "@/lib/icons";
import { TipoFichajePill } from "../../pills";
import { cn } from "@/lib/utils";
import { exportarRegistrosPdf } from "../pdf-export";

interface ItemMes {
  fecha: string;
  entrada: string;
  salida: string;
  tipo: string;
  trabajadas: string;
  previstas: string;
  diferencia: string;
  ok: boolean;
  firmado: boolean;
  id: number;
}

const hoy = new Date();

// it.fecha llega como "YYYY-MM-DD" — DD/MM para que coincida con "Mis
// últimos fichajes" de la pantalla de Fichar.
function fechaCorta(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export default function MesPage() {
  const [year, setYear] = useState(hoy.getFullYear());
  const [month, setMonth] = useState(hoy.getMonth() + 1);
  const [items, setItems] = useState<ItemMes[]>([]);
  const [totalMes, setTotalMes] = useState("");
  const [previstoMes, setPrevistoMes] = useState("");
  const [nombreEmpleado, setNombreEmpleado] = useState("");
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    fetch("/api/asistencia/kiosk/mi-info")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setNombreEmpleado(d.nombre); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setCargando(true);
    fetch(`/api/asistencia/kiosk/mis-fichajes-mes?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setItems(d.items);
          setTotalMes(d.total_mes);
          setPrevistoMes(d.previsto_mes);
        }
      })
      .finally(() => setCargando(false));
  }, [year, month]);

  function cambiarMes(delta: number) {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1) { m = 12; y -= 1; }
    setMonth(m);
    setYear(y);
  }

  const nombreMes = new Date(year, month - 1, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  async function exportarPdf() {
    setExportando(true);
    try {
      const ok = await exportarRegistrosPdf({
        nombreEmpleado: nombreEmpleado || "Empleado",
        mesNombre: nombreMes,
        totalMes,
        previstoMes,
        registros: items,
      });
      if (!ok) toast.error("No hay fichajes este mes para exportar");
    } catch {
      toast.error("No se pudo generar el PDF");
    } finally {
      setExportando(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon-sm" onClick={() => cambiarMes(-1)}><ArrowLeft2 className="size-4" /></Button>
          <span className="inline-flex items-center gap-1.5 text-base font-semibold capitalize">
            <Calendar className="size-4 text-muted-foreground" /> {nombreMes}
          </span>
          <Button variant="outline" size="icon-sm" onClick={() => cambiarMes(1)}><ArrowRight2 className="size-4" /></Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-emerald-50 p-3">
            <p className="text-[11px] font-medium tracking-wide text-emerald-700 uppercase">Trabajado</p>
            <p className="text-lg font-semibold text-emerald-900">{totalMes || "—"}</p>
          </div>
          <div className="rounded-lg bg-sky-50 p-3">
            <p className="text-[11px] font-medium tracking-wide text-sky-700 uppercase">Previsto</p>
            <p className="text-lg font-semibold text-sky-900">{previstoMes || "—"}</p>
          </div>
        </div>

        <div className="space-y-2">
          {cargando && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          {!cargando && items.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin fichajes este mes.</p>
          )}
          {items.map((it) => (
            <div key={it.id} className="rounded-lg border p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2">
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">{fechaCorta(it.fecha)}</span>
                  <TipoFichajePill tipo={it.tipo} />
                </span>
                <span className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  it.ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                )}>
                  {it.diferencia}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>{it.entrada} – {it.salida}</span>
                <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {it.trabajadas}</span>
              </div>
            </div>
          ))}
        </div>

        {!cargando && items.length > 0 && (
          <Button variant="outline" className="w-full gap-1.5" disabled={exportando} onClick={exportarPdf}>
            <DocumentDownload className="size-4" /> {exportando ? "Generando…" : "Exportar PDF del mes"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
