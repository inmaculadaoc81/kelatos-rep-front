"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiComercial, tiempoHablado, type ActividadAgente } from "@/lib/comercial";

function iso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Actividad de cada agente en un periodo: llamadas, contestadas, tiempo hablado y resultados. Sin comisiones (son internas). */
export default function ActividadPage() {
  const hoy = new Date();
  const hace7 = new Date(); hace7.setDate(hoy.getDate() - 6);
  const [desde, setDesde] = useState(iso(hace7));
  const [hasta, setHasta] = useState(iso(hoy));
  const [filas, setFilas] = useState<ActividadAgente[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setFilas((await apiComercial<{ agentes: ActividadAgente[] }>("actividad", { params: { desde, hasta } })).agentes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar");
    }
  }, [desde, hasta]);

  useEffect(() => {
    const t = setTimeout(() => void cargar(), 200);
    return () => clearTimeout(t);
  }, [cargar]);

  function rango(dias: number) {
    const a = new Date();
    const b = new Date(); b.setDate(a.getDate() - (dias - 1));
    setDesde(iso(b)); setHasta(iso(a));
  }

  const suma = (k: keyof ActividadAgente) => (filas ?? []).reduce((t, f) => t + (Number(f[k]) || 0), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Actividad de los agentes</h1>
        <p className="text-sm text-muted-foreground">Lo que ha hecho cada agente en el periodo elegido.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3.5 shadow-sm">
        <div><label className="mb-1 block text-xs text-muted-foreground">Desde</label><Input type="date" className="w-40" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
        <div><label className="mb-1 block text-xs text-muted-foreground">Hasta</label><Input type="date" className="w-40" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={() => rango(1)}>Hoy</Button>
          <Button variant="outline" size="sm" onClick={() => rango(7)}>7 días</Button>
          <Button variant="outline" size="sm" onClick={() => rango(30)}>30 días</Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      {!filas && !error && <Skeleton className="h-40 w-full" />}
      {filas && filas.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Todavía no hay agentes dados de alta.</p>}
      {filas && filas.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { t: "Llamadas", v: suma("llamadas") },
              { t: "Contestadas", v: suma("contestadas") },
              { t: "Tiempo hablado", v: tiempoHablado(suma("segundos")) },
              { t: "Interesados", v: suma("interesados") },
              { t: "Reuniones agendadas", v: suma("reuniones") },
            ].map((c) => (
              <div key={c.t} className="rounded-xl border bg-card p-3 shadow-sm">
                <div className="text-xs text-muted-foreground">{c.t}</div>
                <div className="text-xl font-semibold tabular-nums">{c.v}</div>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  {["Agente", "Llamadas", "Contestadas", "% contacto", "Tiempo hablado", "Interesados", "Reuniones", "Ventas", "No le interesa"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.agente} className="border-t">
                    <td className="px-3 py-2"><div className="font-medium">{f.nombre}</div><div className="text-xs text-muted-foreground">{f.agente}{!f.activo ? " · desactivado" : ""}</div></td>
                    <td className="px-3 py-2 tabular-nums">{f.llamadas}</td>
                    <td className="px-3 py-2 tabular-nums">{f.contestadas}</td>
                    <td className="px-3 py-2 tabular-nums">{f.llamadas ? `${Math.round((f.contestadas / f.llamadas) * 100)} %` : "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{tiempoHablado(f.segundos)}</td>
                    <td className="px-3 py-2 tabular-nums">{f.interesados}</td>
                    <td className="px-3 py-2 tabular-nums">{f.reuniones}</td>
                    <td className="px-3 py-2 tabular-nums">{f.ventas}</td>
                    <td className="px-3 py-2 tabular-nums">{f.no_interesa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
