"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Calendar } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiComercial, fechaHoraCorta, type Reunion } from "@/lib/comercial";
import { cn } from "@/lib/utils";
import { useComercial } from "../contexto";
import { FichaDialog, SelectorAgente } from "../componentes";

const TODOS = "__todos";
const ETIQUETA: Record<string, string> = { agendada: "Agendada", realizada: "Realizada", cancelada: "Cancelada", no_asistio: "No asistió" };
const COLOR: Record<string, string> = {
  agendada: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  realizada: "bg-green-500/10 text-green-700 dark:text-green-400",
  cancelada: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  no_asistio: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

export default function ReunionesPage() {
  const { admin, email } = useComercial();
  const [agente, setAgente] = useState("");
  const [estado, setEstado] = useState("agendada");
  const [filas, setFilas] = useState<Reunion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ficha, setFicha] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const d = await apiComercial<{ reuniones: Reunion[] }>("reuniones", { params: { agente: admin ? agente : email, estado } });
      setFilas(d.reuniones);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar");
    }
  }, [admin, agente, email, estado]);

  useEffect(() => {
    const t = setTimeout(() => void cargar(), 0);
    return () => clearTimeout(t);
  }, [cargar]);

  async function cambiar(id: string, nuevo: string) {
    try {
      await apiComercial(`reuniones/${id}`, { metodo: "PATCH", cuerpo: { estado: nuevo } });
      toast.success("Reunión actualizada");
      void cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Reuniones</h1>
        <p className="text-sm text-muted-foreground">Las reuniones que se agendan al marcar «Reunión agendada» tras una llamada. Cuando pasen, márcalas como realizadas.</p>
      </div>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3.5 shadow-sm">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Estado</label>
          <Select value={estado || TODOS} onValueChange={(v) => setEstado(!v || v === TODOS ? "" : v)}>
            <SelectTrigger className="h-9 w-44" aria-label="Estado"><SelectValue>{(v: string) => (v === TODOS ? "Todas" : ETIQUETA[v] ?? v)}</SelectValue></SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value={TODOS}>Todas</SelectItem>
              {Object.entries(ETIQUETA).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <SelectorAgente valor={agente} onCambio={setAgente} />
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      {!filas && !error && <Skeleton className="h-40 w-full" />}
      {filas && filas.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground"><Calendar className="size-6" /> No hay reuniones con ese filtro.</div>
      )}
      {filas && filas.length > 0 && (
        <ul className="space-y-2">
          {filas.map((m) => (
            <li key={m.id} className="rounded-xl border bg-card p-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <button type="button" onClick={() => setFicha(m.contacto_id)} className="text-left font-medium hover:underline">{m.empresa}</button>
                <span className="text-sm tabular-nums">{fechaHoraCorta(m.fecha_hora)}</span>
                <span className="text-sm text-muted-foreground">{m.canal}</span>
                {admin && <span className="text-xs text-muted-foreground">{m.agente}</span>}
                <span className={cn("ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", COLOR[m.estado])}>{ETIQUETA[m.estado]}</span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{[m.contacto, m.telefono, m.email].filter(Boolean).join(" · ")}{m.nota ? ` — ${m.nota}` : ""}</div>
              {m.estado === "agendada" && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => cambiar(m.id, "realizada")}>Realizada</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => cambiar(m.id, "no_asistio")}>No asistió</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => cambiar(m.id, "cancelada")}>Cancelar</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {ficha && <FichaDialog id={ficha} onCerrar={() => setFicha(null)} onCambio={() => void cargar()} />}
    </div>
  );
}
