"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft2, ArrowRight2, DocumentDownload } from "@/lib/icons";
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
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon-sm" onClick={() => cambiarMes(-1)}><ArrowLeft2 className="size-4" /></Button>
          <span className="text-sm font-semibold capitalize">{nombreMes}</span>
          <Button variant="outline" size="icon-sm" onClick={() => cambiarMes(1)}><ArrowRight2 className="size-4" /></Button>
        </div>

        <div className="flex justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
          <span>Trabajado: <strong>{totalMes || "-"}</strong></span>
          <span>Previsto: <strong>{previstoMes || "-"}</strong></span>
        </div>

        <div className="space-y-1.5">
          {cargando && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {!cargando && items.length === 0 && <p className="text-sm text-muted-foreground">Sin fichajes este mes.</p>}
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between border-b pb-1.5 text-sm last:border-0">
              <span className="w-16 text-muted-foreground">{it.fecha.slice(5)}</span>
              <span className="w-24">{it.entrada} – {it.salida}</span>
              <span className="w-20 text-xs text-muted-foreground">{it.trabajadas}</span>
              <span className={`text-xs font-medium ${it.ok ? "text-emerald-600" : "text-destructive"}`}>{it.diferencia}</span>
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
