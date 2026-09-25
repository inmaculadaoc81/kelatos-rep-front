"use client";

import { useV2 } from "@/components/agentes-v2/use-v2";
import { fechaHoraLarga, type DetalleDepartamento, type Horario } from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";

const DIAS_LARGOS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const DIAS_CORTOS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

type HorarioConFechas = Horario & { last_run_at?: string | null };

/** "Lunes a las 07:00" / "Lunes, miércoles y viernes a las 09:00" / "Cada 60 minutos". */
export function describirHorario(h: Horario): string {
  if (h.kind === "interval") return `Cada ${h.interval_minutes ?? "?"} minutos`;
  const dias = [...h.days_of_week].sort().map((n) => DIAS_LARGOS[n - 1]).filter(Boolean);
  const lista = dias.length <= 1 ? dias.join("") : `${dias.slice(0, -1).join(", ")} y ${dias[dias.length - 1]}`;
  const horas = h.times.length ? h.times.join(" y ") : "—";
  return `${lista ? lista.charAt(0).toUpperCase() + lista.slice(1) : "Sin días"} a las ${horas}`;
}

/** Próxima ocurrencia del horario, calculada en la hora de su zona horaria (independiente de si está activo). */
export function proximaOcurrencia(h: Horario, ahora = new Date()): string | null {
  if (h.kind !== "weekly" || !h.days_of_week.length || !h.times.length) return null;
  const partes = new Intl.DateTimeFormat("en-GB", { timeZone: h.timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(ahora);
  const g = (t: string) => Number(partes.find((p) => p.type === t)?.value);
  const hoy = new Date(Date.UTC(g("year"), g("month") - 1, g("day")));
  const minutosAhora = (g("hour") % 24) * 60 + g("minute");
  for (let i = 0; i <= 7; i++) {
    const dia = new Date(hoy.getTime() + i * 86400000);
    const n = ((dia.getUTCDay() + 6) % 7) + 1;
    if (!h.days_of_week.includes(n)) continue;
    for (const t of [...h.times].sort()) {
      const [hh, mm] = t.split(":").map(Number);
      if (i === 0 && hh * 60 + mm <= minutosAhora) continue;
      const fecha = `${String(dia.getUTCDate()).padStart(2, "0")}/${String(dia.getUTCMonth() + 1).padStart(2, "0")}/${dia.getUTCFullYear()}`;
      return `${DIAS_CORTOS[n - 1]} ${fecha} ${t}`;
    }
  }
  return null;
}

interface StatsLlm {
  ok: boolean;
  by_purpose: { purpose: string; calls: number; failed: number; avg_ms: number }[];
}

const PROPOSITOS_INVESTIGADOR = ["seo.temas", "seo.ideas"];

const AGENTES: Record<string, { nombre: string; tipo: "ia" | "codigo"; paso: string; hace: string[]; entra: string; sale: string; duracion: string; tareasIa: (p: string) => boolean }> = {
  investigador_temas: {
    nombre: "Investigador de temas",
    tipo: "ia",
    paso: "Busca temas nuevos en fuentes del sector",
    hace: [
      "Lee fuentes reales del sector: blogs RSS/Atom y Google News sobre n8n, automatización, WhatsApp, reservas y clínicas.",
      "La IA se queda con lo relevante para tu nicho y propone ideas nuevas de guías, además de noticias.",
      "Descarta lo que ya está publicado en el blog o ya está en la lista, y puntúa cada tema.",
    ],
    entra: "Fuentes externas y los temas y artículos ya existentes",
    sale: "Temas nuevos en estado «Propuesto» (la lista crece sola)",
    duracion: "unos 3 minutos",
    tareasIa: (p) => PROPOSITOS_INVESTIGADOR.includes(p),
  },
  redactor_seo: {
    nombre: "Redactor SEO",
    tipo: "ia",
    paso: "Elige un tema, escribe el artículo y lo valida",
    hace: [
      "Elige el tema con más puntuación (los que priorices van primero), respetando los topes de 2 al día y 5 por semana.",
      "Escribe el artículo por partes: plan con título y descripción, introducción, cada sección y cierre.",
      "Pasa el validador (longitud, estructura, español, sin cifras ni precios sin fuente, sin repetir artículos) y corrige lo que rechace. Si no lo consigue, descarta el tema.",
    ],
    entra: "Un tema de la lista con su fuente, el tono y los artículos ya publicados",
    sale: "Un artículo en Markdown validado",
    duracion: "unos 5 minutos",
    tareasIa: (p) => p.startsWith("seo.") && !PROPOSITOS_INVESTIGADOR.includes(p),
  },
  publicador_blog: {
    nombre: "Publicador del blog",
    tipo: "codigo",
    paso: "Sube el artículo validado a la web",
    hace: [
      "Vuelve a validar el artículo justo antes de publicar.",
      "Con «publicar automáticamente» apagado, lo deja en Aprobaciones y espera tu decisión; encendido, sigue solo.",
      "Guarda el artículo como un archivo .md nuevo en content/blog del repositorio de la web (nunca sobrescribe uno existente). Hostinger recompila y el artículo aparece en el blog.",
    ],
    entra: "El artículo validado",
    sale: "Un archivo nuevo en GitHub y la URL pública del artículo",
    duracion: "unos segundos, más lo que tarde Hostinger en desplegar",
    tareasIa: () => false,
  },
};

/** Los agentes del departamento SEO: qué hace cada uno, cuándo se lanza y cómo le está yendo. */
export function SeoAgentes({ d, irA }: { d: DetalleDepartamento; irA?: (pestana: string) => void }) {
  const stats = useV2<StatsLlm>("llm-stats?days=7");
  const activo = d.department.status === "active";
  const agentes = [...d.agents].sort((a, b) => Number(a.id) - Number(b.id));
  const workflowDe = (id: string | null) => d.workflows.find((w) => String(w.id) === String(id));

  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        {agentes.map((a, i) => {
          const info = AGENTES[a.agent_key];
          const wf = workflowDe(a.workflow_id);
          const horarios = (d.schedules as HorarioConFechas[]).filter((s) => wf && String(s.workflow_id) === String(wf.id));
          const mias = (stats.datos?.by_purpose ?? []).filter((p) => info?.tareasIa(p.purpose));
          const llamadas = mias.reduce((s, p) => s + p.calls, 0);
          const fallos = mias.reduce((s, p) => s + p.failed, 0);
          const media = llamadas ? Math.round(mias.reduce((s, p) => s + p.avg_ms * p.calls, 0) / llamadas / 100) / 10 : 0;
          return (
            <article key={a.id} className="rounded-lg border p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
                <h3 className="text-sm font-semibold">{info?.nombre ?? a.agent_key}</h3>
                <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", info?.tipo === "codigo" ? "bg-slate-500/10 text-slate-600" : "bg-violet-500/10 text-violet-700")}>{info?.tipo === "codigo" ? "Código, sin IA" : "Usa IA"}</span>
                <span className={cn("ml-auto text-xs", a.enabled ? "text-green-700" : "text-muted-foreground")}>{a.enabled ? "Habilitado" : "Deshabilitado"}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{info?.paso ?? wf?.name}</p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-muted-foreground">Cuándo</dt>
                <dd>
                  {horarios.length === 0 ? "Sin horario" : horarios.map((h) => (
                    <span key={h.id ?? h.name} className={cn("block", !h.enabled && "text-muted-foreground line-through")}>{describirHorario(h)}</span>
                  ))}
                </dd>
                {info && (<><dt className="text-muted-foreground">Tarda</dt><dd>{info.duracion}</dd></>)}
                {info?.tipo === "ia" && (
                  <>
                    <dt className="text-muted-foreground">7 días</dt>
                    <dd>{stats.cargando && !stats.datos ? "…" : llamadas ? `${llamadas} llamadas a la IA · media ${media.toLocaleString("es-ES")} s${fallos ? ` · ${fallos} con error` : ""}` : "Sin llamadas a la IA"}</dd>
                  </>
                )}
              </dl>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-primary select-none">Qué hace y qué entrega</summary>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {(info?.hace ?? [a.role]).map((t) => <li key={t}>{t}</li>)}
                </ul>
                {info && <p className="mt-1.5 text-xs text-muted-foreground"><span className="font-medium text-foreground">Recibe:</span> {info.entra}. <span className="font-medium text-foreground">Entrega:</span> {info.sale}.</p>}
              </details>
            </article>
          );
        })}
      </div>

      <section>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Programación</h3>
          {irA && <button type="button" className="text-xs text-primary hover:underline" onClick={() => irA("horario")}>Cambiar horario</button>}
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-2.5 py-1.5 font-medium">Horario</th>
                <th className="px-2.5 py-1.5 font-medium">Próxima vez</th>
                <th className="px-2.5 py-1.5 font-medium">Última vez</th>
                <th className="px-2.5 py-1.5 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(d.schedules as HorarioConFechas[]).map((h) => (
                <tr key={h.id ?? h.name}>
                  <td className="px-2.5 py-1.5"><span className="font-medium">{h.name || "Sin nombre"}</span><span className="block text-muted-foreground">{describirHorario(h)} ({h.timezone})</span></td>
                  <td className="px-2.5 py-1.5 tabular-nums">{proximaOcurrencia(h) ?? "—"}</td>
                  <td className="px-2.5 py-1.5 tabular-nums">{h.last_run_at ? fechaHoraLarga(h.last_run_at) : "Aún no"}</td>
                  <td className="px-2.5 py-1.5">{!h.enabled ? "Desactivado" : activo ? "Activo" : "Sin lanzar"}</td>
                </tr>
              ))}
              {d.schedules.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">Sin horarios definidos.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">Tiempo máximo por ejecución: 10 min al buscar temas y 15 al escribir; se reintenta una vez si falla. Hora de Madrid.</p>
      </section>
    </div>
  );
}
