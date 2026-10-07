"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DocumentUpload, ExportSquare, Video } from "@/lib/icons";

interface CarpetaDrive {
  id: string;
  name: string;
}

interface ArchivoDrive {
  id: string;
  name: string;
  mimeType: string;
}

function esImagen(mimeType: string) {
  return mimeType.startsWith("image/");
}

/** Lee un File como base64 puro (sin el prefijo "data:...;base64,"). */
function aBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => {
      const resultado = String(lector.result || "");
      resolve(resultado.slice(resultado.indexOf(",") + 1));
    };
    lector.onerror = () => reject(new Error("No se pudo leer el archivo"));
    lector.readAsDataURL(file);
  });
}

function TarjetaCarpeta({ carpeta }: { carpeta: CarpetaDrive }) {
  const [archivos, setArchivos] = useState<ArchivoDrive[] | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function cargar() {
    try {
      const r = await fetch(`/api/asistencia/kiosk/contenido/drive/carpetas/${carpeta.id}/archivos`);
      const d = await r.json();
      if (d.ok) setArchivos(d.archivos as ArchivoDrive[]);
    } catch {
      // silencioso — se reintenta solo con el próximo montaje/subida
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carpeta.id]);

  async function subirArchivo(file: File) {
    setSubiendo(true);
    try {
      const base64 = await aBase64(file);
      const res = await fetch(`/api/asistencia/kiosk/contenido/drive/carpetas/${carpeta.id}/archivos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: file.name, base64, mimeType: file.type || "application/octet-stream" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Archivo subido");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-xs font-semibold">{carpeta.name}</span>
          {archivos && <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">({archivos.length})</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
            title="Subir archivo"
            className="flex size-6 items-center justify-center rounded-md text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            <DocumentUpload className={cn("size-3.5", subiendo && "animate-pulse")} />
          </button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) subirArchivo(f); }}
          />
          <a
            href={`https://drive.google.com/drive/folders/${carpeta.id}`}
            target="_blank"
            rel="noreferrer"
            title="Abrir en Drive"
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <ExportSquare className="size-3.5" />
          </a>
        </span>
      </div>
      <div className="min-h-24 flex-1 p-2">
        {archivos === null ? (
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="aspect-square w-full rounded-md" />)}
          </div>
        ) : archivos.length === 0 ? (
          <p className="flex h-full items-center justify-center py-6 text-center text-[11px] text-muted-foreground">Sin archivos todavía.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {archivos.map((a) => (
              <a
                key={a.id}
                href={`/api/asistencia/kiosk/contenido/drive/archivo/${a.id}`}
                target="_blank"
                rel="noreferrer"
                title={a.name}
                className="group flex flex-col gap-1"
              >
                <span className="flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-muted/30 transition group-hover:border-primary/40">
                  {esImagen(a.mimeType) ? (
                    <img src={`/api/asistencia/kiosk/contenido/drive/archivo/${a.id}`} alt={a.name} className="size-full object-cover" />
                  ) : (
                    <Video className="size-5 text-muted-foreground" />
                  )}
                </span>
                <span className="truncate text-[9px] text-muted-foreground">{a.name}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/** Material que cualquiera sube (desde aquí mismo, o directamente en Drive)
    para que la community manager lo use al crear sus piezas — imágenes/
    vídeos/sonidos, en subcarpetas por tipo. Un contenedor por carpeta,
    todos visibles a la vez (no pestañas que ocultan las demás) — petición
    del usuario, 2026-10-07. Carpetas = subcarpetas reales de
    CONTENIDO_DRIVE_FOLDER_ID, listadas dinámicamente (sin nombres fijos en
    el código, las crea y nombra la propia community manager en Drive). */
export function MaterialDrive() {
  const [carpetas, setCarpetas] = useState<CarpetaDrive[] | null>(null);

  useEffect(() => {
    fetch("/api/asistencia/kiosk/contenido/drive/carpetas")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setCarpetas(d.carpetas as CarpetaDrive[]); })
      .catch(() => {});
  }, []);

  if (carpetas === null) {
    return (
      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b bg-muted/30 px-3.5 py-2.5"><span className="text-sm font-semibold">Material en Drive</span></div>
        <div className="p-3"><Skeleton className="h-24 w-full" /></div>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold">Material en Drive</h3>
        <p className="text-xs text-muted-foreground">Imágenes, vídeos y sonidos para usar al crear una pieza — súbelos aquí o directamente en Drive.</p>
      </div>
      {carpetas.length === 0 ? (
        <p className="rounded-lg border bg-card px-3 py-6 text-center text-xs text-muted-foreground">Todavía no hay carpetas configuradas.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {carpetas.map((c) => <TarjetaCarpeta key={c.id} carpeta={c} />)}
        </div>
      )}
    </section>
  );
}
