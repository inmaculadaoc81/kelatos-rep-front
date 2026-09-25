"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useV2 } from "@/components/agentes-v2/use-v2";
import { EstadoRunBadge } from "@/components/agentes-v2/componentes";
import { fechaHora, type DetalleDepartamento, type Horario } from "@/lib/agentes-v2";
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
      const fecha = `${String(dia.getUTCDate()).padStart(2, "0")}/${String(dia.getUTCMonth() + 1).padStart(2, "0")}`;
      return `${i === 0 ? "hoy" : i === 1 ? "mañana" : DIAS_CORTOS[n - 1]} ${fecha} a las ${t}`;
    }
  }
  return null;
}

interface Sistema { ok: boolean; scheduler: { active: boolean } }
interface EstadoSeo {
  ok: boolean;
  github: { configured: boolean; ok?: boolean; repository?: string; can_push?: boolean };
  publish_mode: "auto" | "approval";
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
    paso: "Descubrimiento de temas",
    hace: [
      "Lee fuentes reales del sector: blogs RSS/Atom y Google News sobre n8n, automatización, WhatsApp, reservas y clínicas.",
      "La IA se queda con lo relevante para tu nicho y propone ideas nuevas de guías, además de noticias.",
      "Descarta lo que ya está publicado en el blog o ya está en la lista, y puntúa cada tema.",
    ],
    entra: "Fuentes externas + temas y artículos ya existentes",
    sale: "Temas nuevos en estado «Propuesto» (la lista crece sola)",
    duracion: "unos 3 minutos",
    tareasIa: (p) => PROPOSITOS_INVESTIGADOR.includes(p),
  },
  redactor_seo: {
    nombre: "Redactor SEO",
    tipo: "ia",
    paso: "Contenido SEO · pasos 1 y 2",
    hace: [
      "Elige el tema con más puntuación (los que tú priorices van primero), respetando los topes de 2 al día y 5 por semana.",
      "Escribe el artículo por partes: plan con título y descripción, introducción, cada sección y cierre.",
      "Pasa el validador (longitud, estructura, español, sin cifras ni precios sin fuente, sin repetir artículos) y corrige lo que le rechace. Si no lo consigue, descarta el tema.",
    ],
    entra: "Un tema de la lista + su fuente, el tono y los artículos ya publicados",
    sale: "Un artículo en Markdown validado",
    duracion: "unos 5 minutos",
    tareasIa: (p) => p.startsWith("seo.") && !PROPOSITOS_INVESTIGADOR.includes(p),
  },
  publicador_blog: {
    nombre: "Publicador del blog",
    tipo: "codigo",
    paso: "Contenido SEO · pasos 3 y 4",
    hace: [
      "Vuelve a validar el artículo justo antes de publicar.",
      "Con «publicar automáticamente» apagado, lo deja en Aprobaciones y espera tu decisión; encendido, sigue solo.",
      "Guarda el artículo como un archivo .md nuevo en content/blog del repositorio de la web (nunca sobrescribe uno existente). Hostinger recompila y el artículo aparece en el blog.",
    ],
    entra: "El artículo validado",
    sale: "Un archivo nuevo en GitHub y la URL pública del artículo",
    duracion: "unos segundos (más lo que tarde Hostinger en desplegar)",
    tareasIa: () => false,
  },
};

