"use client";

import { toast } from "sonner";
import { Call, Copy } from "@/lib/icons";
import { useSoftphone } from "../softphone";

/** Número en formato marcable: solo dígitos y «+». Un número español de 9 cifras sin prefijo se marca con +34. */
function numeroMarcable(tel: string): string {
  const limpio = tel.replace(/[^\d+]/g, "");
  if (!limpio) return "";
  if (limpio.startsWith("+")) return limpio;
  if (limpio.startsWith("00")) return "+" + limpio.slice(2);
  return /^\d{9}$/.test(limpio) ? "+34" + limpio : limpio;
}

/**
 * Teléfono del cliente con botón «Llamar» (abre la app de llamadas del equipo: móvil, Teléfono de Windows, Teams, softphone…)
 * y «Copiar». Al pulsar Llamar se anota en el historial quién lo hizo.
 */
export function TelefonoLlamar({ telefono, resguardo, nombre }: { telefono: string | null | undefined; resguardo: string; nombre?: string | null }) {
  const softphone = useSoftphone();
  const tel = String(telefono || "").trim();
  if (!tel) return <span>-</span>;
  const marcable = numeroMarcable(tel);

  function anotarLlamada() {
    fetch(`/api/reparaciones/${encodeURIComponent(resguardo)}/llamada`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telefono: marcable }),
      keepalive: true,
    }).catch(() => {});
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(marcable || tel);
      toast.success("Teléfono copiado");
    } catch {
      toast.error("No se pudo copiar; selecciona el número a mano");
    }
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span>{tel}</span>
      {marcable && (
        <>
          {softphone.disponible ? (
            <button
              type="button"
              disabled={softphone.ocupado}
              onClick={() => void softphone.llamar({ telefono: marcable, resguardo, nombre: nombre || undefined })}
              className="inline-flex items-center gap-1 rounded-md border bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
              title={`Llamar al ${marcable} desde el dashboard (con grabación)`}
            >
              <Call className="size-3.5" /> Llamar
            </button>
          ) : (
            <a
              href={`tel:${marcable}`}
              onClick={anotarLlamada}
              className="inline-flex items-center gap-1 rounded-md border bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/10"
              title={`Llamar al ${marcable}`}
            >
              <Call className="size-3.5" /> Llamar
            </a>
          )}
          <button
            type="button"
            onClick={copiar}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
            title="Copiar el número"
          >
            <Copy className="size-3.5" /> Copiar
          </button>
        </>
      )}
    </span>
  );
}
