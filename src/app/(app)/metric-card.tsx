import { cn } from "@/lib/utils";
import type { Icon } from "@/lib/icons";

export function MetricCard({
  titulo,
  valor,
  unidad,
  icon: Icon,
  color,
}: {
  titulo: string;
  valor: number;
  unidad: string;
  icon: Icon;
  color: string;
}) {
  return (
    <div className="rounded-xl border bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-1 text-sm text-muted-foreground">{titulo}</p>
          <p className="text-2xl font-bold">{valor}</p>
          <p className="text-xs text-muted-foreground">{unidad}</p>
        </div>
        <div className={cn("flex size-10 items-center justify-center rounded-lg", color)}>
          <Icon className="size-5" />
        </div>
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
  items: { label: string; sub: string }[];
}) {
  if (contador === 0) return null;
  return (
    <div className="rounded-xl border border-destructive bg-destructive text-destructive-foreground p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase opacity-80">Alerta</p>
          <p className="font-semibold">{titulo}</p>
        </div>
        <span className="text-3xl font-bold">{contador}</span>
      </div>
      <div className="grid grid-cols-2 gap-1 text-xs opacity-90">
        {items.slice(0, 10).map((it, i) => (
          <div key={i} className="truncate" title={it.label}>
            {it.label} <span className="opacity-75">{it.sub}</span>
          </div>
        ))}
      </div>
      {items.length > 10 && (
        <p className="mt-1 text-center text-xs opacity-75">...y {items.length - 10} más</p>
      )}
    </div>
  );
}
