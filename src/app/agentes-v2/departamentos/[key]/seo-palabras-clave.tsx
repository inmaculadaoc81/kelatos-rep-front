"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Refresh2 } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { FilaConsulta, ResumenGsc } from "@/app/api/seo/gsc/resumen/route";

const nombreSitio = (s: string) => s.replace(/^sc-domain:/, "").replace(/^https?:\/\//, "").replace(/\/$/, "");
const fechaHora = (iso: string | null) => (iso ? new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "nunca");
const num = (n: number) => n.toLocaleString("es-ES");

function Tabla({ titulo, ayuda, filas, vacio }: { titulo: string; ayuda: string; filas: FilaConsulta[]; vacio: string }) {
  return (
    <section className="space-y-1.5">
      <div>
        <h3 className="text-sm font-semibold">{titulo}</h3>
        <p className="text-xs text-muted-foreground">{ayuda}</p>
      </div>
      {filas.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">{vacio}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-2.5 py-1.5 text-left font-medium">Consulta</th>
                <th className="px-2.5 py-1.5 text-right font-medium">Impresiones</th>
                <th className="px-2.5 py-1.5 text-right font-medium">Clics</th>
                <th className="px-2.5 py-1.5 text-right font-medium">Posición</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.consulta} className="border-t">
                  <td className="max-w-64 truncate px-2.5 py-1.5" title={f.consulta}>{f.consulta}</td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums">{num(f.impresiones)}</td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums">{num(f.clics)}</td>
                  <td className={cn("px-2.5 py-1.5 text-right tabular-nums", f.posicion && Number(f.posicion) <= 10 && "font-medium text-emerald-700 dark:text-emerald-400")}>{f.posicion ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Palabras clave reales de Google Search Console (consultas con las que la gente llega a la web), descargadas solas cada 6 horas. */
export function PalabrasClaveGsc() {
  const [sitios, setSitios] = useState<{ site: string; activo: boolean; ultima_sync: string | null }[] | null>(null);
  const [configurado, setConfigurado] = useState(true);
  const [site, setSite] = useState("");
  const [dias, setDias] = useState(28);
  const [resumen, setResumen] = useState<{ clave: string; datos: ResumenGsc | null } | null>(null);
  const [actualizando, setActualizando] = useState(false);

  useEffect(() => {
    fetch("/api/seo/gsc/sitios").then((r) => r.json()).then((d) => {
      if (!d.ok) { setSitios([]); return; }
      setConfigurado(d.configurado);
      const activos = (d.sitios as { site: string; activo: boolean; ultima_sync: string | null }[]).filter((s) => s.activo);
      setSitios(activos);
      if (activos[0]) setSite(activos[0].site);
    }).catch(() => setSitios([]));
  }, []);

  const clave = `${site}|${dias}`;
  const cargar = useCallback(() => {
    if (!site) return;
    fetch(`/api/seo/gsc/resumen?site=${encodeURIComponent(site)}&dias=${dias}`).then((r) => r.json())
      .then((d) => setResumen({ clave: `${site}|${dias}`, datos: d.ok ? d.resumen : null }))
      .catch(() => setResumen({ clave: `${site}|${dias}`, datos: null }));
  }, [site, dias]);
  useEffect(() => { cargar(); }, [cargar]);

  async function actualizarAhora() {
    setActualizando(true);
    try {
      const r = await fetch("/api/seo/gsc/sincronizar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site, dias: 10 }) });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "Error desconocido");
      toast.success(`Descargadas ${d.filas} filas de Search Console (${d.desde} a ${d.hasta})`);
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar");
    } finally {
      setActualizando(false);
    }
  }

  if (sitios === null) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  if (!configurado || sitios.length === 0) {
    return <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Search Console todavía no está conectado a ninguna web.</p>;
  }
  const datos = resumen?.clave === clave ? resumen.datos : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {sitios.length > 1 ? (
          <select className="h-8 rounded-md border bg-background px-2 text-sm" value={site} onChange={(e) => setSite(e.target.value)}>
            {sitios.map((s) => <option key={s.site} value={s.site}>{nombreSitio(s.site)}</option>)}
          </select>
        ) : (
          <span className="text-sm font-medium">{nombreSitio(site)}</span>
        )}
        <div className="inline-flex rounded-lg border bg-card p-0.5">
          {[7, 28, 90].map((d) => (
            <Button key={d} type="button" size="sm" variant={dias === d ? "default" : "ghost"} className="h-7 px-2.5 text-xs" onClick={() => setDias(d)}>{d} días</Button>
          ))}
        </div>
        <Button type="button" size="sm" variant="outline" className="ml-auto h-8 gap-1.5" disabled={actualizando} onClick={actualizarAhora}>
          <Refresh2 className={cn("size-3.5", actualizando && "animate-spin")} /> Actualizar ahora
        </Button>
      </div>

      {datos === undefined && <p className="text-sm text-muted-foreground">Cargando consultas…</p>}
      {datos === null && <p className="text-sm text-destructive">No se pudieron cargar las consultas.</p>}
      {datos && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[["Impresiones", datos.totales.impresiones], ["Clics", datos.totales.clics], ["Consultas distintas", datos.totales.consultas]].map(([t, v]) => (
              <div key={String(t)} className="rounded-lg border bg-card p-3">
                <p className="text-[11px] text-muted-foreground">{t}</p>
                <p className="text-lg font-semibold tabular-nums">{num(Number(v))}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Última descarga: {fechaHora(datos.ultimaSync)}. Los datos de Google llevan 2-3 días de retraso y omiten las consultas con muy pocas búsquedas.
            {datos.ultimoError && <span className="text-destructive"> Último error: {datos.ultimoError}</span>}
          </p>
          <Tabla titulo="Oportunidades" ayuda="Consultas en posición 8-20 con búsquedas: las más fáciles de subir a la primera página. Buenas para escribir o mejorar un artículo." filas={datos.oportunidades} vacio="Todavía no hay consultas en esa franja." />
          <Tabla titulo="Consultas nuevas (últimos 7 días)" ayuda="Aparecen ahora y antes no salían: señales de por dónde empieza a encontrarte la gente." filas={datos.nuevas} vacio="No hay consultas nuevas esta semana." />
          <Tabla titulo="Consultas principales" ayuda="Ordenadas por impresiones." filas={datos.principales.slice(0, 40)} vacio="Sin datos en este periodo." />
        </>
      )}
    </div>
  );
}