function Requisito({ ok, titulo, detalle, accion }: { ok: boolean | null; titulo: string; detalle: string; accion?: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 px-3 py-2.5 text-sm">
      <span
        aria-hidden
        className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold", ok === null ? "bg-slate-500/10 text-slate-500" : ok ? "bg-green-500/15 text-green-700" : "bg-amber-500/15 text-amber-700")}
      >
        {ok === null ? "…" : ok ? "✓" : "!"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{titulo}</p>
        <p className="text-xs text-muted-foreground">{detalle}</p>
      </div>
      {accion}
    </li>
  );
}

function Paso({ n, titulo, quien, tipo, cuando, texto }: { n: number; titulo: string; quien: string; tipo: "IA" | "Código"; cuando: string; texto: string }) {
  return (
  <div className="flex-1 rounded-lg border bg-card p-4">
    <div className="flex items-center gap-2">
      <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{n}</span>
      <p className="text-sm font-semibold">{titulo}</p>
      <span className={cn("ml-auto rounded px-1.5 py-0.5 text-[11px] font-medium", tipo === "IA" ? "bg-violet-500/10 text-violet-700" : "bg-slate-500/10 text-slate-600")}>{tipo}</span>
    </div>
    <p className="mt-2 text-sm text-muted-foreground">{texto}</p>
    <p className="mt-3 text-xs"><span className="text-muted-foreground">Agente:</span> <span className="font-medium">{quien}</span></p>
    <p className="mt-0.5 text-xs"><span className="text-muted-foreground">Cuándo:</span> <span className="font-medium">{cuando}</span></p>
  </div>
  );
}

function Flecha() {
  return <div aria-hidden className="flex items-center justify-center text-lg text-muted-foreground max-lg:rotate-90">→</div>;
}

/** Resumen del departamento SEO: qué hace, cómo se encadena y qué falta para que funcione solo. */
export function SeoComoFunciona({ d, irA }: { d: DetalleDepartamento; irA: (pestana: string) => void }) {
  const sistema = useV2<Sistema>("system");
  const estado = useV2<EstadoSeo>("seo/status");
  const site = ((d.settings.configuration as Record<string, unknown>).site as Record<string, unknown> | undefined) ?? {};
  const maxDia = Number(site.maxPerDay) || 2;
  const maxSemana = Number(site.maxPerWeek) || 5;
  const activo = d.department.status === "active";
  const scheduler = sistema.datos ? sistema.datos.scheduler.active : null;
  const gh = estado.datos?.github;
  const ghOk = estado.datos ? !!gh?.ok && !!gh.can_push : null;
  const auto = estado.datos ? estado.datos.publish_mode === "auto" : null;
  const solo = activo && scheduler === true && ghOk === true;

  const horarioDe = (clave: string) => {
    const wf = d.workflows.find((w) => w.key === clave);
    return d.schedules.filter((s) => s.enabled && wf && String(s.workflow_id) === String(wf.id));
  };
  const horDesc = horarioDe("descubrimiento_temas");
  const horCont = horarioDe("contenido_seo");

  return (
    <div className="space-y-6">
      <section className={cn("rounded-lg border p-4", solo ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30 bg-amber-500/5")}>
        <p className="text-sm font-semibold">{solo ? "El departamento trabaja solo." : "Ahora mismo no se ejecuta solo."}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {solo
            ? `Sigue sus horarios sin que hagas nada. Máximo ${maxDia} artículos al día y ${maxSemana} por semana.`
            : "Los horarios están guardados pero no lanzan nada hasta que se cumplan estas condiciones. Mientras tanto puedes usar los botones manuales de «Temas y artículos»."}
        </p>
        <ul className="mt-3 divide-y rounded-lg border bg-background">
          <Requisito ok={activo} titulo="Departamento activo" detalle={activo ? "Los horarios de este departamento se tienen en cuenta." : "Está en pausa: sus horarios no se lanzan."} />
          <Requisito
            ok={scheduler}
            titulo="Programador (scheduler) encendido"
            detalle={scheduler === null ? "Comprobando…" : scheduler ? "Crea las ejecuciones cuando llega la hora de cada horario." : "Apagado en el servidor (MARKETING_ORQUESTADOR_ACTIVO). Se enciende con una variable del servidor, no desde este panel."}
          />
          <Requisito
            ok={ghOk}
            titulo="Conexión con el blog (GitHub)"
            detalle={ghOk === null ? "Comprobando…" : ghOk ? `Conectado a ${gh?.repository} con permiso de escritura.` : "Sin acceso de escritura al repositorio: no se podría publicar."}
          />
          <Requisito
            ok={auto}
            titulo="Publicar sin pedirte aprobación"
            detalle={auto === null ? "Comprobando…" : auto ? "Cada artículo que pase el validador se publica directamente." : "Apagado: cada artículo espera tu decisión en Aprobaciones antes de publicarse."}
            accion={<Button size="sm" variant="outline" onClick={() => irA("temas")}>Cambiar</Button>}
          />
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Cómo funciona, de principio a fin</h2>
        <div className="flex flex-col gap-3 lg:flex-row lg:gap-2">
          <Paso n={1} titulo="Buscar temas" quien="Investigador de temas" tipo="IA" cuando={horDesc.length ? horDesc.map(describirHorario).join(" · ") : "Sin horario"} texto="Lee fuentes del sector y añade temas nuevos, incluidas noticias, a la lista de temas." />
          <Flecha />
          <Paso n={2} titulo="Escribir el artículo" quien="Redactor SEO" tipo="IA" cuando={horCont.length ? horCont.map(describirHorario).join(" · ") : "Sin horario"} texto="Elige un tema de la lista, lo redacta por partes y lo pasa por el validador." />
          <Flecha />
          <Paso n={3} titulo="Publicar en la web" quien="Publicador del blog" tipo="Código" cuando="Justo después de escribir" texto="Sube el artículo al repositorio; Hostinger despliega y aparece en automatizacionesn8n.com/blog." />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Los pasos 2 y 3 forman una sola ejecución («Contenido SEO»). Ejecuciones y tiempos de cada una, en la pestaña <button type="button" className="text-primary underline underline-offset-2" onClick={() => irA("ejecuciones")}>Ejecuciones</button>; cada llamada a la IA, en <Link href="/agentes-v2/en-vivo" className="text-primary underline underline-offset-2">En vivo</Link>.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Reglas que se cumplen siempre</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Máximo {maxDia} artículos al día y {maxSemana} por semana, aunque se lance a mano.</li>
            <li>Tono: {String(d.settings.configuration.tone || "sin definir")}.</li>
            <li>Nunca sobrescribe un artículo existente ni toca otros archivos de la web.</li>
            <li>Sin cifras, precios, tarifas ni normativa que no venga de una fuente.</li>
            <li>Si el validador rechaza el artículo y no se puede corregir, se descarta y no se publica nada.</li>
          </ul>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Dónde se ve cada cosa</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li><button type="button" className="font-medium text-foreground hover:underline" onClick={() => irA("temas")}>Temas y artículos</button>: la lista de temas, los botones manuales y el modo de publicación.</li>
            <li><button type="button" className="font-medium text-foreground hover:underline" onClick={() => irA("agentes")}>Agentes</button>: qué hace cada agente y cómo está programado.</li>
            <li><button type="button" className="font-medium text-foreground hover:underline" onClick={() => irA("horario")}>Horario</button>: cambiar días y horas.</li>
            <li><Link href="/agentes-v2/aprobaciones" className="font-medium text-foreground hover:underline">Aprobaciones</Link>: los artículos que esperan tu decisión (solo si no publicas automáticamente).</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

/** Los agentes del departamento SEO: qué hace cada uno, cuándo se lanza y cómo le está yendo. */
export function SeoAgentes({ d, irA }: { d: DetalleDepartamento; irA: (pestana: string) => void }) {
  const stats = useV2<StatsLlm>("llm-stats?days=7");
  const activo = d.department.status === "active";
  const agentes = [...d.agents].sort((a, b) => Number(a.id) - Number(b.id));
  const workflowDe = (id: string | null) => d.workflows.find((w) => String(w.id) === String(id));

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-1 text-sm font-medium text-muted-foreground">Agentes de este departamento</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Son tres, y se ejecutan en cadena. Dos usan IA y el último es código normal, sin IA, para que publicar sea predecible.
        </p>
        <div className="space-y-3">
          {agentes.map((a, i) => {
            const info = AGENTES[a.agent_key];
            const wf = workflowDe(a.workflow_id);
            const horarios = (d.schedules as HorarioConFechas[]).filter((s) => wf && String(s.workflow_id) === String(wf.id));
            const mias = (stats.datos?.by_purpose ?? []).filter((p) => info?.tareasIa(p.purpose));
            const llamadas = mias.reduce((s, p) => s + p.calls, 0);
            const fallos = mias.reduce((s, p) => s + p.failed, 0);
            const media = llamadas ? Math.round(mias.reduce((s, p) => s + p.avg_ms * p.calls, 0) / llamadas / 100) / 10 : 0;
            return (
              <article key={a.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
                  <h3 className="text-base font-semibold">{info?.nombre ?? a.agent_key}</h3>
                  <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", info?.tipo === "codigo" ? "bg-slate-500/10 text-slate-600" : "bg-violet-500/10 text-violet-700")}>{info?.tipo === "codigo" ? "Código, sin IA" : "Usa IA"}</span>
                  <span className={cn("ml-auto text-xs", a.enabled ? "text-green-700" : "text-muted-foreground")}>{a.enabled ? "Habilitado" : "Deshabilitado"}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{a.role}</p>

                <div className="mt-3 grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Qué hace</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                      {(info?.hace ?? [a.role]).map((t) => <li key={t}>{t}</li>)}
                    </ul>
                  </div>
                  <dl className="grid content-start gap-2 text-sm">
                    {info && (
                      <>
                        <div><dt className="text-xs text-muted-foreground">Recibe</dt><dd>{info.entra}</dd></div>
                        <div><dt className="text-xs text-muted-foreground">Entrega</dt><dd>{info.sale}</dd></div>
                        <div><dt className="text-xs text-muted-foreground">Cuánto tarda</dt><dd>{info.duracion}</dd></div>
                      </>
                    )}
                    <div><dt className="text-xs text-muted-foreground">Forma parte de</dt><dd>{info?.paso ?? wf?.name ?? "—"}</dd></div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Programación</dt>
                      <dd>
                        {horarios.length === 0 ? "Sin horario" : horarios.map((h) => (
                          <span key={h.id ?? h.name} className={cn("block", !h.enabled && "text-muted-foreground line-through")}>{h.name ? `${h.name}: ` : ""}{describirHorario(h)}</span>
                        ))}
                      </dd>
                    </div>
                    {info?.tipo === "ia" && (
                      <div>
                        <dt className="text-xs text-muted-foreground">Últimos 7 días</dt>
                        <dd>{stats.cargando && !stats.datos ? "…" : llamadas ? `${llamadas} llamadas a la IA · media ${media.toLocaleString("es-ES")} s${fallos ? ` · ${fallos} con error` : ""}` : "Sin llamadas a la IA"}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Programación actual</h2>
          <Button size="sm" variant="outline" onClick={() => irA("horario")}>Cambiar horario</Button>
        </div>
        {!activo && (
          <p className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            El departamento está <strong>{d.department.status === "paused" ? "en pausa" : "sin activar"}</strong>: la tabla muestra cuándo se lanzaría cada horario, pero por ahora no se lanza nada.
          </p>
        )}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Horario</th>
                <th className="px-3 py-2 font-medium">Cuándo</th>
                <th className="px-3 py-2 font-medium">Qué lanza</th>
                <th className="px-3 py-2 font-medium">Próxima vez</th>
                <th className="px-3 py-2 font-medium">Última vez</th>
                <th className="px-3 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(d.schedules as HorarioConFechas[]).map((h) => {
                const wf = workflowDe(h.workflow_id);
                const prox = proximaOcurrencia(h);
                return (
                  <tr key={h.id ?? h.name}>
                    <td className="px-3 py-2 font-medium">{h.name || "Sin nombre"}</td>
                    <td className="px-3 py-2">{describirHorario(h)} <span className="text-xs text-muted-foreground">({h.timezone})</span></td>
                    <td className="px-3 py-2">{wf?.name ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{prox ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{h.last_run_at ? fechaHora(h.last_run_at) : "Aún no se ha lanzado"}</td>
                    <td className="px-3 py-2">{!h.enabled ? "Desactivado" : activo ? "Activo" : "Guardado, sin lanzar"}</td>
                  </tr>
                );
              })}
              {d.schedules.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Sin horarios definidos.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Límites de seguridad: cada ejecución tiene un tiempo máximo (descubrir temas 10 min, escribir y publicar 15 min) y se reintenta una vez si falla. Los horarios usan la hora de Madrid.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Últimas ejecuciones</h2>
        {d.runs.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Todavía no se ha ejecutado ninguna a través del programador. Las que lances a mano con los botones de «Temas y artículos» se ven en En vivo.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {d.runs.slice(0, 6).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                <EstadoRunBadge estado={r.status} />
                <span className="font-medium">{r.workflow_name ?? "Ejecución"}</span>
                <span className="ml-auto tabular-nums text-muted-foreground">{fechaHora(r.started_at ?? r.scheduled_for)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
