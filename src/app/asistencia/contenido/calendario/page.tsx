"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft2, ArrowRight2 } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { ESTADOS, type EstadoPieza, type Pieza } from "@/lib/contenido";
import { PiezaDialog } from "../pieza-dialog";

const POLL_MS = 30000;
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const COLOR_ESTADO: Record<EstadoPieza, string> = {
  pendiente: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  en_proceso: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  listo: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
};

function claveDia(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Día en el que sale la pieza: el de programación si lo tiene, si no el límite. */
function fechaDePieza(p: Pieza): { clave: string; hora: string | null } | null {
  if (p.programadaPara) {
    const d = new Date(p.programadaPara);
    return { clave: claveDia(d), hora: d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) };
  }
  if (p.fechaLimite) return { clave: p.fechaLimite, hora: null };
  return null;
}

/** Calendario mensual de piezas: cada día muestra lo que sale o vence ese día. */
export default function CalendarioPage() {
  const [piezas, setPiezas] = useState<Pieza[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mes, setMes] = useState(() => {
    const h = new Date();
    return new Date(h.getFullYear(), h.getMonth(), 1);
  });
  const [seleccionada, setSeleccionada] = useState<number | null>(null);

  useEffect(() => {
    let activo = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/asistencia/kiosk/contenido");
        const data = await res.json();
        if (activo && data.ok) setPiezas(data.piezas as Pieza[]);
      } catch {
        // silencioso — se reintenta en el siguiente poll
      } finally {
        if (activo) setCargando(false);
      }
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      activo = false;
      clearInterval(t);
    };
  }, []);

  const celdas = useMemo(() => {
    const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const desplazamiento = (primero.getDay() + 6) % 7;
    const inicio = new Date(mes.getFullYear(), mes.getMonth(), 1 - desplazamiento);
    return Array.from({ length: 42 }, (_, i) => new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i));
  }, [mes]);

  const porDia = useMemo(() => {
    const m = new Map<string, Pieza[]>();
    for (const p of piezas) {
      const f = fechaDePieza(p);
      if (!f) continue;
      const lista = m.get(f.clave) || [];
      lista.push(p);
      m.set(f.clave, lista);
    }
    return m;
  }, [piezas]);

  const sinFecha = piezas.filter((p) => !fechaDePieza(p));
  const hoy = claveDia(new Date());
  const tituloMes = mes.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  if (cargando) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold capitalize">{tituloMes}</h1>
        <div className="flex items-center gap-1.5">
          <Button size="icon" variant="outline" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} title="Mes anterior">
            <ArrowLeft2 className="size-4" />
          </Button>
          <Button variant="outline" onClick={() => { const h = new Date(); setMes(new Date(h.getFullYear(), h.getMonth(), 1)); }}>Hoy</Button>
          <Button size="icon" variant="outline" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} title="Mes siguiente">
            <ArrowRight2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {ESTADOS.map((e) => (
          <span key={e.valor} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-sm", COLOR_ESTADO[e.valor].split(" ")[0])} /> {e.etiqueta}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <div className="grid min-w-[720px] grid-cols-7 bg-muted/40 text-center text-xs font-medium text-muted-foreground">
          {DIAS.map((d) => <div key={d} className="border-b py-2">{d}</div>)}
        </div>
        <div className="grid min-w-[720px] grid-cols-7">
          {celdas.map((d) => {
            const clave = claveDia(d);
            const delMes = d.getMonth() === mes.getMonth();
            const lista = porDia.get(clave) || [];
            return (
              <div key={clave} className={cn("min-h-28 border-b border-r p-1.5", !delMes && "bg-muted/30 text-muted-foreground/60", clave === hoy && "bg-sky-50 dark:bg-sky-950/30")}>
                <div className={cn("mb-1 text-xs font-medium", clave === hoy && "text-sky-700 dark:text-sky-300")}>{d.getDate()}</div>
                <div className="space-y-1">
                  {lista.slice(0, 3).map((p) => {
                    const f = fechaDePieza(p);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSeleccionada(p.id)}
                        className={cn("block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium hover:opacity-80", COLOR_ESTADO[p.estado])}
                        title={p.titulo}
                      >
                        {f?.hora && <span className="mr-1 tabular-nums">{f.hora}</span>}
                        {p.titulo}
                      </button>
                    );
                  })}
                  {lista.length > 3 && <p className="px-1 text-[11px] text-muted-foreground">+{lista.length - 3} más</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {sinFecha.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Sin fecha</p>
          <div className="flex flex-wrap gap-2">
            {sinFecha.map((p) => (
              <button key={p.id} type="button" onClick={() => setSeleccionada(p.id)} className={cn("rounded px-2 py-1 text-xs font-medium", COLOR_ESTADO[p.estado])}>
                {p.titulo}
              </button>
            ))}
          </div>
        </div>
      )}

      <PiezaDialog
        piezaId={seleccionada}
        open={seleccionada !== null}
        onOpenChange={(o) => !o && setSeleccionada(null)}
        onCambiada={() => {
          fetch("/api/asistencia/kiosk/contenido").then((r) => r.json()).then((d) => d.ok && setPiezas(d.piezas as Pieza[]));
        }}
      />
    </div>
  );
}
