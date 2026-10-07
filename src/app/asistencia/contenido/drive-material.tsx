"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ExportSquare, Video } from "@/lib/icons";

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

/** Material que cualquiera sube a mano en Drive (imágenes/vídeos/sonidos,
    en subcarpetas por tipo) para que la community manager lo use al crear
    sus piezas — ella no sube nada desde aquí, solo lo ve/descarga; subir
    sigue siendo directamente en Drive ("Abrir en Drive" por carpeta).
    Carpetas = subcarpetas reales de CONTENIDO_DRIVE_FOLDER_ID, listadas
    dinámicamente (sin nombres fijos en el código, las crea y nombra la
    propia community manager en Drive). Petición del usuario, 2026-10-07. */
export function MaterialDrive() {
  const [carpetas, setCarpetas] = useState<CarpetaDrive[] | null>(null);
  const [carpetaId, setCarpetaId] = useState<string | null>(null);
  const [archivos, setArchivos] = useState<ArchivoDrive[] | null>(null);
  const [cargandoArchivos, setCargandoArchivos] = useState(false);

  useEffect(() => {
    fetch("/api/asistencia/kiosk/contenido/drive/carpetas")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) return;
        const lista = d.carpetas as CarpetaDrive[];
        setCarpetas(lista);
        if (lista.length > 0) setCarpetaId(lista[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!carpetaId) return;
    let activo = true;
    setCargandoArchivos(true);
    fetch(`/api/asistencia/kiosk/contenido/drive/carpetas/${carpetaId}/archivos`)
      .then((r) => r.json())
      .then((d) => { if (activo && d.ok) setArchivos(d.archivos as ArchivoDrive[]); })
      .catch(() => {})
      .finally(() => { if (activo) setCargandoArchivos(false); });
    return () => { activo = false; };
  }, [carpetaId]);

  if (carpetas === null) {
    return (
      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b bg-muted/30 px-3.5 py-2.5"><span className="text-sm font-semibold">Material en Drive</span></div>
        <div className="p-3"><Skeleton className="h-24 w-full" /></div>
      </section>
    );
  }

  if (carpetas.length === 0) {
    return (
      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b bg-muted/30 px-3.5 py-2.5"><span className="text-sm font-semibold">Material en Drive</span></div>
        <p className="px-3 py-6 text-center text-xs text-muted-foreground">Todavía no hay carpetas configuradas.</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b bg-muted/30 px-3.5 py-2.5">
        <span className="text-sm font-semibold">Material en Drive</span>
        <p className="mt-0.5 text-xs text-muted-foreground">Imágenes, vídeos y sonidos que ha subido cualquiera, para usar al crear una pieza.</p>
      </div>
      <div className="space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {carpetas.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { setArchivos(null); setCarpetaId(c.id); }}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                c.id === carpetaId ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {c.name}
            </button>
          ))}
          {carpetaId && (
            <a
              href={`https://drive.google.com/drive/folders/${carpetaId}`}
              target="_blank"
              rel="noreferrer"
              className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Abrir en Drive <ExportSquare className="size-3" />
            </a>
          )}
        </div>

        {cargandoArchivos ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="aspect-square w-full rounded-md" />)}
          </div>
        ) : !archivos || archivos.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Sin archivos en esta carpeta todavía.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
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
                    // eslint-disable-next-line @next/next/no-img-element -- origen autenticado propio (proxy con sesión), no un dominio externo que next/image deba optimizar
                    <img src={`/api/asistencia/kiosk/contenido/drive/archivo/${a.id}`} alt={a.name} className="size-full object-cover" />
                  ) : (
                    <Video className="size-6 text-muted-foreground" />
                  )}
                </span>
                <span className="truncate text-[10px] text-muted-foreground">{a.name}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
