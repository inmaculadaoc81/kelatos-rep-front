"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Call, Message } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSondeoVisible } from "@/hooks/use-sondeo-visible";
import { cn } from "@/lib/utils";
import type { ConversacionWa } from "@/lib/whatsapp";
import { apiComercial, type Contacto } from "@/lib/comercial";
import { PanelWhatsapp } from "../../(app)/reparaciones/whatsapp-reparacion";
import { useComercial } from "../contexto";
import { FichaDialog, InsigniaEstado, RUTA_WA_COMERCIAL, ResultadoDialog, SelectorAgente, useLlamarContacto } from "../componentes";

interface ItemBandeja {
  id: number;
  empresa: string;
  contacto: string | null;
  telefono: string;
  estado: string;
  ultimaActividad: number;
  noLeidos: number;
  ultimoMensaje: { texto: string; saliente: boolean; ts: number } | null;
  conversaciones: ConversacionWa[];
}

function hace(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  const hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

/** WhatsApp de mis contactos: las conversaciones de las empresas que tengo asignadas, para leer y contestar sin salir del panel. */
export default function WhatsappComercialPage() {
  const { admin } = useComercial();
  const [agente, setAgente] = useState("");
  const [items, setItems] = useState<ItemBandeja[] | null>(null);
  const [configurado, setConfigurado] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elegido, setElegido] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [ficha, setFicha] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<{ contacto: Contacto; llamadaId?: string | null; contestada?: boolean } | null>(null);

  const cargar = useCallback(async (fresco = false) => {
    try {
      const d = await apiComercial<{ configurado: boolean; contactos: ItemBandeja[] }>("whatsapp/bandeja", { params: { agente: admin ? agente : undefined, fresco: fresco ? "1" : undefined } });
      setItems(d.contactos); setConfigurado(d.configurado); setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar WhatsApp");
      setItems((prev) => prev ?? []);
    }
  }, [admin, agente]);

  useEffect(() => { setItems(null); void cargar(); }, [cargar]);
  useSondeoVisible(() => { void cargar(); }, 30_000, true);

  const alColgar = useCallback((c: Contacto, fin: { llamadaId?: string | null; contestada?: boolean }) => setPendiente({ contacto: c, llamadaId: fin.llamadaId, contestada: fin.contestada }), []);
  const { llamar, ocupado } = useLlamarContacto(alColgar);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (items ?? []).filter((i) => !t || `${i.empresa} ${i.contacto || ""} ${i.telefono}`.toLowerCase().includes(t));
  }, [items, q]);
  const actual = visibles.find((i) => i.id === elegido) ?? visibles[0] ?? null;
  const sinLeer = (items ?? []).reduce((n, i) => n + i.noLeidos, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><Message className="size-6 text-primary" /> WhatsApp</h1>
        <p className="text-sm text-muted-foreground">Las conversaciones de tus contactos. Contesta desde aquí; se envía por el WhatsApp de Kelatos.{sinLeer > 0 && <> · <span className="font-medium text-emerald-700 dark:text-emerald-400">{sinLeer} sin leer</span></>}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <SelectorAgente valor={agente} onCambio={setAgente} />
        <div className="min-w-48 flex-1">
          <label className="mb-1 block text-xs text-muted-foreground">Buscar</label>
          <Input className="h-9" placeholder="Empresa, persona o teléfono" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button variant="outline" className="h-9" onClick={() => { setItems(null); void cargar(true); }}>Actualizar</Button>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      {!configurado && <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">WhatsApp no está conectado todavía en el servidor.</div>}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="max-h-[70vh] overflow-y-auto rounded-xl border bg-card shadow-sm">
          {items === null && Array.from({ length: 5 }).map((_, i) => <div key={i} className="border-b p-3"><Skeleton className="h-4 w-2/3" /><Skeleton className="mt-2 h-3 w-full" /></div>)}
          {items !== null && visibles.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">Ninguno de tus contactos tiene conversación de WhatsApp todavía. Aparecerán aquí cuando escriban al WhatsApp de Kelatos.</p>
          )}
          {visibles.map((i) => (
            <button key={i.id} type="button" onClick={() => setElegido(i.id)}
              className={cn("block w-full border-b px-3 py-2.5 text-left hover:bg-muted/40", actual?.id === i.id && "bg-primary/5")}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{i.empresa}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{hace(i.ultimaActividad)}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-muted-foreground">{i.ultimoMensaje ? `${i.ultimoMensaje.saliente ? "Tú: " : ""}${i.ultimoMensaje.texto}` : i.telefono}</span>
                {i.noLeidos > 0 && <span className="shrink-0 rounded-full bg-emerald-600 px-1.5 text-[10px] font-semibold text-white">{i.noLeidos}</span>}
              </div>
            </button>
          ))}
        </div>

        <div className="min-h-64 rounded-xl border bg-card p-4 shadow-sm">
          {!actual ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Elige una conversación.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">{actual.empresa}</h2>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <InsigniaEstado estado={actual.estado} />
                    <span>{actual.contacto ? `${actual.contacto} · ` : ""}{actual.telefono}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="gap-1.5" disabled={ocupado} onClick={() => llamar({ id: String(actual.id), empresa: actual.empresa, telefono: actual.telefono } as unknown as Contacto)}><Call className="size-4" /> Llamar</Button>
                  <Button variant="outline" onClick={() => setFicha(String(actual.id))}>Ver ficha</Button>
                </div>
              </div>
              <PanelWhatsapp
                key={actual.id}
                datos={{ cargando: false, sinAcceso: false, error: null, conversaciones: actual.conversaciones, sinLeer: actual.noLeidos, telefono: actual.telefono }}
                rutaBase={RUTA_WA_COMERCIAL}
                enlaceBandeja={null}
              />
            </div>
          )}
        </div>
      </div>

      {ficha && <FichaDialog id={ficha} onCerrar={() => setFicha(null)} onCambio={() => void cargar()} />}
      {pendiente && (
        <ResultadoDialog contacto={pendiente.contacto} llamadaId={pendiente.llamadaId} contestada={pendiente.contestada}
          onCerrar={() => setPendiente(null)} onGuardado={() => setPendiente(null)} />
      )}
    </div>
  );
}
