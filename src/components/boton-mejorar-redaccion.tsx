"use client";

import { useEffect, useState } from "react";
import { MagicStar, Refresh2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const FRASES = ["Revisando la ortografía…", "Corrigiendo tildes y puntuación…", "Puliendo el tono…", "Comprobando que los datos no cambian…", "Casi listo…"];

/** Línea de carga fina en violeta, como la de «Subir pedido con IA»: avance estimado que se frena antes del final hasta que llega el resultado. */
function BarraMejora({ desde }: { desde: number }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const segundos = Math.max(0, (ahora - desde) / 1000);
  const porcentaje = Math.round(92 * (1 - Math.exp(-segundos / 5)));
  const frase = FRASES[Math.min(Math.floor(segundos / 3), FRASES.length - 1)];
  return (
    <>
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400" aria-live="polite">
        <MagicStar className="size-3.5 animate-pulse" /> IA · {frase} <span className="tabular-nums">{porcentaje}%</span>
      </span>
      <div className="absolute inset-x-0 -bottom-1.5 h-0.5 overflow-hidden rounded-full bg-violet-500/15" role="progressbar" aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-violet-500 transition-[width] duration-300 ease-out" style={{ width: `${porcentaje}%` }} />
      </div>
    </>
  );
}

/**
 * Botón «Mejorar redacción»: manda el texto escrito a la IA, que corrige ortografía, tildes y puntuación y pule el tono sin cambiar lo que dice (importes, fechas,
 * correos y números se conservan). El texto mejorado sustituye al actual y se puede «Deshacer» para recuperar exactamente lo que se había escrito.
 */
export function BotonMejorarRedaccion({ texto, onCambiar, contexto = "", deshabilitado = false }: { texto: string; onCambiar: (nuevo: string) => void; contexto?: string; deshabilitado?: boolean }) {
  const [desde, setDesde] = useState<number | null>(null);
  const [anterior, setAnterior] = useState<string | null>(null);
  const cargando = desde !== null;

  async function mejorar() {
    if (texto.trim().length < 5) return toast.error("Escribe algo antes de mejorar la redacción");
    setDesde(Date.now());
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
      setDesde(null);
    }
  }

  return (
    <div className="relative pb-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button" variant="outline" size="sm"
          className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/40"
          disabled={cargando || deshabilitado} onClick={mejorar}
        >
          {cargando ? <Refresh2 className="size-4 animate-spin" /> : <MagicStar className="size-4" />}
          {cargando ? "Mejorando…" : "Mejorar redacción"}
        </Button>
        {anterior !== null && !cargando && (
          <Button type="button" variant="ghost" size="sm" onClick={() => { onCambiar(anterior); setAnterior(null); }}>
            Deshacer
          </Button>
        )}
        {cargando && desde !== null && <BarraMejora desde={desde} />}
      </div>
    </div>
  );
}
