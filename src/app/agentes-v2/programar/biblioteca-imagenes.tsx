"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { enviarV2, useV2 } from "@/components/agentes-v2/use-v2";
import { useOrganizacion } from "../organizacion-context";

interface Imagen { id: number; name: string; bytes: number; created_at: string }

const MAX_LADO = 1600;
const MAX_BYTES = 1_300_000;

/** URL de una imagen de la biblioteca (lleva la organización: las imágenes son de cada marca). */
export function urlImagen(id: number, organizacionId: string | null): string {
  return `/api/agentes-v2/social/assets/${id}${organizacionId ? `?organization_id=${organizacionId}` : ""}`;
}

/** Reduce la foto (lado máx. 1600 px, JPEG) para que quepa en el límite del servidor sin que tenga que preocuparse del tamaño. */
async function prepararArchivo(f: File): Promise<string> {
  const bmp = await createImageBitmap(f);
  const escala = Math.min(1, MAX_LADO / Math.max(bmp.width, bmp.height));
  const ancho = Math.max(1, Math.round(bmp.width * escala));
  const alto = Math.max(1, Math.round(bmp.height * escala));
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar la imagen");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(bmp, 0, 0, ancho, alto);
  bmp.close();
  for (const calidad of [0.88, 0.78, 0.66, 0.5]) {
    const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/jpeg", calidad));
    if (blob && blob.size <= MAX_BYTES) {
      return await new Promise<string>((ok, mal) => {
        const r = new FileReader();
        r.onload = () => ok(String(r.result));
        r.onerror = () => mal(new Error("No se pudo leer la imagen"));
        r.readAsDataURL(blob);
      });
    }
  }
  throw new Error("La imagen es demasiado pesada incluso reducida");
}

/**
 * Biblioteca de imágenes de la marca: se suben desde el ordenador y se eligen para las slides. Con `onElegir` al pulsar
 * una imagen se devuelve su id; sin él es solo para gestionar (subir y ver).
 */
export function BibliotecaImagenes({ abierto, onCerrar, onElegir }: { abierto: boolean; onCerrar: () => void; onElegir?: (id: number) => void }) {
  if (!abierto) return null;
  return <Contenido onCerrar={onCerrar} onElegir={onElegir} />;
}

function Contenido({ onCerrar, onElegir }: { onCerrar: () => void; onElegir?: (id: number) => void }) {
  const { organizacionId } = useOrganizacion();
  const { datos, error, recargar } = useV2<{ ok: boolean; assets: Imagen[] }>("social/assets?kind=image&manual=1");
  const ref = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const lista = datos?.assets ?? [];

  async function subir(archivos: FileList | null) {
    if (!archivos || !archivos.length) return;
    setSubiendo(true);
    let ultimo: number | null = null;
    let ok = 0;
    for (const f of Array.from(archivos)) {
      if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { toast.error(`«${f.name}»: solo se admiten PNG, JPEG o WebP`); continue; }
      try {
        const r = await enviarV2<{ asset: { id: number } }>("POST", "social/assets", { kind: "image", name: f.name.replace(/\.[^.]+$/, ""), data: await prepararArchivo(f) });
        ultimo = r.asset.id;
        ok += 1;
      } catch (e) {
        toast.error(`«${f.name}»: ${e instanceof Error ? e.message : "no se pudo subir"}`);
      }
    }
    setSubiendo(false);
    if (ref.current) ref.current.value = "";
    if (ok) {
      toast.success(ok === 1 ? "Imagen subida" : `${ok} imágenes subidas`);
      await recargar();
      if (onElegir && ok === 1 && ultimo) { onElegir(ultimo); onCerrar(); }
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !subiendo) onCerrar(); }}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ImagePlus className="size-5" /> Imágenes de la marca</DialogTitle>
          <DialogDescription>{onElegir ? "Elige una imagen para esta slide o sube una nueva desde tu ordenador." : "Sube aquí las imágenes que quieras usar en los carruseles; luego las eliges en cada slide."}</DialogDescription>
        </DialogHeader>

        <input ref={ref} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => subir(e.target.files)} />
        <Button type="button" variant="outline" disabled={subiendo} onClick={() => ref.current?.click()} className="w-fit">
          <Upload className="mr-1.5 size-4" /> {subiendo ? "Subiendo…" : "Subir imágenes"}
        </Button>

        {error && <p className="text-sm text-red-700">No se pudieron cargar las imágenes: {error}</p>}
        {!error && datos && lista.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay imágenes. Sube la primera.</p>}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {lista.map((a) => (
            <button
              key={a.id}
              type="button"
              title={a.name}
              disabled={!onElegir}
              onClick={() => { if (onElegir) { onElegir(a.id); onCerrar(); } }}
              className={`group relative aspect-[4/5] overflow-hidden rounded-md border bg-muted ${onElegir ? "hover:ring-2 hover:ring-primary" : "cursor-default"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urlImagen(a.id, organizacionId)} alt={a.name} loading="lazy" className="size-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-0.5 text-[10px] text-white">{a.name}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
