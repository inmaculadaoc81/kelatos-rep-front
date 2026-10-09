"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CardPos, Refresh2 } from "@/lib/icons";
import { TpvFotoApi, TpvImporteApi, hoyMadrid } from "@/lib/tpv";
import { DiaTpvCard } from "./dia-tpv-card";

/** Suma `n` días a una fecha "AAAA-MM-DD" (aritmética en UTC, sin husos) —
    mismo helper que efectivo/page.tsx. */
function sumarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const PERIODOS: { id: string; etiqueta: string; rango: (hoy: string) => [string, string] }[] = [
  { id: "hoy", etiqueta: "Hoy", rango: (h) => [h, h] },
  { id: "7d", etiqueta: "Últimos 7 días", rango: (h) => [sumarDias(h, -6), h] },
  { id: "mes", etiqueta: "Este mes", rango: (h) => [`${h.slice(0, 8)}01`, h] },
];

/** Lista de fechas "AAAA-MM-DD" entre desde y hasta (inclusive), más
    reciente primero. */
function rangoDeDias(desde: string, hasta: string): string[] {
  const out: string[] = [];
  let actual = hasta;
  let guard = 0;
  while (actual >= desde && guard < 366) {
    out.push(actual);
    actual = sumarDias(actual, -1);
    guard += 1;
  }
  return out;
}

export default function TpvPage() {
  const hoy = hoyMadrid();
  const [segunSistema, setSegunSistema] = useState<Record<string, Record<string, number>>>({});
  const [importes, setImportes] = useState<TpvImporteApi[]>([]);
  const [fotos, setFotos] = useState<TpvFotoApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [desde, setDesde] = useState(sumarDias(hoy, -6));
  const [hasta, setHasta] = useState(hoy);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/tpv");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setSegunSistema(data.segunSistema);
      setImportes(data.importes);
      setFotos(data.fotos);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const periodoActivo = PERIODOS.find((p) => {
    const [d, h] = p.rango(hoy);
    return d === desde && h === hasta;
  })?.id;

  function aplicarPeriodo(id: string) {
    const p = PERIODOS.find((x) => x.id === id);
    if (!p) return;
    const [d, h] = p.rango(hoy);
    setDesde(d);
    setHasta(h);
  }

  const dias = useMemo(() => (desde && hasta && desde <= hasta ? rangoDeDias(desde, hasta) : []), [desde, hasta]);

  const importesPorDia = useMemo(() => {
    const out: Record<string, TpvImporteApi[]> = {};
    for (const i of importes) (out[i.fecha] ||= []).push(i);
    return out;
  }, [importes]);

  const fotosPorDia = useMemo(() => {
    const out: Record<string, TpvFotoApi[]> = {};
    for (const f of fotos) (out[f.fecha] ||= []).push(f);
    return out;
  }, [fotos]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <CardPos className="size-5 text-purple-600" /> TPV
          </h1>
          <p className="text-sm text-muted-foreground">
            Declara lo que marca el datáfono cada día (tarjeta, tarjeta virtual, Bizum, transferencia) y adjunta el ticket de cierre, para cuadrarlo contra lo facturado en el sistema.
          </p>
        </div>
        <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar">
          <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>Desde</span>
          <Input type="date" className="w-40" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} />
          <span>hasta</span>
          <Input type="date" className="w-40" value={hasta} min={desde} max={hoy} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <div className="flex items-center gap-1">
          {PERIODOS.map((p) => (
            <Button key={p.id} type="button" size="sm" variant={periodoActivo === p.id ? "default" : "outline"} className="h-8" onClick={() => aplicarPeriodo(p.id)}>
              {p.etiqueta}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>
      )}

      {cargando ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {dias.map((dia) => (
            <DiaTpvCard
              key={dia}
              dia={dia}
              hoy={hoy}
              segunSistema={segunSistema[dia] || {}}
              importes={importesPorDia[dia] || []}
              fotos={fotosPorDia[dia] || []}
              onCambiado={cargar}
            />
          ))}
          {dias.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Elige un rango de fechas válido</p>}
        </div>
      )}
    </div>
  );
}
