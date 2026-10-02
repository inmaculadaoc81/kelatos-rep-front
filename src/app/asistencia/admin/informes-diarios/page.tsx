"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentText } from "@/lib/icons";
import type { InformeAdmin } from "@/lib/informes";

interface Empleado {
  id: number;
  nombre: string;
}

function fmt(f: string) {
  return new Date(f + "T00:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

/** Informes de texto libre de todos los empleados ("¿qué he hecho hoy?",
    escritos desde "Mis tareas" en el kiosco) — página hermana de
    admin/informe (ese es numérico: activo/inactivo/productividad). Petición
    del usuario, 2026-10-03. */
export default function InformesDiariosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [informes, setInformes] = useState<InformeAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fecha, setFecha] = useState("");
  const [empleadoId, setEmpleadoId] = useState("");

  useEffect(() => {
    fetch("/api/asistencia/admin/empleados").then((r) => r.json()).then((d) => { if (d.ok) setEmpleados(d.empleados); });
  }, []);

  useEffect(() => {
    setCargando(true);
    const qs = new URLSearchParams();
    if (fecha) qs.set("fecha", fecha);
    if (empleadoId) qs.set("empleadoId", empleadoId);
    fetch(`/api/asistencia/admin/informes-diarios?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setInformes(d.informes as InformeAdmin[]); })
      .finally(() => setCargando(false));
  }, [fecha, empleadoId]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold"><DocumentText className="size-5" /> Informes diarios</h1>
        <p className="text-sm text-muted-foreground">Lo que cada empleado ha escrito sobre su día desde "Mis tareas" en el kiosco.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Fecha</Label>
          <Input type="date" className="h-9 w-40" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Empleado</Label>
          <Select value={empleadoId || "todos"} onValueChange={(v) => setEmpleadoId(!v || v === "todos" ? "" : v)}>
            <SelectTrigger className="h-9 w-48"><SelectValue>{() => (empleadoId ? empleados.find((e) => String(e.id) === empleadoId)?.nombre : "Todos")}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {empleados.map((e) => (<SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {cargando ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : informes.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Sin informes para este filtro.</p>
      ) : (
        <div className="space-y-2">
          {informes.map((i) => (
            <Card key={i.id}>
              <CardHeader className="pb-1.5">
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  <span>{i.empleadoNombre}</span>
                  <span className="text-xs font-normal text-muted-foreground">{fmt(i.fecha)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{i.texto}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
