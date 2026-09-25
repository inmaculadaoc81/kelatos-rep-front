"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useV2 } from "@/components/agentes-v2/use-v2";
import { Cabecera, CargandoFilas, ErrorCaja, Kpi, Vacio } from "@/components/agentes-v2/componentes";
import { usd } from "@/lib/agentes-v2";

interface StatsLlm {
  ok: boolean;
  days: number;
  total: { calls: number; failed: number; avg_ms: number; chars_per_second: number };
  by_purpose: { purpose: string; calls: number; ok: number; failed: number; avg_ms: number; p50_ms: number; max_ms: number; chars_per_second: number }[];
  recent: { purpose: string; label: string | null; status: string; duration_ms: number; output_chars: number; started_at: string; error: string | null }[];
}

const NOMBRE_TAREA: Record<string, string> = {
  cmo: "AI CMO: interpretar una instrucción",
  "seo.temas": "SEO: analizar novedades y noticias",
  "seo.ideas": "SEO: proponer ideas de guías",
  "seo.plan": "SEO: plan del artículo",
  "seo.introduccion": "SEO: introducción",
  "seo.seccion": "SEO: cada sección",
  "seo.cierre": "SEO: cierre",
  "seo.meta": "SEO: corregir título y descripción",
  "seo.extra": "SEO: sección extra",
};

const seg = (ms: number) => (ms >= 60000 ? `${Math.floor(ms / 60000)} min ${Math.round((ms % 60000) / 1000)} s` : `${(ms / 1000).toFixed(1)} s`);

interface Costes {
  ok: boolean;
  days: number;
  agent_operating: { cmo?: { calls: number; cost_usd: number; tokens_in: number; tokens_out: number }; by_type: { agent_type: string; runs: number; cost_usd: number; tokens_in: number; tokens_out: number }[] };
  advertising_spend: { totals: { currency: string; total: number }[]; by_channel: { channel: string; currency: string; total: number }[] };
}

/** Costes en dos bloques que nunca se mezclan: lo que cuesta operar los agentes de IA y lo que se paga en anuncios. */
export default function CostesPage() {
  const { datos, error, cargando } = useV2<Costes>("costs?days=30");
  const stats = useV2<StatsLlm>("llm-stats?days=7");
  const totalIa = (datos?.agent_operating.by_type.reduce((s, x) => s + x.cost_usd, 0) ?? 0) + (datos?.agent_operating.cmo?.cost_usd ?? 0);
  return (
    <div>
      <Cabecera titulo="Costes" descripcion="Últimos 30 días. El coste de operar la IA y la inversión en publicidad son cosas distintas y se muestran por separado." />
      {error && <ErrorCaja mensaje={error} />}
      {cargando && !datos ? (
        <CargandoFilas />
      ) : datos ? (
        <div className="space-y-8">
          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Coste operativo de los agentes</h2>
            <div className="mb-3 max-w-xs"><Kpi titulo="Total 30 días" valor={usd(totalIa)} sub="modelos, herramientas y APIs" /></div>
            {datos.agent_operating.cmo && datos.agent_operating.cmo.calls > 0 && (
              <p className="mb-3 text-sm text-muted-foreground">
                Incluye el AI CMO: {datos.agent_operating.cmo.calls} consultas, {usd(datos.agent_operating.cmo.cost_usd)}.
              </p>
            )}
            {datos.agent_operating.by_type.length === 0 ? (
              <Vacio titulo="Sin actividad de agentes en este periodo" />
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo de agente</TableHead>
                      <TableHead className="text-right">Ejecuciones</TableHead>
                      <TableHead className="text-right">Tokens (entrada / salida)</TableHead>
                      <TableHead className="text-right">Coste</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {datos.agent_operating.by_type.map((t) => (
                      <TableRow key={t.agent_type}>
                        <TableCell className="text-sm">{t.agent_type}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{t.runs}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{t.tokens_in.toLocaleString("es-ES")} / {t.tokens_out.toLocaleString("es-ES")}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{usd(t.cost_usd)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Rendimiento de la IA (últimos 7 días)</h2>
            {stats.error && <ErrorCaja mensaje={stats.error} />}
            {stats.datos && stats.datos.total.calls === 0 ? (
              <Vacio titulo="Todavía no hay llamadas registradas" texto="Cada vez que el AI CMO o un departamento use la IA, se anota cuánto tarda. Con unos días de uso verás aquí los tiempos medios reales." />
            ) : stats.datos ? (
              <>
                <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Kpi titulo="Llamadas a la IA" valor={String(stats.datos.total.calls)} sub={`${stats.datos.total.failed} con fallo o sin respuesta`} />
                  <Kpi titulo="Tiempo medio" valor={seg(stats.datos.total.avg_ms)} sub="por llamada" />
                  <Kpi titulo="Velocidad de escritura" valor={`${stats.datos.total.chars_per_second} car/s`} sub="≈ 4 caracteres por token" />
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarea</TableHead>
                        <TableHead className="text-right">Llamadas</TableHead>
                        <TableHead className="text-right">Media</TableHead>
                        <TableHead className="text-right">Mediana</TableHead>
                        <TableHead className="text-right">Máximo</TableHead>
                        <TableHead className="text-right">Fallos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.datos.by_purpose.map((x) => (
                        <TableRow key={x.purpose}>
                          <TableCell className="text-sm">{NOMBRE_TAREA[x.purpose] ?? x.purpose}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{x.calls}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{seg(x.avg_ms)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{seg(x.p50_ms)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{seg(x.max_ms)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{x.failed}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : null}
          </section>
          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Inversión en publicidad</h2>
            {datos.advertising_spend.by_channel.length === 0 ? (
              <Vacio titulo="Sin gasto publicitario registrado" texto="Cuando exista el departamento de Anuncios, el dinero pagado a cada plataforma se registrará por campaña y canal." />
            ) : (
              <ul className="divide-y rounded-lg border">
                {datos.advertising_spend.by_channel.map((c) => (
                  <li key={`${c.channel}${c.currency}`} className="flex justify-between px-4 py-2 text-sm">
                    <span>{c.channel}</span>
                    <span className="tabular-nums">{c.total.toLocaleString("es-ES", { minimumFractionDigits: 2 })} {c.currency}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
