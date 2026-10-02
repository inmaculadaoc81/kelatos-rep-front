"use client";

import { useMemo, useState } from "react";
import { ArrowLeft2, ArrowRight2, Calendar } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useV2 } from "@/components/agentes-v2/use-v2";
import { Cabecera, ErrorCaja } from "@/components/agentes-v2/componentes";
import type { DepartamentoResumen } from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";

interface Item {
  type: "run" | "approval";
  at: string;
  title: string;
  department_key: string | null;
  department_name: string | null;
  status: string;
}

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const COLOR_TIPO: Record<Item["type"], string> = {
  run: "bg-sky-500",
  approval: "bg-amber-500",
};

/** Fecha local (no UTC): a diferencia de `date.toISOString().slice(0,10)`, esto no se desplaza un día en zonas
    horarias con adelanto respecto a UTC (Europe/Madrid) cerca de medianoche. */
function aFecha(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Rejilla de 6 semanas (Lunes-Domingo) que cubre el mes indicado — siempre 42 días, así la altura no salta de un
    mes a otro. Mismo patrón que /tareas/calendario, para que las dos pantallas se vean y naveguen igual. */
function diasDelMes(mesBase: Date): Date[] {
  const primero = new Date(mesBase.getFullYear(), mesBase.getMonth(), 1);
  const diaSemana = (primero.getDay() + 6) % 7; // 0 = lunes
  const inicio = new Date(primero);
  inicio.setDate(primero.getDate() - diaSemana);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    return d;
  });
}

/** Calendario de contenido y ejecuciones: vista de mes con TODAS las organizaciones a la vez (es un panel
    operativo global a propósito, no por organización — la lista de departamentos para filtrar sí es la misma
    para todas, así que el filtro funciona igual sin importar cuál esté seleccionada arriba). */
export default function CalendarioPage() {
  const [depto, setDepto] = useState("");
  const [mesBase, setMesBase] = useState(() => new Date());
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null);

  const dias = useMemo(() => diasDelMes(mesBase), [mesBase]);
  const desde = aFecha(dias[0]);
  const hasta = aFecha(dias[dias.length - 1]);
  const hoy = aFecha(new Date());

  const deps = useV2<{ ok: boolean; departments: DepartamentoResumen[] }>("departments");
  const { datos, error, cargando } = useV2<{ ok: boolean; items: Item[] }>(
    `calendar?from=${desde}&to=${hasta}${depto ? `&department=${depto}` : ""}`
  );

  const porFecha = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const it of datos?.items ?? []) {
      const k = aFecha(new Date(it.at));
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(it);
    }
    for (const lista of m.values()) lista.sort((a, b) => (a.at < b.at ? -1 : 1));
    return m;
  }, [datos]);

  const itemsDiaAbierto = diaAbierto ? (porFecha.get(diaAbierto) ?? []) : [];

  return (
    <div>
      <Cabecera
        titulo="Calendario"
        descripcion="Lo que está programado en todas las organizaciones: ejecuciones de departamentos y aprobaciones pendientes."
        acciones={
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon-sm" onClick={() => setMesBase((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
              <ArrowLeft2 className="size-4" />
            </Button>
            <span className="w-40 text-center text-sm font-medium capitalize">{MESES[mesBase.getMonth()]} {mesBase.getFullYear()}</span>
            <Button variant="outline" size="icon-sm" onClick={() => setMesBase((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
              <ArrowRight2 className="size-4" />
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setMesBase(new Date())}>
              <Calendar className="size-3.5" /> Hoy
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {[{ key: "", name: "Todos" }, ...(deps.datos?.departments ?? [])].map((d) => (
          <button
            key={d.key || "todos"}
            type="button"
            aria-pressed={depto === d.key}
            onClick={() => setDepto(d.key)}
            className={cn("rounded-full border px-3 py-1 text-xs transition-colors", depto === d.key ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground hover:text-foreground")}
          >
            {d.name}
          </button>
        ))}
      </div>

      {error && <ErrorCaja mensaje={error} />}

      <div className={cn("overflow-hidden rounded-xl border bg-card", cargando && !datos && "opacity-60")}>
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {DIAS.map((d) => (<div key={d} className="px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">{d}</div>))}
        </div>
        <div className="grid grid-cols-7">
          {dias.map((d) => {
            const clave = aFecha(d);
            const itemsDelDia = porFecha.get(clave) || [];
            const delMes = d.getMonth() === mesBase.getMonth();
            const esHoy = clave === hoy;
            return (
              <button
                key={clave}
                type="button"
                onClick={() => itemsDelDia.length > 0 && setDiaAbierto(clave)}
                disabled={itemsDelDia.length === 0}
                className={cn("min-h-24 border-r border-b p-1.5 text-left last:border-r-0", !delMes && "bg-muted/20", itemsDelDia.length > 0 && "hover:bg-accent/50")}
              >
                <span className={cn(
                  "mb-1 inline-flex size-5 items-center justify-center rounded-full text-xs",
                  esHoy ? "bg-primary font-semibold text-primary-foreground" : delMes ? "text-foreground" : "text-muted-foreground/50"
                )}>
                  {d.getDate()}
                </span>
                <div className="space-y-1">
                  {itemsDelDia.slice(0, 3).map((it, i) => (
                    <div key={i} className="flex w-full items-center gap-1 truncate text-left text-[11px]">
                      <span className={cn("size-1.5 shrink-0 rounded-full", COLOR_TIPO[it.type])} />
                      <span className="truncate">{it.title}</span>
                    </div>
                  ))}
                  {itemsDelDia.length > 3 && (
                    <p className="px-0.5 text-[10px] text-muted-foreground">+{itemsDelDia.length - 3} más</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={diaAbierto !== null} onOpenChange={(o) => !o && setDiaAbierto(null)}>
        <DialogContent className="max-w-md">
          <DialogTitle>
            {diaAbierto && new Date(`${diaAbierto}T00:00:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
          </DialogTitle>
          <ul className="divide-y rounded-lg border">
            {itemsDiaAbierto.map((it, i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="w-12 font-medium tabular-nums">{new Date(it.at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span>
                <span className={cn("size-1.5 shrink-0 rounded-full", COLOR_TIPO[it.type])} />
                <span className="truncate">{it.title}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{it.department_name}{it.type === "approval" ? " · aprobación" : ""}</span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
