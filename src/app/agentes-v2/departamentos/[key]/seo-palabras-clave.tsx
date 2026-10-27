"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Refresh2 } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { useOrganizacion } from "@/app/agentes-v2/organizacion-context";
import type { FilaConsulta, ResumenGsc } from "@/app/api/seo/gsc/resumen/route";
import type { RespuestaSitiosGsc } from "@/app/api/seo/gsc/sitios/route";

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

/** Pide asignar a esta organización una propiedad de Search Console que la cuenta de servicio ya ve y todavía no pertenece a nadie. */
function AsignarPropiedad({ datos, organizacionId, nombreOrganizacion, alAsignar }: { datos: RespuestaSitiosGsc; organizacionId: string; nombreOrganizacion: string; alAsignar: () => void }) {
  const [asignando, setAsignando] = useState<string | null>(null);
  const libres = datos.visibles.filter((v) => !datos.sitios.some((s) => s.site === v.site && s.organizacion_id !== null));

  async function asignar(site: string) {
    setAsignando(site);
    try {
      const r = await fetch("/api/seo/gsc/sitios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site, organizacionId }) });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "Error desconocido");
      toast.success(`${nombreSitio(site)} asignada a ${nombreOrganizacion} (${d.filas} filas descargadas)`);
      alAsignar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo asignar");
    } finally {
      setAsignando(null);
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-dashed p-4 text-sm">
      <p className="font-medium">{nombreOrganizacion} todavía no tiene una web de Search Console asignada.</p>
      {libres.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Propiedades a las que Kelatos ya tiene acceso y que no pertenecen a ninguna organización:</p>
          {libres.map((v) => (
            <div key={v.site} className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2">
              <span className="truncate text-sm">{nombreSitio(v.site)}</span>
              <Button type="button" size="sm" disabled={asignando !== null} onClick={() => asignar(v.site)}>
                {asignando === v.site ? "Asignando…" : `Asignar a ${nombreOrganizacion}`}
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>¿No aparece la web? En Google Search Console → Ajustes → Usuarios y permisos → Añadir usuario, añade este correo con permiso <strong className="font-medium">Restringido</strong>:</p>
        {datos.cuentaServicio && <p className="select-all rounded bg-muted px-2 py-1 font-mono text-[11px] text-foreground">{datos.cuentaServicio}</p>}
        <p>Después vuelve aquí y recarga la página: aparecerá arriba para asignarla.</p>
      </div>
    </div>
  );
}

/** Palabras clave reales de Google Search Console (consultas con las que la gente llega a la web de la organización activa), descargadas solas cada 6 horas. */
export function PalabrasClaveGsc() {
  const { organizacionId, organizacion } = useOrganizacion();
  const [datosSitios, setDatosSitios] = useState<RespuestaSitiosGsc | null>(null);
  const [site, setSite] = useState("");
  const [dias, setDias] = useState(28);
  const [resumen, setResumen] = useState<{ clave: string; datos: ResumenGsc | null } | null>(null);
  const [actualizando, setActualizando] = useState(false);

  const cargarSitios = useCallback(() => {
    fetch("/api/seo/gsc/sitios").then((r) => r.json())
      .then((d) => setDatosSitios(d.ok ? (d as RespuestaSitiosGsc) : { configurado: false, cuentaServicio: null, visibles: [], sitios: [] }))
      .catch(() => setDatosSitios({ configurado: false, cuentaServicio: null, visibles: [], sitios: [] }));
  }, []);
  useEffect(() => { cargarSitios(); }, [cargarSitios]);

  // Solo las propiedades de la organización activa.
  const sitios = (datosSitios?.sitios ?? []).filter((s) => s.activo && organizacionId !== null && String(s.organizacion_id) === organizacionId);
  const siteActual = sitios.some((s) => s.site === site) ? site : (sitios[0]?.site ?? "");

  // `version` se incrementa para volver a pedir el resumen (p. ej. tras «Actualizar ahora»).
  const [version, setVersion] = useState(0);
  const clave = `${siteActual}|${dias}|${version}`;
  useEffect(() => {
    if (!siteActual) return;
    let vigente = true;
    fetch(`/api/seo/gsc/resumen?site=${encodeURIComponent(siteActual)}&dias=${dias}`).then((r) => r.json())
      .then((d) => { if (vigente) setResumen({ clave, datos: d.ok ? d.resumen : null }); })
      .catch(() => { if (vigente) setResumen({ clave, datos: null }); });
    return () => { vigente = false; };
  }, [siteActual, dias, clave]);

  async function actualizarAhora() {
    setActualizando(true);
    try {
      const r = await fetch("/api/seo/gsc/sincronizar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site: siteActual, dias: 10 }) });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "Error desconocido");
      toast.success(`Descargadas ${d.filas} filas de Search Console (${d.desde} a ${d.hasta})`);
      setVersion((v) => v + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar");
    } finally {
      setActualizando(false);
    }
  }

  if (datosSitios === null || organizacionId === null) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  if (!datosSitios.configurado) {
    return <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Search Console todavía no está conectado en el servidor.</p>;
  }
  if (sitios.length === 0) {
    return <AsignarPropiedad datos={datosSitios} organizacionId={organizacionId} nombreOrganizacion={organizacion?.name ?? "esta organización"} alAsignar={cargarSitios} />;
  }
  const datos = resumen?.clave === clave ? resumen.datos : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {sitios.length > 1 ? (
          <select className="h-8 rounded-md border bg-background px-2 text-sm" value={siteActual} onChange={(e) => setSite(e.target.value)}>
            {sitios.map((s) => <option key={s.site} value={s.site}>{nombreSitio(s.site)}</option>)}
          </select>
        ) : (
          <span className="text-sm font-medium">{nombreSitio(siteActual)}</span>
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
