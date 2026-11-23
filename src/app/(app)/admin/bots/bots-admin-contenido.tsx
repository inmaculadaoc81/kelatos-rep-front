"use client";

import { useCallback, useEffect, useState } from "react";
import { Refresh2, TickCircle, CloseCircle, Warning2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";

type Estado = "al_dia" | "pendiente" | "caido" | "sin_datos" | "desconocido";

interface BotInfo {
  bot: string;
  nombre: string;
  repo: string;
  estado: Estado;
  reportado_hace_min: number | null;
  github: { sha: string; fecha: string | null; mensaje: string; viejo?: boolean } | null;
  imagen_etiqueta?: string;
  imagen_creada?: string;
  contenedor_desde?: string;
  responde?: boolean;
  version?: string;
  ultimo_despliegue?: string;
}

const ESTADOS: Record<Estado, { texto: string; clases: string }> = {
  al_dia: { texto: "Al día", clases: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400" },
  pendiente: { texto: "Pendiente de actualizar", clases: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400" },
  caido: { texto: "No responde", clases: "bg-destructive/10 text-destructive" },
  sin_datos: { texto: "Sin datos recientes", clases: "bg-destructive/10 text-destructive" },
  desconocido: { texto: "No se puede comparar", clases: "bg-muted text-muted-foreground" },
};

function fecha(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dashed py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{etiqueta}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

/** Admin > Estado de bots: ¿cada bot corre ya lo último que se subió a GitHub? */
export function BotsAdminContenido() {
  const [bots, setBots] = useState<BotInfo[]>([]);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/admin/bots", { cache: "no-store" });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "Error");
      setBots(d.bots);
      setAvisos(d.avisos || []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 60_000);
    return () => clearInterval(t);
  }, [cargar]);

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Estado de bots</h1>
          <p className="text-sm text-muted-foreground">
            Los bots se actualizan solos a los pocos minutos de subir un cambio a GitHub. Aquí se ve si cada uno ya corre lo último.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={cargar} disabled={cargando}>
          <Refresh2 className="mr-1.5 h-4 w-4" /> Actualizar
        </Button>
      </div>

      {error && <p className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        {bots.map((b) => {
          const e = ESTADOS[b.estado];
          const Icono = b.estado === "al_dia" ? TickCircle : b.estado === "pendiente" || b.estado === "desconocido" ? Warning2 : CloseCircle;
          return (
            <section key={b.bot} className="rounded-lg border bg-card p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h2 className="font-semibold">{b.nombre}</h2>
                <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium ${e.clases}`}>
                  <Icono className="h-3.5 w-3.5" /> {e.texto}
                </span>
              </div>
              <Dato etiqueta="Último cambio en GitHub">{fecha(b.github?.fecha)}</Dato>
              <Dato etiqueta="Versión en el servidor">{fecha(b.imagen_creada)}</Dato>
              <Dato etiqueta="Último despliegue">{fecha(b.ultimo_despliegue)}</Dato>
              <Dato etiqueta="Funcionando desde">{fecha(b.contenedor_desde)}</Dato>
              <Dato etiqueta="¿Responde?">{b.responde ? "Sí" : b.estado === "sin_datos" ? "—" : "No"}</Dato>
              {b.github?.mensaje && <p className="mt-2 text-xs text-muted-foreground">Último cambio: «{b.github.mensaje}»</p>}
              {b.estado === "sin_datos" && (
                <p className="mt-2 text-xs text-destructive">El servidor no ha enviado datos en los últimos 15 minutos.</p>
              )}
              {b.bot === "whatsapp" && (
                <p className="mt-2 text-xs text-muted-foreground">Este bot lleva además el arreglo de búsqueda por teléfono, por eso su imagen se llama «local».</p>
              )}
            </section>
          );
        })}
      </div>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-2 font-semibold">Últimos avisos del despliegue automático</h2>
        {avisos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin avisos.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {avisos.map((l, i) => (
              <li key={i} className={/ERROR|AVISO/.test(l) ? "text-destructive" : "text-muted-foreground"}>{l}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
