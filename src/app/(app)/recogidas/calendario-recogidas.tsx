"use client";

import { useMemo, useState } from "react";
import { ArrowLeft2, ArrowRight2, Edit2, CloseCircle, Calendar as CalendarioIcono, Clock, Call, Location, DocumentText, Tag } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Recogida } from "@/lib/recogidas";

// Mismo mapa que page.tsx/editar-recogida-dialog.tsx — duplicado a
// propósito (ya es el patrón existente para estos colores) en vez de
// levantarlo a un módulo compartido, para no tocar esos dos archivos por
// una vista de solo lectura.
const COLOR_ESTADO_MINI: Record<string, string> = {
  "Pedido de recogida": "bg-amber-500/10 text-amber-600",
  "Recogida Pagada": "bg-green-500/10 text-green-600",
  "Pago pendiente": "bg-red-500/10 text-red-600",
  "No contesta": "bg-slate-500/10 text-slate-600",
  "Recogida Realizada": "bg-blue-500/10 text-blue-600",
  "Recibido en local": "bg-cyan-500/10 text-cyan-600",
};

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Clave "YYYY-MM-DD" a partir de componentes locales — nunca vía
// toISOString() (eso convierte a UTC y puede saltar de día). Consistente
// con r.fecha, que el backend siempre guarda como medianoche UTC del día
// de Madrid correcto (ver _fechaHoraMadrid en server.js), así que su
// slice(0,10) ya es el día de Madrid real sin más conversión.
function claveFecha(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function esHoy(d: Date): boolean {
  const hoy = new Date();
  return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth() && d.getDate() === hoy.getDate();
}

/** Vista previa grande al hacer click en un evento — mismo patrón que
    Google Calendar (tooltip flotante junto al evento, con un icono para
    abrir el detalle completo) en vez de saltar directo al modal de
    edición. */
function EventoPopoverRecogida({ ev, onEditar }: { ev: Recogida; onEditar: (r: Recogida) => void }) {
  const [abierto, setAbierto] = useState(false);
  const esCita = ev.tipo === "cita_tienda";

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] leading-tight hover:opacity-80 ${
          esCita ? "bg-violet-500/15 text-violet-700 dark:text-violet-300" : "bg-sky-500/15 text-sky-700 dark:text-sky-300"
        }`}
      >
        {ev.hora && <span className="font-medium">{ev.hora} </span>}
        {ev.cliente || ev.asunto || "Sin asunto"}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" side="right" align="start" sideOffset={8}>
        <div className="flex items-center justify-end gap-0.5 border-b px-1.5 py-1">
          <Button size="icon-sm" variant="ghost" className="size-7" title="Editar" onClick={() => { setAbierto(false); onEditar(ev); }}>
            <Edit2 className="size-4" />
          </Button>
          <Button size="icon-sm" variant="ghost" className="size-7" title="Cerrar" onClick={() => setAbierto(false)}>
            <CloseCircle className="size-4" />
          </Button>
        </div>
        <div className="space-y-2.5 p-3.5">
          <div className="flex items-start gap-2.5">
            <span className={`mt-1 size-3 shrink-0 rounded-full ${esCita ? "bg-violet-500" : "bg-sky-500"}`} />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-semibold">{ev.cliente || ev.asunto || "Sin asunto"}</p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarioIcono className="size-3.5" />
                {ev.fecha ? new Date(ev.fecha).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }) : "-"}
              </p>
              {ev.hora && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3.5" /> {ev.hora}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5 pl-5.5 text-xs">
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-medium ${COLOR_ESTADO_MINI[ev.estado] || "bg-muted text-muted-foreground"}`}>
              {ev.estado || "Sin estado"}
            </span>
            {ev.cliente && ev.asunto && <p className="flex items-start gap-1.5"><DocumentText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /> {ev.asunto}</p>}
            {ev.telefono && <p className="flex items-start gap-1.5"><Call className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /> {ev.telefono}</p>}
            {ev.direccion && <p className="flex items-start gap-1.5"><Location className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /> {ev.direccion}</p>}
            {ev.notas && <p className="flex items-start gap-1.5"><Tag className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /> {ev.notas}</p>}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CalendarioRecogidas({
  recogidas,
  onSeleccionar,
}: {
  recogidas: Recogida[];
  onSeleccionar: (r: Recogida) => void;
}) {
  const [mesActual, setMesActual] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const porDia = useMemo(() => {
    const mapa = new Map<string, Recogida[]>();
    for (const r of recogidas) {
      if (!r.fecha) continue;
      const clave = r.fecha.slice(0, 10);
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave)!.push(r);
    }
    for (const lista of mapa.values()) lista.sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));
    return mapa;
  }, [recogidas]);

  const dias = useMemo(() => {
    const primerDiaMes = mesActual;
    const ultimoDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);
    const offsetInicio = (primerDiaMes.getDay() + 6) % 7; // lunes = 0
    const inicioGrid = new Date(primerDiaMes);
    inicioGrid.setDate(inicioGrid.getDate() - offsetInicio);
    const offsetFin = 6 - ((ultimoDiaMes.getDay() + 6) % 7);
    const finGrid = new Date(ultimoDiaMes);
    finGrid.setDate(finGrid.getDate() + offsetFin);

    const resultado: Date[] = [];
    const cursor = new Date(inicioGrid);
    while (cursor <= finGrid) {
      resultado.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return resultado;
  }, [mesActual]);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">
          {MESES[mesActual.getMonth()]} {mesActual.getFullYear()}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => setMesActual(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); })}
          >
            Hoy
          </Button>
          <Button size="icon-sm" variant="outline" onClick={() => setMesActual((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
            <ArrowLeft2 className="size-3.5" />
          </Button>
          <Button size="icon-sm" variant="outline" onClick={() => setMesActual((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
            <ArrowRight2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b text-center text-xs font-semibold text-muted-foreground">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {dias.map((d) => {
          const clave = claveFecha(d);
          const eventos = porDia.get(clave) || [];
          const delMes = d.getMonth() === mesActual.getMonth();
          return (
            <div
              key={clave}
              className={`min-h-28 border-b border-r p-1.5 [&:nth-child(7n)]:border-r-0 ${delMes ? "" : "bg-muted/20"}`}
            >
              <div
                className={`mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs ${
                  esHoy(d) ? "bg-primary font-semibold text-primary-foreground" : delMes ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {d.getDate()}
              </div>
              <div className="space-y-0.5">
                {eventos.map((ev) => (
                  <EventoPopoverRecogida key={ev.idEvento} ev={ev} onEditar={onSeleccionar} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
