"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Gallery } from "@/lib/icons";
import { resolverBlobImagen, comprimirImagen } from "@/lib/foto-captura";

/** Botón para añadir una o varias fotos de recogida a una reparación ya entregada (las fotos se suman a las que ya hay). */
export function AnadirFotosRecogida({ resguardo, onAnadidas }: { resguardo: string; onAnadidas: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files || []);
    e.target.value = "";
    if (archivos.length === 0) return;
    if (archivos.length > 10) { toast.error("Máximo 10 fotos cada vez"); return; }
    setSubiendo(true);
    try {
      // Una a una: procesar varias fotos grandes a la vez puede ir lento en un PC modesto.
      const fotos: { base64: string; mime: string }[] = [];
      for (const f of archivos) {
        try {
          fotos.push(await comprimirImagen(await resolverBlobImagen(f)));
        } catch {
          toast.error(`No se pudo procesar «${f.name}»; prueba con otra foto`);
        }
      }
      if (fotos.length === 0) return;
      const res = await fetch(`/api/reparaciones/${encodeURIComponent(resguardo)}/fotos-recogida`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fotos }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "Error desconocido");
      toast.success(`${d.anadidas} foto${d.anadidas !== 1 ? "s" : ""} añadida${d.anadidas !== 1 ? "s" : ""} a la recogida`);
      onAnadidas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={elegir} disabled={subiendo} />
      <Button type="button" size="sm" variant="outline" className="h-7 gap-1.5" disabled={subiendo} onClick={() => inputRef.current?.click()} title="Añade las fotos del equipo al entregarlo; puedes elegir una o varias">
        <Gallery className="size-3.5" /> {subiendo ? "Subiendo…" : "Añadir fotos"}
      </Button>
    </>
  );
}
