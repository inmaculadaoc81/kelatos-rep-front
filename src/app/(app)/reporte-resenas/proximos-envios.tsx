"use client";

import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EnvioResenaProgramado, EstadoEnvioResena, ProximosEnvios } from "@/lib/resenas";
import { cn } from "@/lib/utils";

type Filtro = "todos" | EstadoEnvioResena;

const ETIQUETA_ESTADO: Record<EstadoEnvioResena, string> = {
  pendiente: "Programado",
  enviado: "Enviado",
  cancelado: "Cancelado",
  fallido: "Falló",
};

const COLOR_ESTADO: Record<EstadoEnvioResena, string> = {
  pendiente: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  enviado: "bg-green-500/10 text-green-700 dark:text-green-400",
  cancelado: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  fallido: "bg-red-500/10 text-red-700 dark:text-red-400",
};

function fecha(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function faltan(f: EnvioResenaProgramado): string {
  if (f.estado !== "pendiente" || f.dias_restantes === null) return "—";
  if (f.dias_restantes <= 0) return "Hoy / en cola";
  return f.dias_restantes === 1 ? "1 día" : `${f.dias_restantes} días`;
}

export function PestanaProximosEnvios({ recargar }: { recargar: number }) {
  const [datos, setDatos] = useState<ProximosEnvios | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("pendiente");

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/resenas/programadas", { cache: "no-store" });
      const data = (await res.json()) as ProximosEnvios & { error?: string };
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setDatos(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar, recargar]);

  const filas = (datos?.filas ?? []).filter((f) => filtro === "todos" || f.estado === filtro);
  const total = datos ? datos.filas.length : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {(["pendiente", "enviado", "cancelado", "fallido", "todos"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFiltro(k)}
            aria-pressed={filtro === k}
            className={cn("rounded-full border px-3 py-1 text-xs transition-colors", filtro === k ? "border-amber-500 bg-amber-500/10 font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {k === "todos" ? `Todos (${total})` : `${ETIQUETA_ESTADO[k]} (${datos?.resumen[k] ?? 0})`}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-400">{error}</div>
      ) : !datos ? (
        <div className="space-y-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
      ) : filas.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          {filtro === "pendiente"
            ? "No hay envíos programados. Se programan solos 7 días después de entregar cada reparación."
            : "No hay envíos con este estado."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resguardo</TableHead>
                <TableHead>Estado reparación</TableHead>
                <TableHead>Envío</TableHead>
                <TableHead>Faltan</TableHead>
                <TableHead>Se envía</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Enviado el</TableHead>
                <TableHead>Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((f) => (
                <TableRow key={`${f.origen}-${f.id}`}>
                  <TableCell className="whitespace-nowrap text-sm font-medium">{f.referencia || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{f.origen === "alquiler" ? "Alquiler" : f.estado_reparacion || "—"}</TableCell>
                  <TableCell>
                    <span className={cn("inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium", COLOR_ESTADO[f.estado])}>{ETIQUETA_ESTADO[f.estado]}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm font-medium tabular-nums">{faltan(f)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm tabular-nums">{fecha(f.enviar_en)}</TableCell>
                  <TableCell className="max-w-48 truncate text-sm font-medium" title={f.cliente || undefined}>{f.cliente || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{f.telefono || "—"}</TableCell>
                  <TableCell className="text-sm">{f.origen === "alquiler" ? "Alquiler" : "Reparación"}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm tabular-nums">{fecha(f.enviado_en)}</TableCell>
                  <TableCell className="max-w-64 truncate text-sm text-muted-foreground" title={f.ultimo_error || f.detalle || undefined}>
                    {f.ultimo_error ? `Error (${f.intentos} intentos): ${f.ultimo_error}` : f.detalle || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Al entregar una reparación arreglada (no reciclaje) se programa la encuesta por WhatsApp para 7 días después, salvo que se marque «No» en la entrega. Solo afecta a entregas nuevas.
      </p>
    </div>
  );
}
