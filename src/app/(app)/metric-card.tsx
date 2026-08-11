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
// `barra` es el 500 sólido para el relleno de la barra de proporción;
// `chip` es el tono pastel del icono.
const TONOS: Record<TonoMetrica, { chip: string; barra: string }> = {
  sky: { chip: "bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400", barra: "bg-sky-500" },
  amber: { chip: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400", barra: "bg-amber-500" },
  slate: { chip: "bg-slate-500/10 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400", barra: "bg-slate-500" },
  green: { chip: "bg-green-500/10 text-green-600 dark:bg-green-500/15 dark:text-green-400", barra: "bg-green-500" },
  indigo: { chip: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400", barra: "bg-indigo-500" },
  emerald: { chip: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400", barra: "bg-emerald-500" },
  teal: { chip: "bg-teal-500/10 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400", barra: "bg-teal-500" },
  violet: { chip: "bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400", barra: "bg-violet-500" },
  blue: { chip: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400", barra: "bg-blue-500" },
  orange: { chip: "bg-orange-500/10 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400", barra: "bg-orange-500" },
  rose: { chip: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400", barra: "bg-rose-500" },
};

export function MetricCard({
  titulo,
  valor,
  unidad,
  icon: Icon,
  tono,
  proporcion,
  onClick,
  activo,
}: {
  titulo: string;
  valor: number;
  unidad: string;
  icon: Icon;
  tono: TonoMetrica;
  /**
   * Fracción 0–1 sobre el total de reparaciones activas, para la barra
   * inferior. Solo tiene sentido cuando `unidad` es "equipos" — para
   * formularios/pedidos no hay un total comparable en la API, así que se
   * omite (la barra se pinta vacía, sin fingir un porcentaje) antes que
   * inventar un dato que no existe.
   */
  proporcion?: number;
  /** Reproduce filtrarPorCard() del original: cada card es clicable y filtra la tabla de abajo. */
  onClick?: () => void;
  activo?: boolean;
}) {
  const t = TONOS[tono];
  return (
    <button
      type="button"
      onClick={onClick}
      title="Click para filtrar"
      className={`rounded-lg border bg-card p-4 text-left shadow-sm transition-colors ${onClick ? "cursor-pointer hover:border-primary/40 hover:bg-accent/40" : ""} ${activo ? "border-primary ring-1 ring-primary" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-md ${t.chip}`}>
          <Icon className="size-4" />
        </span>
        <p className="truncate text-sm text-muted-foreground">{titulo}</p>
      </div>
      <p className="mt-3 leading-none font-bold tabular-nums">
        <span className="text-2xl">{valor}</span>{" "}
        <span className="text-xs font-normal text-muted-foreground">{unidad}</span>
      </p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        {proporcion !== undefined && (
          <div
            className={`h-full rounded-full ${t.barra}`}
            style={{ width: `${Math.min(100, Math.max(proporcion * 100, valor > 0 ? 4 : 0))}%` }}
          />
        )}
      </div>
    </button>
  );
}

export function AlertCard({
  titulo,
  contador,
  items,
  onClick,
  activo,
}: {
  titulo: string;
  contador: number;
  items: { resguardo: string; cliente: string; sub: string }[];
  /** Reproduce filtrarPorCard() del original: también son clicables. */
  onClick?: () => void;
  activo?: boolean;
}) {
  if (contador === 0) return null;
  return (
    // Panel neutro (no un lavado rojo de fondo entero): el color de aviso
    // queda reservado al chip del icono y al badge de contador/retraso,
    // igual que la lista de "To-Do" de una app de gestión normal.
    <button
      type="button"
      onClick={onClick}
      title="Click para filtrar"
      className={`rounded-lg border bg-card p-4 text-left shadow-sm transition-colors ${onClick ? "cursor-pointer hover:border-primary/40 hover:bg-accent/40" : ""} ${activo ? "border-primary ring-1 ring-primary" : ""}`}
    >
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
            <Warning2 className="size-4" />
          </span>
          <p className="text-sm font-semibold">{titulo}</p>
        </div>
        <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold tabular-nums text-destructive">
          {contador}
        </span>
      </div>
      <div className="divide-y divide-border">
        {items.slice(0, 6).map((it, i) => (
          <FilaAlerta key={i} item={it} />
        ))}
      </div>
      {items.length > 6 && (
        <p className="mt-1 border-t pt-2 text-center text-xs text-muted-foreground">...y {items.length - 6} más</p>
      )}
    </button>
  );
}

function FilaAlerta({ item }: { item: { resguardo: string; cliente: string; sub: string } }) {
  return (
    <div className="flex items-center gap-2 py-1.5 text-xs">
      <span className="shrink-0 font-semibold tabular-nums">{item.resguardo}</span>
      <span className="min-w-0 flex-1 truncate text-muted-foreground" title={item.cliente}>
        {item.cliente}
      </span>
      <span className="shrink-0 font-medium tabular-nums text-destructive">{item.sub}</span>
    </div>
  );
}
