"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CANALES, haceCuanto, type CanalesCrm, type CanalResumen } from "@/lib/crm";
import { useApi } from "./use-api";

const VACIO = { total: 0, nuevo: 0, contactado: 0, presupuesto: 0, ganado: 0, perdido: 0, nuevos_hoy: 0, ultimos_7d: 0, sin_respuesta: 0, acciones_vencidas: 0, con_correo: 0, ultimo_contacto: null };

/** Últimos 14 días en AAAA-MM-DD (hora local del navegador, que es la de Madrid para el equipo). */
function ultimosDias(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
}

export default function CrmPanelPage() {
  const { datos, error } = useApi<{ ok: boolean } & CanalesCrm>("/api/crm/canales");
  const por = (o: string): CanalResumen => (datos?.canales.find((c) => c.origen === o) ?? { origen: o, ...VACIO }) as CanalResumen;
  const todos = datos?.canales ?? [];
  const suma = (k: keyof typeof VACIO) => todos.reduce((s, c) => s + (Number(c[k]) || 0), 0);
  const dias = ultimosDias(14);
  const valor = (dia: string, o: string) => datos?.porDia.find((x) => x.dia === dia && x.origen === o)?.n ?? 0;
  const maxDia = Math.max(1, ...dias.map((d) => CANALES.reduce((s, c) => s + valor(d, c.id), 0)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">CRM · Panel</h1>
        <p className="text-sm text-muted-foreground">Todo lo que entra por cada canal, de un vistazo. Pulsa un canal para ver y trabajar sus leads.</p>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">No se pudo cargar: {error}</div>}
      {!datos && !error && <div className="grid gap-3 md:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-44" />)}</div>}

      {datos && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Resumen titulo="Nuevos hoy" valor={suma("nuevos_hoy")} tono="text-sky-600" />
            <Resumen titulo="Esta semana" valor={suma("ultimos_7d")} nota="leads nuevos en 7 días" />
            <Resumen titulo="Sin respuesta +24 h" valor={suma("sin_respuesta")} tono={suma("sin_respuesta") > 0 ? "text-rose-600" : undefined} nota="siguen en «Nuevo»" />
            <Resumen titulo="Acciones vencidas" valor={suma("acciones_vencidas")} tono={suma("acciones_vencidas") > 0 ? "text-amber-600" : undefined} />
            <Resumen titulo="Con correo" valor={suma("con_correo")} nota={`de ${suma("total")} leads, para enviarles información`} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {CANALES.map((canal) => {
              const c = por(canal.id);
              return (
                <Link key={canal.id} href={canal.ruta} className="group">
                  <Card className="h-full transition-shadow group-hover:shadow-md">
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-sm font-semibold"><span className={`size-2.5 rounded-full ${canal.color}`} />{canal.nombre}</h2>
                        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">{c.total}</span>
                        <span className="text-xs text-muted-foreground">leads · {c.nuevos_hoy} hoy · {c.ultimos_7d} en 7 días</span>
                      </div>
                      {c.total === 0 ? (
                        <p className="text-xs text-muted-foreground">Todavía no ha entrado ninguno.</p>
                      ) : (
                        <>
                          <div className="flex h-2 overflow-hidden rounded-full bg-muted" title="Nuevo · Contactado · Presupuesto · Ganado · Perdido">
                            {[["nuevo", "bg-sky-500"], ["contactado", "bg-violet-500"], ["presupuesto", "bg-amber-500"], ["ganado", "bg-emerald-500"], ["perdido", "bg-rose-400"]].map(([k, col]) => (
                              <div key={k} className={col} style={{ width: `${(Number(c[k as keyof CanalResumen]) / c.total) * 100}%` }} />
                            ))}
                          </div>
                          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <Fila k="Nuevos" v={c.nuevo} />
                            <Fila k="Contactados" v={c.contactado} />
                            <Fila k="Ganados" v={c.ganado} />
                            <Fila k="Sin respuesta +24 h" v={c.sin_respuesta} alerta={c.sin_respuesta > 0} />
                            <Fila k="Con correo" v={c.con_correo} />
                            <Fila k="Último contacto" v={c.ultimo_contacto ? haceCuanto(c.ultimo_contacto) : "—"} />
                          </dl>
                        </>
                      )}
                      <p className="text-[11px] text-muted-foreground">{canal.descripcion}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Leads nuevos por día · últimos 14 días</h2>
            <div className="flex h-40 items-end gap-1.5">
              {dias.map((d) => {
                const total = CANALES.reduce((s, c) => s + valor(d, c.id), 0);
                return (
                  <div key={d} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.split("-").reverse().join("/")}: ${CANALES.map((c) => `${c.nombre} ${valor(d, c.id)}`).join(" · ")}`}>
                    <span className="text-[10px] text-muted-foreground">{total || ""}</span>
                    <div className="flex w-full max-w-8 flex-col-reverse overflow-hidden rounded-t" style={{ height: `${(total / maxDia) * 85}%` }}>
                      {CANALES.map((c) => <div key={c.id} className={c.color} style={{ height: total ? `${(valor(d, c.id) / total) * 100}%` : 0 }} />)}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{d.slice(8)}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              {CANALES.map((c) => <span key={c.id} className="flex items-center gap-1.5"><span className={`size-2.5 rounded-sm ${c.color}`} />{c.nombre}</span>)}
            </div>
          </section>

          <p className="text-sm text-muted-foreground">
            Para comparar canales, conversión y tiempos de respuesta ve a <Link href="/crm/metricas" className="font-medium text-primary underline">Métricas</Link>. Para descargar todos los contactos y escribirles, a <Link href="/crm/lista" className="font-medium text-primary underline">Todos los leads</Link>.
          </p>
        </>
      )}
    </div>
  );
}

function Resumen({ titulo, valor, nota, tono }: { titulo: string; valor: number; nota?: string; tono?: string }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs text-muted-foreground">{titulo}</p>
        <p className={`mt-1 text-2xl font-semibold ${tono ?? ""}`}>{valor}</p>
        {nota && <p className="mt-0.5 text-[11px] text-muted-foreground">{nota}</p>}
      </CardContent>
    </Card>
  );
}

function Fila({ k, v, alerta }: { k: string; v: number | string; alerta?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={alerta ? "font-semibold text-rose-600" : "font-medium"}>{v}</dd>
    </div>
  );
}
