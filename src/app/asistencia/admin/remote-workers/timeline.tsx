import { formatDuracion, type RemoteWindowEvent } from "@/lib/remote-workers";

function hora(fecha: string | null): string {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

/** Lista cronológica simple de ventanas activas del día — no se reutiliza
    ChainOfThought (ai-elements): esa forma es para el razonamiento de un
    agente IA, no encaja con "a qué hora se usó cada app". */
export function Timeline({ eventos }: { eventos: RemoteWindowEvent[] }) {
  if (eventos.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Sin eventos de ventana registrados hoy (el agente puede tenerlos desactivados por privacidad).</p>;
  }

  return (
    <ol className="space-y-0">
      {eventos.map((ev, i) => (
        <li key={i} className="flex gap-3 border-l-2 border-border py-2 pl-3">
          <span className="w-12 shrink-0 text-xs tabular-nums text-muted-foreground">{hora(ev.startedAt)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{ev.application}</p>
            {ev.windowTitle && <p className="truncate text-xs text-muted-foreground">{ev.windowTitle}</p>}
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">{formatDuracion(ev.seconds)}</span>
        </li>
      ))}
    </ol>
  );
}
