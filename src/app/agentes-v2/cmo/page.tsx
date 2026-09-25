"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Cpu } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { enviarV2, useV2 } from "@/components/agentes-v2/use-v2";
import { Cabecera, CargandoFilas, EstadoDepartamentoBadge } from "@/components/agentes-v2/componentes";
import { fechaHora, usd, type Panel } from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";

interface Cambio {
  department: string;
  department_name: string;
  diff: { field: string; label: string; before: string; after: string }[];
}

interface Propuesta {
  id: string;
  instruction: string;
  status: "pending" | "applied" | "rejected" | "clarification" | "failed";
  message: string;
  changes: Cambio[];
  cost_usd: number;
  created_at: string;
  decided_by: string | null;
  decided_at: string | null;
}

const ETIQUETA: Record<Propuesta["status"], string> = {
  pending: "Pendiente de tu decisión",
  applied: "Aplicada",
  rejected: "Rechazada",
  clarification: "Necesita aclaración",
  failed: "No disponible",
};

const COLOR: Record<Propuesta["status"], string> = {
  pending: "bg-amber-500/10 text-amber-700",
  applied: "bg-green-500/10 text-green-700",
  rejected: "bg-slate-500/10 text-slate-600",
  clarification: "bg-sky-500/10 text-sky-700",
  failed: "bg-red-500/10 text-red-700",
};

const EJEMPLOS = [
  "Quiero que SEO cambie su enfoque a clínicas privadas y publique 5 artículos por semana.",
  "Pausa el departamento de Anuncios hasta nuevo aviso.",
  "Que Redes sociales publique por la mañana, de lunes a viernes.",
];

function TarjetaPropuesta({ p, onDecidir, ocupado }: { p: Propuesta; onDecidir: (id: string, accion: "apply" | "reject") => void; ocupado: boolean }) {
  return (
    <article className="rounded-lg border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <p className="text-sm">«{p.instruction}»</p>
        <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-xs font-medium", COLOR[p.status])}>{ETIQUETA[p.status]}</span>
      </header>
      <div className="space-y-3 px-4 py-3">
        <div className="flex items-start gap-2.5 text-sm">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Cpu className="size-3.5" /></span>
          <p>{p.message}</p>
        </div>
        {p.changes.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Propuesta de cambios</p>
            {p.changes.map((c) => (
              <div key={c.department} className="overflow-hidden rounded-md border">
                <div className="border-b bg-muted/40 px-3 py-1.5 text-sm font-medium">{c.department_name}</div>
                <ul className="divide-y text-sm">
                  {c.diff.map((d) => (
                    <li key={d.field} className="grid gap-1 px-3 py-2 sm:grid-cols-[9rem_1fr_auto_1fr] sm:items-center sm:gap-3">
                      <span className="text-muted-foreground">{d.label}</span>
                      <span className="text-muted-foreground line-through decoration-muted-foreground/40">{d.before}</span>
                      <span className="hidden text-muted-foreground sm:block">→</span>
                      <span className="font-medium">{d.after}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {p.status === "pending" && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button variant="outline" disabled={ocupado} onClick={() => onDecidir(p.id, "reject")}>Rechazar</Button>
            <Button disabled={ocupado} onClick={() => onDecidir(p.id, "apply")}>Aplicar cambios</Button>
            <span className="text-xs text-muted-foreground">Se guardan en la configuración de cada departamento. No se activa ni se ejecuta nada por sí solo.</span>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          {fechaHora(p.created_at)}
          {p.decided_at ? ` · decidida ${fechaHora(p.decided_at)}${p.decided_by ? ` por ${p.decided_by}` : ""}` : ""}
          {p.cost_usd > 0 ? ` · ${usd(p.cost_usd)}` : ""}
        </p>
      </div>
    </article>
  );
}

/** Centro de control estratégico: el usuario dice qué quiere cambiar, el AI CMO prepara una propuesta con el
    antes y el después, y solo se aplica cuando el usuario lo aprueba. */
export default function CmoPage() {
  const panel = useV2<Panel>("overview");
  const hist = useV2<{ ok: boolean; proposals: Propuesta[] }>("cmo/proposals");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [decidiendo, setDecidiendo] = useState(false);

  const enviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await enviarV2("POST", "cmo/message", { message: texto.trim() });
      setTexto("");
      hist.recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo enviar la instrucción");
    } finally {
      setEnviando(false);
    }
  };

  const decidir = async (id: string, accion: "apply" | "reject") => {
    setDecidiendo(true);
    try {
      await enviarV2("POST", `cmo/proposals/${id}/${accion}`, {});
      toast.success(accion === "apply" ? "Cambios aplicados" : "Propuesta rechazada");
      hist.recargar();
      panel.recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo completar la acción");
      hist.recargar();
    } finally {
      setDecidiendo(false);
    }
  };

  return (
    <div>
      <Cabecera titulo="AI CMO" descripcion="La cabeza estratégica del sistema: entiende lo que quieres cambiar, propone los ajustes a cada departamento y espera tu aprobación." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="space-y-5">
          <div className="space-y-2">
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={3}
              maxLength={2000}
              disabled={enviando}
              placeholder="Dime qué quieres cambiar. Por ejemplo: Quiero que SEO cambie su enfoque a clínicas privadas y publique 5 artículos por semana."
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) enviar(); }}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={enviar} disabled={enviando || !texto.trim()}>{enviando ? "El AI CMO está preparando la propuesta…" : "Enviar al AI CMO"}</Button>
              {enviando && <span className="text-xs text-muted-foreground">Puede tardar hasta un minuto.</span>}
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {EJEMPLOS.map((e) => (
                <button key={e} type="button" onClick={() => setTexto(e)} className="rounded-full border px-3 py-1 text-left text-xs text-muted-foreground transition-colors hover:text-foreground">
                  {e}
                </button>
              ))}
            </div>
          </div>

          {hist.cargando && !hist.datos ? (
            <CargandoFilas n={2} />
          ) : hist.error ? (
            <p className="text-sm text-red-700">{hist.error}</p>
          ) : hist.datos && hist.datos.proposals.length ? (
            <div className="space-y-4">
              {hist.datos.proposals.map((p) => <TarjetaPropuesta key={p.id} p={p} onDecidir={decidir} ocupado={decidiendo} />)}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Todavía no has pedido ningún cambio.</p>
          )}
        </section>

        <aside>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Estado de los departamentos</h2>
          <ul className="divide-y rounded-lg border">
            {(panel.datos?.departments ?? []).map((d) => (
              <li key={d.key} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <Link href={`/agentes-v2/departamentos/${d.key}`} className="truncate hover:underline">{d.name}</Link>
                <EstadoDepartamentoBadge estado={d.status} />
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
