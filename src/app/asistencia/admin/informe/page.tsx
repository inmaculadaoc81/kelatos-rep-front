"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DocumentDownload } from "@/lib/icons";
import { exportarInformeMensualPdf, type GrupoInforme } from "../informe-mensual-pdf";

interface Empleado {
  id: number;
  nombre: string;
}

function primerDiaMesActual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function hoyStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function InformeMensualPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [desde, setDesde] = useState(primerDiaMesActual());
  const [hasta, setHasta] = useState(hoyStr());
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    fetch("/api/asistencia/admin/empleados")
      .then((r) => r.json())
      .then((d) => { if (d.ok) { setEmpleados(d.empleados); setSeleccionados(new Set(d.empleados.map((e: Empleado) => e.id))); } });
  }, []);

  function alternar(id: number) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function alternarTodos() {
    setSeleccionados((prev) => (prev.size === empleados.length ? new Set() : new Set(empleados.map((e) => e.id))));
  }

  async function generar() {
    if (!desde || !hasta) return toast.error("Selecciona el rango de fechas");
    if (seleccionados.size === 0) return toast.error("Selecciona al menos un empleado");
    setGenerando(true);
    try {
      const qs = new URLSearchParams({ desde, hasta, employeeIds: Array.from(seleccionados).join(",") });
      const res = await fetch(`/api/asistencia/admin/informe-mensual?${qs}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      const grupos = data.grupos as GrupoInforme[];
      if (grupos.length === 0) {
        toast.error("No hay fichajes en ese rango para los empleados seleccionados");
        return;
      }
      const periodoLabel = `${new Date(desde).toLocaleDateString("es-ES")} – ${new Date(hasta).toLocaleDateString("es-ES")}`;
      await exportarInformeMensualPdf(grupos, periodoLabel);
      toast.success(`PDF generado — ${grupos.length} empleado${grupos.length !== 1 ? "s" : ""}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Informe mensual</h1>
        <p className="text-xs text-muted-foreground">
          Genera el registro de jornada oficial (RDL 8/2019) en PDF, una página por empleado con su firma — para uno, varios o todos a la vez.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Desde</Label>
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Hasta</Label>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Empleados</Label>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={alternarTodos}>
                {seleccionados.size === empleados.length ? "Ninguno" : "Todos"}
              </Button>
            </div>
            <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-md border p-2">
              {empleados.map((e) => (
                <label key={e.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={seleccionados.has(e.id)} onCheckedChange={() => alternar(e.id)} />
                  {e.nombre}
                </label>
              ))}
              {empleados.length === 0 && <p className="text-xs text-muted-foreground">Cargando empleados…</p>}
            </div>
          </div>

          <Button className="w-full gap-1.5" disabled={generando} onClick={generar}>
            <DocumentDownload className="size-4" /> {generando ? "Generando…" : "Generar PDF"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
