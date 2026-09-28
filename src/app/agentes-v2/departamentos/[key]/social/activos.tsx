"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { enviarV2, useV2 } from "@/components/agentes-v2/use-v2";
import { cn } from "@/lib/utils";

export interface Activo { id: number; kind: "logo" | "image"; name: string; content_type: string; bytes: number; created_at: string }

export const urlActivo = (id: number) => `/api/agentes-v2/social/assets/${id}`;
const MAX_BYTES = 1.4 * 1024 * 1024;

export function useActivos(kind: "logo" | "image") {
  return useV2<{ ok: boolean; assets: Activo[] }>(`social/assets?kind=${kind}`);
}

const aBase64 = (f: File) =>
  new Promise<string>((ok, mal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => mal(new Error("No se pudo leer el archivo"));
    r.readAsDataURL(f);
  });

/** Botón «Subir imagen»: comprueba tipo y tamaño antes de enviar (el servidor lo vuelve a comprobar). */
export function SubirImagen({ kind, onSubida, etiqueta = "Subir imagen" }: { kind: "logo" | "image"; onSubida: (a: { id: number }) => void; etiqueta?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const elegir = async (f: File | undefined) => {
    if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) return toast.error("Solo se admiten imágenes PNG, JPEG o WebP");
    if (f.size > MAX_BYTES) return toast.error("La imagen pesa más de 1,4 MB: reduce su tamaño");
    setSubiendo(true);
    try {
      const r = await enviarV2<{ asset: { id: number } }>("POST", "social/assets", { kind, name: f.name.replace(/\.[^.]+$/, ""), data: await aBase64(f) });
      toast.success("Imagen subida");
      onSubida(r.asset);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo subir la imagen");
    } finally {
      setSubiendo(false);
      if (ref.current) ref.current.value = "";
    }
  };
  return (
    <>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => elegir(e.target.files?.[0])} />
      <Button type="button" size="sm" variant="outline" disabled={subiendo} onClick={() => ref.current?.click()}>{subiendo ? "Subiendo…" : etiqueta}</Button>
    </>
  );
}

/** Rejilla de imágenes ya subidas para elegir una. */
export function ElegirActivo({ kind, valor, onChange }: { kind: "logo" | "image"; valor: number | null; onChange: (id: number | null) => void }) {
  const { datos, recargar } = useActivos(kind);
  const lista = datos?.assets ?? [];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {lista.map((a) => (
          <button
            key={a.id}
            type="button"
            title={a.name}
            onClick={() => onChange(valor === a.id ? null : a.id)}
            className={cn("size-16 overflow-hidden rounded-md border bg-muted", valor === a.id && "ring-2 ring-primary")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urlActivo(a.id)} alt={a.name} loading="lazy" className="size-full object-contain" />
          </button>
        ))}
        {datos && lista.length === 0 && <p className="text-xs text-muted-foreground">Todavía no has subido ninguna.</p>}
      </div>
      <SubirImagen kind={kind} onSubida={(a) => { recargar(); onChange(a.id); }} />
    </div>
  );
}
