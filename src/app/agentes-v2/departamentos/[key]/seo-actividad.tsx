"use client";

import { fechaHoraLarga, type DetalleDepartamento } from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";
import type { Tema } from "./use-seo";

interface Suceso {
  cuando: string;
  texto: string;
  tono: "verde" | "ambar" | "gris";
}

/** Convierte los datos del departamento en una línea de tiempo en lenguaje normal: qué pasó y a qué hora. */
function sucesosDe(temas: Tema[], d: DetalleDepartamento): Suceso[] {
  const lote = new Map<string, { cuando: string; n: number }>();
  const sucesos: Suceso[] = [];
  for (const t of temas) {
    const clave = t.created_at.slice(0, 16);
    const l = lote.get(clave);
    if (l) l.n += 1;
    else lote.set(clave, { cuando: t.created_at, n: 1 });
    if (t.status === "escrito") sucesos.push({ cuando: t.updated_at, texto: `Artículo publicado: «${t.title}»`, tono: "verde" });
    else if (t.status === "en_curso") sucesos.push({ cuando: t.updated_at, texto: `Se está escribiendo o espera tu aprobación: «${t.title}»`, tono: "ambar" });
    else if (t.status === "descartado") sucesos.push({ cuando: t.updated_at, texto: `Tema descartado: «${t.title}»`, tono: "gris" });
    else if (t.status === "aprobado") sucesos.push({ cuando: t.updated_at, texto: `Tema priorizado: «${t.title}»`, tono: "ambar" });
  }
  for (const l of lote.values()) sucesos.push({ cuando: l.cuando, texto: l.n === 1 ? "Se añadió 1 tema nuevo a la cola" : `Se añadieron ${l.n} temas nuevos a la cola`, tono: "verde" });
  for (const h of d.schedules as (typeof d.schedules[number] & { last_run_at?: string | null })[]) {
    if (h.last_run_at) sucesos.push({ cuando: h.last_run_at, texto: `Se lanzó el horario «${h.name || "sin nombre"}»`, tono: "gris" });
  }
  return sucesos.sort((a, b) => new Date(b.cuando).getTime() - new Date(a.cuando).getTime()).slice(0, 30);
}

const PUNTO = { verde: "bg-green-500", ambar: "bg-amber-500", gris: "bg-slate-400" };

/** Lo último que ha hecho el departamento, con fecha y hora. */
export function Actividad({ temas, d }: { temas: Tema[]; d: DetalleDepartamento }) {
  const sucesos = sucesosDe(temas, d);
  if (sucesos.length === 0) {
    return <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">Todavía no ha pasado nada. Cuando el departamento busque temas o escriba artículos, aparecerá aquí con su fecha y hora.</p>;
  }
  return (
    <ul className="divide-y rounded-lg border">
      {sucesos.map((s, i) => (
        <li key={i} className="flex items-start gap-3 px-3 py-2.5 text-sm">
          <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", PUNTO[s.tono])} />
          <span className="min-w-0 flex-1">{s.texto}</span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{fechaHoraLarga(s.cuando)}</span>
        </li>
      ))}
    </ul>
  );
}
