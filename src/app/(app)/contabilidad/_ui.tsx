"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { apiC, CLASE_ESTADO, ETIQUETA_ESTADO, hoyISO, type Banco, type Categoria, type Cuenta, type EstadoAsiento } from "@/lib/contabilidad";

export function Cabecera({ icono, titulo, descripcion, acciones }: { icono: React.ReactNode; titulo: string; descripcion: string; acciones?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 to-green-600 text-white">{icono}</span>
        <div>
          <h1 className="text-lg font-semibold">{titulo}</h1>
          <p className="text-sm text-muted-foreground">{descripcion}</p>
        </div>
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  );
}

export function EstadoBadge({ estado }: { estado: EstadoAsiento }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CLASE_ESTADO[estado]}`}>{ETIQUETA_ESTADO[estado]}</span>;
}

export function Kpi({ titulo, valor, color, activo, onClick }: { titulo: string; valor: string; color: string; activo?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      aria-pressed={activo}
      className={`flex flex-col rounded-lg border bg-card px-3 py-2 text-left transition-colors ${onClick ? "hover:bg-muted/40" : "cursor-default"} ${activo ? "ring-2 ring-primary/50" : ""}`}
    >
      <span className="text-xs text-muted-foreground">{titulo}</span>
      <span className={`text-lg leading-tight font-semibold tabular-nums ${color}`}>{valor}</span>
    </button>
  );
}

export function CajaError({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null;
  return <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{mensaje}</div>;
}

export function FilasCarga({ columnas, filas = 5 }: { columnas: number; filas?: number }) {
  return (
    <>
      {Array.from({ length: filas }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: columnas }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function FilaVacia({ columnas, texto }: { columnas: number; texto: string }) {
  return (
    <TableRow>
      <TableCell colSpan={columnas} className="py-10 text-center text-sm text-muted-foreground">
        {texto}
      </TableCell>
    </TableRow>
  );
}

/** Desde / Hasta con atajos de periodo. Fechas en AAAA-MM-DD. */
export function FiltroFechas({ desde, hasta, onChange }: { desde: string; hasta: string; onChange: (d: string, h: string) => void }) {
  const hoy = hoyISO();
  const anio = Number(hoy.slice(0, 4));
  const mes = Number(hoy.slice(5, 7));
  const pad = (n: number) => String(n).padStart(2, "0");
  const finMes = (a: number, m: number) => `${a}-${pad(m)}-${pad(new Date(a, m, 0).getDate())}`;
  const trimIni = Math.floor((mes - 1) / 3) * 3 + 1;
  const atajos: [string, string, string][] = [
    ["Este mes", `${anio}-${pad(mes)}-01`, finMes(anio, mes)],
    ["Trimestre", `${anio}-${pad(trimIni)}-01`, finMes(anio, trimIni + 2)],
    ["Este año", `${anio}-01-01`, `${anio}-12-31`],
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input type="date" className="h-8 w-38" value={desde} onChange={(e) => onChange(e.target.value, hasta)} aria-label="Desde" />
      <span className="text-xs text-muted-foreground">a</span>
      <Input type="date" className="h-8 w-38" value={hasta} onChange={(e) => onChange(desde, e.target.value)} aria-label="Hasta" />
      {atajos.map(([et, d, h]) => (
        <Button key={et} variant={desde === d && hasta === h ? "secondary" : "ghost"} size="sm" className="h-8" onClick={() => onChange(d, h)}>
          {et}
        </Button>
      ))}
    </div>
  );
}

export function rangoAnioActual(): { desde: string; hasta: string } {
  const a = hoyISO().slice(0, 4);
  return { desde: `${a}-01-01`, hasta: `${a}-12-31` };
}

/** Plan de cuentas, bancos y categorías (una sola carga por montaje). */
export function usePlan() {
  const [datos, setDatos] = useState<{ cuentas: Cuenta[]; bancos: Banco[]; categorias: Categoria[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    let vivo = true;
    apiC<{ cuentas: Cuenta[]; bancos: Banco[]; categorias: Categoria[] }>("cuentas")
      .then((d) => vivo && setDatos(d))
      .catch((e) => vivo && setError(e instanceof Error ? e.message : "Error"));
    return () => {
      vivo = false;
    };
  }, [n]);
  return { ...(datos || { cuentas: [], bancos: [], categorias: [] }), cargado: !!datos, error, recargar: () => setN((x) => x + 1) };
}
