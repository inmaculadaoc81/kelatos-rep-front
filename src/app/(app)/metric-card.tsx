import { Warning2 } from "@/lib/icons";
import type { Icon } from "@/lib/icons";

export type TonoMetrica =
  | "sky"
  | "amber"
  | "slate"
  | "green"
  | "indigo"
  | "emerald"
  | "teal"
  | "violet"
  | "blue"
  | "orange"
  | "rose";

// Un tono por tarjeta, no una regla estricta de "verde=bien/rojo=mal": son
// 11 contadores de naturaleza distinta (pipeline, envíos, formularios,
// cintas...), así que el color aquí es identidad para reconocer cada
// tarjeta de un vistazo, no una codificación de estado a interpretar.
const TONOS: Record<TonoMetrica, { chip: string }> = {
  sky: { chip: "bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400" },
  amber: { chip: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" },
  slate: { chip: "bg-slate-500/10 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400" },
  green: { chip: "bg-green-500/10 text-green-600 dark:bg-green-500/15 dark:text-green-400" },
  indigo: { chip: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400" },
  emerald: { chip: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" },
  teal: { chip: "bg-teal-500/10 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400" },
  violet: { chip: "bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400" },
  blue: { chip: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" },
  orange: { chip: "bg-orange-500/10 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400" },
  rose: { chip: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400" },
};

export function MetricCard({
  titulo,
  valor,
  unidad,
  icon: Icon,
  tono,
}: {
  titulo: string;
  valor: number;
  unidad: string;
  icon: Icon;
  tono: TonoMetrica;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{titulo}</p>
          <p className="mt-1.5 text-3xl leading-none font-bold tabular-nums">{valor}</p>
          <p className="mt-2 text-[11px] tracking-wide text-muted-foreground/70 uppercase">{unidad}</p>
        </div>
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${TONOS[tono].chip}`}>
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}

export function AlertCard({
  titulo,
  contador,
  items,
}: {
  titulo: string;
  contador: number;
  items: { resguardo: string; cliente: string; sub: string }[];
}) {
  if (contador === 0) return null;
  return (
    // Mismo idioma visual que el resto de avisos de la app (ver
    // accion-requerida.tsx): borde + fondo tenue en el color de estado, no
    // un bloque sólido — el rojo saturado queda reservado para el icono,
    // el título y el contador, que es lo que de verdad necesita destacar.
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <Warning2 className="size-4.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wide text-destructive/70 uppercase">Alerta</p>
            <p className="truncate text-sm font-semibold text-destructive">{titulo}</p>
          </div>
        </div>
        <span className="shrink-0 text-2xl leading-none font-bold tabular-nums text-destructive">{contador}</span>
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {items.slice(0, 10).map((it, i) => (
          <div key={i} className="flex min-w-0 items-baseline gap-1.5 text-xs">
            <span className="shrink-0 font-semibold tabular-nums">{it.resguardo}</span>
            <span className="min-w-0 truncate text-muted-foreground" title={it.cliente}>
              {it.cliente}
            </span>
            <span className="ml-auto shrink-0 font-medium text-destructive/70 tabular-nums">{it.sub}</span>
          </div>
        ))}
      </div>
      {items.length > 10 && (
        <p className="mt-2 border-t border-destructive/15 pt-2 text-center text-xs text-destructive/70">
          ...y {items.length - 10} más
        </p>
      )}
    </div>
  );
}
