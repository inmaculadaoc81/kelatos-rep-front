"use client";

import { useState } from "react";
import { CloseCircle } from "@/lib/icons";
import { Input } from "@/components/ui/input";

/** Editor de etiquetas libres — escribir y pulsar Enter (o coma) añade una,
    la "x" de cada chip la quita. Mismo componente en "Nueva tarea" y en el
    detalle. Máx. 8, recortadas a 30 caracteres (igual que el backend). */
export function EtiquetasInput({ valor, onChange }: { valor: string[]; onChange: (v: string[]) => void }) {
  const [texto, setTexto] = useState("");

  function añadir() {
    const s = texto.trim().slice(0, 30);
    setTexto("");
    if (!s) return;
    if (valor.length >= 8) return;
    if (valor.some((e) => e.toLowerCase() === s.toLowerCase())) return;
    onChange([...valor, s]);
  }

  return (
    <div className="space-y-1.5">
      <Input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); añadir(); }
        }}
        onBlur={añadir}
        placeholder={valor.length >= 8 ? "Máximo 8 etiquetas" : "Escribe y pulsa Enter..."}
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
    </div>
  );
}
