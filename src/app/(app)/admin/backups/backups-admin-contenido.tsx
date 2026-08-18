"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Save2, Refresh2, DocumentDownload, TickCircle, CloseCircle, Warning2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DRIVE_FOLDER_URL = "https://drive.google.com/open?id=14yBWDL6RcHztQ5hitZ71cLB4eak-O8ge";

interface Backup {
  id: string;
  nombre_archivo: string;
  tamano_bytes: string | null;
  creado_en: string;
  destino: string;
  origen: "programado" | "manual";
  solicitado_por: string | null;
  estado: "ok" | "error";
  error_detalle: string | null;
}

function euros(bytes: string | null): string {
  if (!bytes) return "—";
  const n = Number(bytes);
  if (!Number.isFinite(n)) return "—";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
}

function Badge({ tono, children }: { tono: "gris" | "verde" | "rojo"; children: React.ReactNode }) {
  const clases =
    tono === "verde"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400"
      : tono === "rojo"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${clases}`}>{children}</span>;
}

/**
 * Panel de Admin > Backups — historial de copias de la base de datos
 * (kelatos_app + kelatos_stage), botón para pedir una de más además de la
 * diaria automática, y enlace directo a la carpeta de Google Drive donde
 * quedan guardadas. La API no puede ejecutar pg_dump/rclone por su cuenta
 * (corre en un contenedor deliberadamente aislado) — "Backup ahora" solo
 * encola la petición; un cron del VPS la recoge en menos de un minuto.
 */
export function BackupsAdminContenido() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [solicitando, setSolicitando] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/admin/backups");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setBackups(data.backups || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function pedirBackup() {
    setSolicitando(true);
    const totalAntes = backups.length;
    try {
      const res = await fetch("/api/admin/backups", { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Backup solicitado — puede tardar hasta 1 minuto en aparecer aquí");

      // El cron del VPS revisa la solicitud cada minuto — se sondea cada
      // 5s hasta 90s para refrescar sola la lista en cuanto aparezca,
      // en vez de obligar a acordarse de pulsar "Actualizar" más tarde.
      let intentos = 0;
      pollRef.current = setInterval(async () => {
        intentos += 1;
        const r = await fetch("/api/admin/backups");
        const d = await r.json();
        if (d.ok && d.backups.length > totalAntes) {
          setBackups(d.backups);
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (intentos >= 18) {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }, 5000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSolicitando(false);
    }
  }

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Save2 className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold">Backups</h1>
          <p className="text-sm text-muted-foreground">Copia diaria automática (3:00) de la base de datos, guardada en Google Drive.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button className="gap-1.5" onClick={pedirBackup} disabled={solicitando}>
          <Save2 className="size-4" /> {solicitando ? "Solicitando…" : "Backup ahora"}
        </Button>
        <Button variant="outline" className="gap-1.5" nativeButton={false} render={<Link href={DRIVE_FOLDER_URL} target="_blank" rel="noreferrer" />}>
          <DocumentDownload className="size-4" /> Abrir carpeta en Drive
        </Button>
        <Button variant="ghost" size="icon" onClick={cargar} disabled={cargando} title="Actualizar">
          <Refresh2 className={cargando ? "size-4 animate-spin" : "size-4"} />
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar: {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Fecha</th>
              <th className="px-3 py-2 text-left font-medium">Archivo</th>
              <th className="px-3 py-2 text-left font-medium">Tamaño</th>
              <th className="px-3 py-2 text-left font-medium">Origen</th>
              <th className="px-3 py-2 text-left font-medium">Estado</th>
              <th className="px-3 py-2 text-left font-medium">Solicitado por</th>
            </tr>
          </thead>
          <tbody>
            {cargando && backups.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Cargando…</td></tr>
            ) : backups.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Todavía no hay backups registrados.</td></tr>
            ) : (
              backups.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="whitespace-nowrap px-3 py-2">{formatearFecha(b.creado_en)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{b.nombre_archivo}</td>
                  <td className="whitespace-nowrap px-3 py-2">{euros(b.tamano_bytes)}</td>
                  <td className="px-3 py-2">
                    <Badge tono="gris">{b.origen === "manual" ? "Manual" : "Programado"}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    {b.estado === "ok" ? (
                      <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                        <TickCircle className="size-3.5" /> OK
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-destructive" title={b.error_detalle || ""}>
                        <CloseCircle className="size-3.5" /> Error
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{b.solicitado_por || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Warning2 className="mt-0.5 size-3.5 shrink-0" />
        <span>Retención: copias locales en el VPS 7 días, en Drive 60 días — pasado ese tiempo se borran solas. &quot;Backup ahora&quot; encola la petición; un proceso del VPS la recoge en menos de un minuto.</span>
      </div>
    </div>
  );
}
