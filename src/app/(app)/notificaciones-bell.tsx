"use client";

import { useEffect, useState } from "react";
import { Notification, TickCircle, CloseCircle, Warning2, InfoCircle, Danger, Hashtag, Sms, Profile, Clock } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { MOTIVO_LABELS, type WebhookEvento } from "@/lib/webhook-eventos";

/**
 * Reproduce el offcanvas "Notificaciones de presupuestos (webhook)" del
 * navbar original (btnNotificaciones / offcanvasNotif en Index.html):
 * eventos del webhook que interpreta respuestas de email de clientes a
 * presupuestos (aceptación, rechazo, o avisos ambiguos que requieren
 * revisión manual). Mismo bell + badge de no-leídas; el offcanvas se
 * traduce al componente Sheet ya usado en el resto del sistema.
 */
export function NotificacionesBell() {
  const [eventos, setEventos] = useState<WebhookEvento[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(false);

  async function cargarBadge() {
    try {
      const res = await fetch("/api/webhook-eventos?leida=false&porPagina=1");
      const data = await res.json();
      if (data.ok) setNoLeidas(data.noLeidas as number);
    } catch {
      /* silencioso: el badge es solo un aviso rápido, el panel siempre puede reintentar */
    }
  }

  useEffect(() => {
    cargarBadge();
  }, []);

  async function abrir() {
    setAbierto(true);
    setCargando(true);
    try {
      const res = await fetch("/api/webhook-eventos");
      const data = await res.json();
      if (data.ok) {
        const lista = data.eventos as WebhookEvento[];
        setEventos(lista);
        setNoLeidas(data.noLeidas as number);

        const pendientes = lista.filter((e) => !e.leida);
        if (pendientes.length > 0) {
          await Promise.all(pendientes.map((e) => fetch(`/api/webhook-eventos/${e.id}`, { method: "PATCH" })));
          setNoLeidas(0);
        }
      }
    } catch {
      /* silencioso: se puede reintentar cerrando y reabriendo el panel */
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="relative text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
        onClick={abrir}
        title="Notificaciones de presupuestos"
      >
        <Notification className="size-4" />
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </Button>

      <Sheet open={abierto} onOpenChange={setAbierto}>
        <SheetContent className="w-full gap-0 p-0 data-[side=right]:sm:max-w-md" showCloseButton={false}>
          <header className="flex items-center gap-3 bg-primary px-5 py-3.5 text-primary-foreground">
            <Notification className="size-5" />
            <SheetTitle className="text-base font-semibold text-primary-foreground">Notificaciones de presupuestos</SheetTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="ml-auto text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
              onClick={() => setAbierto(false)}
            >
              <CloseCircle className="size-4" />
            </Button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">
            {cargando ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Cargando…</p>
            ) : eventos.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No hay notificaciones aún.</p>
            ) : (
              eventos.map((evento) => <TarjetaEvento key={evento.id} evento={evento} />)
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function TarjetaEvento({ evento }: { evento: WebhookEvento }) {
  const esAviso = evento.estado === "Aviso";
  const esAceptado = evento.estado === "Aceptado";

  const Icono = esAviso ? Warning2 : esAceptado ? TickCircle : Danger;
  const colorIcono = esAviso ? "text-amber-600" : esAceptado ? "text-emerald-600" : "text-destructive";
  const colorBadge = esAviso ? "bg-amber-100 text-amber-800" : esAceptado ? "bg-emerald-100 text-emerald-800" : "bg-destructive/10 text-destructive";

  const motivoLabel = evento.motivo ? MOTIVO_LABELS[evento.motivo] || evento.motivo : null;

  const fechaStr = evento.fecha
    ? new Date(evento.fecha).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <div className={`rounded-xl border bg-card p-3.5 ${!evento.leida ? "border-primary/30" : ""}`}>
      <div className="flex items-start gap-2.5">
        <Icono className={`mt-0.5 size-4 shrink-0 ${colorIcono}`} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{esAviso ? "Revisión manual requerida" : evento.numero_presupuesto || "—"}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${colorBadge}`}>{evento.estado}</span>
          </div>

          {motivoLabel && (
            <div className={`flex items-start gap-1 rounded-md px-2 py-1 text-xs ${esAviso ? "bg-amber-50 text-amber-800" : "text-muted-foreground"}`}>
              <InfoCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{motivoLabel}</span>
            </div>
          )}

          {esAviso && evento.numero_presupuesto && evento.numero_presupuesto !== "(sin ref)" && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Hashtag className="size-3.5 shrink-0" /> Candidatos: {evento.numero_presupuesto}
            </p>
          )}

          {evento.resguardo && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Hashtag className="size-3.5 shrink-0" />
              {evento.resguardo}
              {evento.importe ? ` — ${evento.importe} €` : ""}
            </p>
          )}

          {(evento.nombre_cliente || evento.email_cliente) && (
            <p className="flex items-center gap-3 text-xs text-muted-foreground">
              {evento.nombre_cliente && (
                <span className="flex items-center gap-1">
                  <Profile className="size-3.5 shrink-0" /> {evento.nombre_cliente}
                </span>
              )}
              {evento.email_cliente && (
                <span className="flex items-center gap-1">
                  <Sms className="size-3.5 shrink-0" /> {evento.email_cliente}
                </span>
              )}
            </p>
          )}

          {evento.respuesta_cliente && <p className="truncate text-xs text-muted-foreground italic">&quot;{evento.respuesta_cliente}&quot;</p>}

          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="size-3 shrink-0" /> {fechaStr}
          </p>
        </div>
      </div>
    </div>
  );
}
