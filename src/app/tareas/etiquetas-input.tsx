"use client";

import { useEffect, useState } from "react";
import { CloseCircle } from "@/lib/icons";
import { Input } from "@/components/ui/input";

/** Editor de etiquetas libres — escribir y pulsar Enter (o coma) añade una,
    la "x" de cada chip la quita. Mismo componente en "Nueva tarea" y en el
    detalle, tanto en /tareas (admin) como en el kiosco. Máx. 8, recortadas
    a 30 caracteres (igual que el backend).

    Con `sugerenciasUrl` (opcional) carga el catálogo de etiquetas ya
    usadas en otras tareas y las ofrece como chips para "por tipo"
    (marketing, SEO...) en un toque, sin impedir escribir una nueva —
    petición del usuario, 2026-10-03. */
export function EtiquetasInput({ valor, onChange, sugerenciasUrl }: { valor: string[]; onChange: (v: string[]) => void; sugerenciasUrl?: string }) {
  const [texto, setTexto] = useState("");
  const [sugerencias, setSugerencias] = useState<string[]>([]);

  useEffect(() => {
    if (!sugerenciasUrl) return;
    fetch(sugerenciasUrl)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setSugerencias(d.etiquetas as string[]); })
      .catch(() => {});
  }, [sugerenciasUrl]);

  function añadirTexto(s: string) {
    const limpio = s.trim().slice(0, 30);
    if (!limpio) return;
    if (valor.length >= 8) return;
    if (valor.some((e) => e.toLowerCase() === limpio.toLowerCase())) return;
    onChange([...valor, limpio]);
  }

  function añadir() {
    añadirTexto(texto);
    setTexto("");
  }

  const sugerenciasVisibles = sugerencias.filter((s) => !valor.some((v) => v.toLowerCase() === s.toLowerCase()));

  return (
    <div className="space-y-1.5">
      <Input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); añadir(); }
        }}
        onBlur={añadir}
        placeholder={valor.length >= 8 ? "Máximo 8 etiquetas" : "Escribe y pulsa Enter, o elige una de abajo..."}
        disabled={valor.length >= 8}
      />
      {valor.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {valor.map((et) => (
            <span key={et} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {et}
              <button type="button" onClick={() => onChange(valor.filter((v) => v !== et))} className="hover:text-destructive">
                <CloseCircle className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {valor.length < 8 && sugerenciasVisibles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sugerenciasVisibles.slice(0, 12).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => añadirTexto(s)}
              className="rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
