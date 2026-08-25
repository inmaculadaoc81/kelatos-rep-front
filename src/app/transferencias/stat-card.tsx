import type { Icon } from "@/lib/icons";

/** Puerto de las ".stat-card" del original (index.html). */
export function StatCard({ icon: IconComp, value, label, colorClase }: { icon: Icon; value: string | number; label: string; colorClase: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${colorClase}`}>
        <IconComp className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
