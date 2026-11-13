"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Call, Calendar, Clock, Refresh2, Profile2User, TickCircle, Timer1 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiComercial, fechaHoraCorta, tiempoHablado, type Contacto, type Reunion } from "@/lib/comercial";
import { useSoftphone, type ResumenFinLlamada } from "../(app)/softphone";
import { useComercial } from "./contexto";
import { AvisoSinTelefonia, FichaDialog, InsigniaEstado, ResultadoDialog, SelectorAgente, useLlamarContacto } from "./componentes";

interface Resumen { hoy: { llamadas: number; contestadas: number; segundos: number; interesados: number; reuniones: number; ventas: number }; reuniones_proximas: number }
interface Cola { contactos: Contacto[]; por_estado: Record<string, number> }

export default function HoyPage() {
  const { admin, email, nombre } = useComercial();
  const softphone = useSoftphone();
  const [agente, setAgente] = useState(admin ? "" : email);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [cola, setCola] = useState<Cola | null>(null);
  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [saltados, setSaltados] = useState<string[]>([]);
  const [ficha, setFicha] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<{ contacto: Contacto; llamadaId: string | null; contestada: boolean } | null>(null);

  const cargar = useCallback(async () => {
    if (!agente) { setCargando(false); return; }
    setCargando(true); setError(null);
    try {
      const [r, c, m] = await Promise.all([
        apiComercial<Resumen>("resumen", { params: { agente } }),
        apiComercial<Cola>("cola", { params: { agente, limit: 25 } }),
        apiComercial<{ reuniones: Reunion[] }>("reuniones", { params: { agente, estado: "agendada" } }),
      ]);
      setResumen(r); setCola(c); setReuniones(m.reuniones.filter((x) => new Date(x.fecha_hora).getTime() >= Date.now() - 3600_000).slice(0, 6)); setSaltados([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar");
    } finally {
      setCargando(false);
    }
  }, [agente]);

  useEffect(() => {
    const t = setTimeout(() => void cargar(), 0);
    return () => clearTimeout(t);
  }, [cargar]);

  const alColgar = useCallback((c: Contacto, fin: ResumenFinLlamada) => setPendiente({ contacto: c, llamadaId: fin.llamadaId, contestada: fin.contestada }), []);
  const { llamar, ocupado } = useLlamarContacto(alColgar);

  const lista = (cola?.contactos ?? []).filter((c) => !saltados.includes(c.id));
  const siguiente = lista[0];
  const resto = lista.slice(1, 9);
  const porEstado = cola?.por_estado ?? {};
  const totalEnCola = (porEstado.pendiente ?? 0) + (porEstado.volver_a_llamar ?? 0) + (porEstado.no_contesta ?? 0) + (porEstado.interesado ?? 0);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{admin ? "Hoy" : `Hola, ${nombre.split(" ")[0]}`}</h1>
          <p className="text-sm text-muted-foreground">{admin ? "Elige un agente para ver su día." : "Estas son tus llamadas de hoy. Pulsa Llamar y el sistema marca desde tu ordenador."}</p>
        </div>
        <div className="flex items-end gap-2">
          <SelectorAgente valor={agente} onCambio={setAgente} conTodos={false} />
          <Button variant="outline" size="icon" onClick={() => void cargar()} title="Actualizar"><Refresh2 className={cargando ? "size-4 animate-spin" : "size-4"} /></Button>
        </div>
      </div>

      {!softphone.disponible && <AvisoSinTelefonia />}
      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      {admin && !agente && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Elige un agente arriba. Si todavía no hay ninguno, dalo de alta en <Link href="/comercial/admin/agentes" className="text-primary underline">Agentes</Link>.</div>}

      {agente && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { t: "Llamadas hoy", v: resumen?.hoy.llamadas, i: Call },
              { t: "Contestadas", v: resumen?.hoy.contestadas, i: TickCircle },
              { t: "Tiempo hablado", v: resumen ? tiempoHablado(resumen.hoy.segundos) : undefined, i: Timer1 },
              { t: "Interesados hoy", v: resumen?.hoy.interesados, i: Profile2User },
              { t: "Reuniones agendadas hoy", v: resumen?.hoy.reuniones, i: Calendar },
              { t: "Pendientes en cola", v: cola ? totalEnCola : undefined, i: Clock },
            ].map((x) => (
              <div key={x.t} className="rounded-xl border bg-card p-3 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><x.i className="size-3.5" /> {x.t}</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">{x.v === undefined ? <Skeleton className="h-6 w-12" /> : x.v}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-primary">Siguiente llamada</h2>
              {cargando && !cola ? (
                <Skeleton className="h-44 w-full" />
              ) : !siguiente ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No tienes llamadas pendientes ahora mismo. {totalEnCola === 0 ? "Cuando un administrador te asigne una lista, aparecerá aquí." : "Los «volver a llamar» y «no contesta» volverán cuando toque."}
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-primary/30 bg-card p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xl font-semibold">{siguiente.empresa}</div>
                      <div className="mt-0.5 text-sm text-muted-foreground">{[siguiente.contacto, siguiente.cargo].filter(Boolean).join(" · ") || "Sin persona de contacto"}</div>
                    </div>
                    <InsigniaEstado estado={siguiente.estado} />
                  </div>
                  <div className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    <div><span className="text-muted-foreground">Teléfono:</span> <span className="font-medium tabular-nums">{siguiente.telefono}</span></div>
                    {siguiente.ciudad && <div><span className="text-muted-foreground">Ciudad:</span> {siguiente.ciudad}</div>}
                    {siguiente.sector && <div><span className="text-muted-foreground">Sector:</span> {siguiente.sector}</div>}
                    {siguiente.web && <div className="truncate"><span className="text-muted-foreground">Web:</span> {siguiente.web}</div>}
                    {siguiente.intentos > 0 && <div><span className="text-muted-foreground">Intentos:</span> {siguiente.intentos}</div>}
                    {siguiente.proxima_llamada && <div><span className="text-muted-foreground">Quedó en:</span> {fechaHoraCorta(siguiente.proxima_llamada)}</div>}
                  </div>
                  {siguiente.notas && <p className="mt-3 rounded-lg bg-muted/40 p-2 text-sm">{siguiente.notas}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="lg" className="gap-2" disabled={ocupado || !softphone.disponible} onClick={() => llamar(siguiente)}><Call className="size-5" /> Llamar</Button>
                    <Button variant="outline" onClick={() => setFicha(siguiente.id)}>Ver ficha</Button>
                    <Button variant="ghost" onClick={() => setSaltados((s) => [...s, siguiente.id])}>Saltar</Button>
                  </div>
                </div>
              )}

              {resto.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Después</h3>
                  <ul className="divide-y rounded-xl border bg-card">
                    {resto.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                        <button type="button" onClick={() => setFicha(c.id)} className="min-w-0 flex-1 text-left hover:underline"><span className="font-medium">{c.empresa}</span> <span className="text-muted-foreground">· {c.telefono}</span></button>
                        <InsigniaEstado estado={c.estado} />
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={ocupado || !softphone.disponible} onClick={() => llamar(c)}><Call className="size-3.5" /> Llamar</Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-primary">Próximas reuniones</h2>
              {reuniones.length === 0 ? (
                <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Sin reuniones agendadas.</p>
              ) : (
                <ul className="space-y-1.5">
                  {reuniones.map((m) => (
                    <li key={m.id} className="rounded-xl border bg-card px-3 py-2 text-sm">
                      <div className="font-medium">{m.empresa}</div>
                      <div className="text-xs text-muted-foreground">{fechaHoraCorta(m.fecha_hora)} · {m.canal}{m.contacto ? ` · ${m.contacto}` : ""}</div>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/comercial/reuniones" className="inline-block text-sm text-primary hover:underline">Ver todas las reuniones</Link>
            </section>
          </div>
        </>
      )}

      {ficha && <FichaDialog id={ficha} onCerrar={() => setFicha(null)} onCambio={() => void cargar()} />}
      {pendiente && (
        <ResultadoDialog
          contacto={pendiente.contacto}
          llamadaId={pendiente.llamadaId}
          contestada={pendiente.contestada}
          onCerrar={() => { setPendiente(null); void cargar(); }}
          onGuardado={() => { setPendiente(null); void cargar(); }}
        />
      )}
    </div>
  );
}
