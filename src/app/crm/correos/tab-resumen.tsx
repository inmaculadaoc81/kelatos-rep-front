"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fechaHora, nombreOrigen } from "@/lib/crm";
import { chipEstadoCampana, nombreEstadoCampana, type ResumenCorreos } from "@/lib/crm-correos";
import { useApi } from "../use-api";

const PASOS_PREVIOS = [
  "Enlace de baja en cada correo y lista de bajas respetada (la lista ya existe; falta el enlace).",
  "Confirmar con qué base legal se escribe a cada grupo (clientes con consentimiento, leads que contactaron…).",
  "Elegir el buzón remitente y los límites de envío por hora y por día.",
  "Probar con un envío a una dirección interna antes de abrirlo a las campañas.",
];

export function TabResumen({ irA }: { irA: (p: string) => void }) {
  const { datos: r, error } = useApi<ResumenCorreos>("/api/crm/correos/resumen");
  if (error) return <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">No se pudo cargar: {error}</p>;
  if (!r) return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  const n = (e: string) => r.campanas.find((c) => c.estado === e)?.n ?? 0;
  const max = Math.max(1, ...r.porCanal.map((c) => c.n));
  return (
    <div className="space-y-5 pt-2">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi titulo="Contactos con correo" valor={r.contactos.total} nota={`${r.contactos.leads} leads · ${r.contactos.clientes} clientes`} />
        <Kpi titulo="Aptos para escribir" valor={r.contactos.aptos} tono="text-emerald-600" nota="sin baja, rebote ni «No contactar»" />
        <Kpi titulo="Bloqueados" valor={r.contactos.bloqueados} tono={r.contactos.bloqueados > 0 ? "text-amber-600" : undefined} nota="no recibirán nada" />
        <Kpi titulo="Correos enviados" valor={r.enviados} nota={r.envio_activo ? "envío activo" : "envío desactivado"} />
        <Kpi titulo="Tipos de correo" valor={r.tipos.activos} nota={`${r.tipos.total} en total`} />
        <Kpi titulo="Campañas programadas" valor={n("programada")} tono="text-sky-600" />
        <Kpi titulo="Borradores" valor={n("borrador")} />
        <Kpi titulo="Pausadas" valor={n("pausada")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">De dónde vienen los contactos</h2>
          <ul className="space-y-2.5">
            {r.porCanal.map((c) => (
              <li key={c.clave} className="text-sm">
                <div className="flex justify-between gap-2"><span>{c.clave === "cliente" ? "Clientes de Reparaciones" : nombreOrigen(c.clave)}</span><span className="text-xs text-muted-foreground">{c.n} · {c.aptos} aptos</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(3, (c.n / max) * 100)}%` }} /></div>
              </li>
            ))}
          </ul>
          <button type="button" className="mt-3 text-xs font-medium text-primary underline" onClick={() => irA("contactos")}>Ver todos los contactos</button>
        </section>

        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Próximas campañas</h2>
          {r.proximas.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay campañas programadas.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {r.proximas.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                  <span className="min-w-0"><span className="block truncate font-medium">{c.nombre}</span><span className="text-xs text-muted-foreground">{c.tipo ?? "Sin tipo"}</span></span>
                  <span className="shrink-0 text-right text-xs"><span className={`rounded-full px-2 py-0.5 ${chipEstadoCampana("programada")}`}>{nombreEstadoCampana("programada")}</span><span className="mt-1 block text-muted-foreground">{c.programado_para ? fechaHora(c.programado_para) : "sin fecha"}</span></span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="mt-3 text-xs font-medium text-primary underline" onClick={() => irA("campanas")}>Programar un envío</button>
        </section>
      </div>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold">Antes de activar los envíos</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{PASOS_PREVIOS.map((p) => <li key={p}>{p}</li>)}</ul>
      </section>
    </div>
  );
}

function Kpi({ titulo, valor, nota, tono }: { titulo: string; valor: number; nota?: string; tono?: string }) {
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
