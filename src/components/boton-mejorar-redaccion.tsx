"use client";

import { useState } from "react";
import { MagicStar } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Botón «Mejorar redacción»: manda el texto escrito a la IA, que corrige ortografía, tildes y puntuación y pule el tono sin cambiar lo que dice (importes, fechas,
 * correos y números se conservan). El texto mejorado sustituye al actual y se puede «Deshacer» para recuperar exactamente lo que se había escrito.
 */
export function BotonMejorarRedaccion({ texto, onCambiar, contexto = "", deshabilitado = false }: { texto: string; onCambiar: (nuevo: string) => void; contexto?: string; deshabilitado?: boolean }) {
  const [cargando, setCargando] = useState(false);
  const [anterior, setAnterior] = useState<string | null>(null);

  async function mejorar() {
    if (texto.trim().length < 5) return toast.error("Escribe algo antes de mejorar la redacción");
    setCargando(true);
    try {
      const res = await fetch("/api/mejorar-redaccion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto, contexto }) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No se pudo mejorar la redacción");
      if (data.igual) {
        toast.success("El texto ya está bien redactado: no hace falta cambiar nada");
        return;
      }
      setAnterior(texto);
      onCambiar(data.texto as string);
      const lista = Array.isArray(data.correcciones) && data.correcciones.length ? ` — ${(data.correcciones as string[]).join("; ")}` : "";
      toast.success(`Redacción mejorada${lista}. Revísala antes de enviar.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={cargando || deshabilitado} onClick={mejorar}>
        <MagicStar className="size-4" /> {cargando ? "Mejorando…" : "Mejorar redacción"}
      </Button>
      {anterior !== null && !cargando && (
        <Button type="button" variant="ghost" size="sm" onClick={() => { onCambiar(anterior); setAnterior(null); }}>
          Deshacer
        </Button>
      )}
    </div>
  );
}
