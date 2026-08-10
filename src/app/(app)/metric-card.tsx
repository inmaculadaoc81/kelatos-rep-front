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
// `bar` va siempre al 500 sólido (la franja de identidad no se aclara
// entre temas); `chip` sí tiene su propio paso para el fondo tenue.
const TONOS: Record<TonoMetrica, { chip: string; bar: string }> = {
  sky: { chip: "bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400", bar: "bg-sky-500" },
  amber: { chip: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400", bar: "bg-amber-500" },
  slate: { chip: "bg-slate-500/10 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400", bar: "bg-slate-500" },
  green: { chip: "bg-green-500/10 text-green-600 dark:bg-green-500/15 dark:text-green-400", bar: "bg-green-500" },
  indigo: { chip: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400", bar: "bg-indigo-500" },
  emerald: { chip: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400", bar: "bg-emerald-500" },
  teal: { chip: "bg-teal-500/10 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400", bar: "bg-teal-500" },
  violet: { chip: "bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400", bar: "bg-violet-500" },
  blue: { chip: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400", bar: "bg-blue-500" },
  orange: { chip: "bg-orange-500/10 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400", bar: "bg-orange-500" },
  rose: { chip: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400", bar: "bg-rose-500" },
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
  const t = TONOS[tono];
  return (
    // Franja de color a la izquierda en vez de (o además de) el chip: es
    // el mismo "severity stripe" que ya usan las filas de estado en el
    // resto de la app, aquí como marca de identidad. El número manda —
    // va primero y grande — y el título queda como etiqueta debajo, al
    // revés que la v1 (título arriba, número después).
    <div className="group relative overflow-hidden rounded-2xl border bg-card p-4 pl-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <span className={`absolute inset-y-0 left-0 w-1 ${t.bar}`} aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <p className="text-3xl leading-none font-bold tabular-nums">{valor}</p>
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${t.chip}`}>
          <Icon className="size-4.5" />
        </span>
      </div>
      <p className="mt-3 truncate text-sm font-medium text-foreground/80">{titulo}</p>
      <p className="text-[11px] tracking-wide text-muted-foreground/70 uppercase">{unidad}</p>
    </div>
  );
}

export function SeccionMetricas({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <div className="mb-3 flex items-center gap-3">
        <h2 className="shrink-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{titulo}</h2>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{children}</div>
    </section>
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
    // Mismo idioma que el resto de avisos de la app (ver
    // accion-requerida.tsx): borde + fondo tenue en el color de estado, no
    // un bloque sólido. Cada fila es su propia ficha para separar
    // entradas de un vistazo, en vez de líneas de texto corrido.
    <div className="rounded-2xl border border-destructive/30 bg-destructive/4 p-4 shadow-sm">
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
        <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-destructive px-2 text-sm font-bold tabular-nums text-white">
          {contador}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {items.slice(0, 10).map((it, i) => (
          <div
            key={i}
            className="flex min-w-0 items-center gap-1.5 rounded-lg bg-card/80 px-2.5 py-1.5 text-xs ring-1 ring-destructive/10"
          >
            <span className="shrink-0 font-semibold tabular-nums">{it.resguardo}</span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground" title={it.cliente}>
              {it.cliente}
            </span>
            <span className="shrink-0 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-destructive">
              {it.sub}
            </span>
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
