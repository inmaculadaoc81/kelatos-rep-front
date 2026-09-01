"use client";

import { useEffect, useMemo, useState } from "react";
import { Notification, TickCircle, CloseCircle, Warning2, InfoCircle, Danger, Hashtag, Sms, Profile, Clock, Filter, Category2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MOTIVO_LABELS, type WebhookEvento } from "@/lib/webhook-eventos";

type FiltroFecha = "todas" | "hoy" | "semana" | "mes" | "mes_anterior";
type FiltroTipo = "todos" | "Aviso" | "Aceptado" | "Rechazado";

const FILTROS_FECHA: { valor: FiltroFecha; label: string }[] = [
  { valor: "todas", label: "Todas las fechas" },
  { valor: "hoy", label: "Hoy" },
  { valor: "semana", label: "Esta semana" },
  { valor: "mes", label: "Este mes" },
  { valor: "mes_anterior", label: "Mes anterior" },
];

const FILTROS_TIPO: { valor: FiltroTipo; label: string }[] = [
  { valor: "todos", label: "Todos los tipos" },
  { valor: "Aviso", label: "Avisos (revisión manual)" },
  { valor: "Aceptado", label: "Aceptados" },
  { valor: "Rechazado", label: "Rechazados" },
];

// Mismo criterio que ya usa Fichajes/Facturas de Clientes: semana de lunes
// a domingo, mes de calendario completo (no ventana móvil de N días).
function dentroDeRango(fechaIso: string | null, filtro: FiltroFecha): boolean {
  if (filtro === "todas") return true;
  if (!fechaIso) return false;
  const fecha = new Date(fechaIso);
  const hoy = new Date();
  if (filtro === "hoy") {
    return fecha.toDateString() === hoy.toDateString();
  }
  if (filtro === "semana") {
    const diaSemana = (hoy.getDay() + 6) % 7;
    const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - diaSemana);
    const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6, 23, 59, 59, 999);
    return fecha >= lunes && fecha <= domingo;
  }
  if (filtro === "mes") {
    return fecha.getFullYear() === hoy.getFullYear() && fecha.getMonth() === hoy.getMonth();
  }
  // mes_anterior
  const mesAnteriorRef = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  return fecha.getFullYear() === mesAnteriorRef.getFullYear() && fecha.getMonth() === mesAnteriorRef.getMonth();
}

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
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>("todas");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");
  const [seleccionado, setSeleccionado] = useState<WebhookEvento | null>(null);

  const eventosFiltrados = useMemo(
    () => eventos.filter((e) => dentroDeRango(e.fecha, filtroFecha) && (filtroTipo === "todos" || e.estado === filtroTipo)),
    [eventos, filtroFecha, filtroTipo]
  );
  const filtroFechaLabel = FILTROS_FECHA.find((f) => f.valor === filtroFecha)?.label || "Todas las fechas";
  const filtroTipoLabel = FILTROS_TIPO.find((f) => f.valor === filtroTipo)?.label || "Todos los tipos";

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
        <SheetContent className="w-full gap-0 p-0 data-[side=right]:sm:max-w-2xl" showCloseButton={false}>
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

          <div className="flex flex-wrap items-center gap-2 border-b bg-card px-4 py-2.5">
            <Popover>
              <PopoverTrigger
                render={
                  <Button variant="outline" size="sm" className={cn("gap-1.5", filtroFecha !== "todas" && "border-primary text-primary")}>
                    <Filter className="size-3.5" /> {filtroFechaLabel}
                  </Button>
                }
              />
              <PopoverContent align="start" className="w-56 p-1">
                {FILTROS_FECHA.map((f) => (
                  <button
                    key={f.valor}
                    type="button"
                    className={cn("w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted", filtroFecha === f.valor && "bg-primary/10 font-medium text-primary")}
                    onClick={() => setFiltroFecha(f.valor)}
                  >
                    {f.label}
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className={cn("gap-1.5", filtroTipo !== "todos" && "border-primary text-primary")}>
                    <Category2 className="size-3.5" /> {filtroTipoLabel}
                  </Button>
                }
              />
              <DropdownMenuContent className="w-56">
                <DropdownMenuRadioGroup value={filtroTipo} onValueChange={(v) => setFiltroTipo((v as FiltroTipo) || "todos")}>
                  {FILTROS_TIPO.map((f) => (
                    <DropdownMenuRadioItem key={f.valor} value={f.valor}>{f.label}</DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="ml-auto text-xs text-muted-foreground">
              {eventosFiltrados.length} de {eventos.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto bg-muted/20 p-4">
            {cargando ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Cargando…</p>
            ) : eventos.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No hay notificaciones aún.</p>
            ) : eventosFiltrados.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Ninguna notificación coincide con estos filtros.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {eventosFiltrados.map((evento) => (
                  <TarjetaEvento key={evento.id} evento={evento} onClick={() => setSeleccionado(evento)} />
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <DetalleNotificacionDialog evento={seleccionado} onClose={() => setSeleccionado(null)} />
    </>
  );
}

function TarjetaEvento({ evento, onClick }: { evento: WebhookEvento; onClick: () => void }) {
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
    <button
      type="button"
      onClick={onClick}
      className={`w-full min-w-0 rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 ${!evento.leida ? "border-primary/30" : ""}`}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <Icono className={`mt-0.5 size-4 shrink-0 ${colorIcono}`} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="min-w-0 truncate text-sm font-semibold">{esAviso ? "Revisión manual requerida" : evento.numero_presupuesto || "—"}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${colorBadge}`}>{evento.estado}</span>
          </div>

          {motivoLabel && (
            <div className={`flex min-w-0 items-start gap-1 rounded-md px-2 py-1 text-xs ${esAviso ? "bg-amber-50 text-amber-800" : "text-muted-foreground"}`}>
              <InfoCircle className="mt-0.5 size-3.5 shrink-0" />
              <span className="min-w-0 line-clamp-2">{motivoLabel}</span>
            </div>
          )}

          {esAviso && evento.numero_presupuesto && evento.numero_presupuesto !== "(sin ref)" && (
            <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              <Hashtag className="size-3.5 shrink-0" /> <span className="min-w-0 truncate">Candidatos: {evento.numero_presupuesto}</span>
            </p>
          )}

          {evento.resguardo && (
            <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              <Hashtag className="size-3.5 shrink-0" />
              <span className="min-w-0 truncate">
                {evento.resguardo}
                {evento.importe ? ` — ${evento.importe} €` : ""}
              </span>
            </p>
          )}

          {evento.nombre_cliente && (
            <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              <Profile className="size-3.5 shrink-0" /> <span className="min-w-0 truncate">{evento.nombre_cliente}</span>
            </p>
          )}
          {evento.email_cliente && (
            <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              <Sms className="size-3.5 shrink-0" /> <span className="min-w-0 truncate">{evento.email_cliente}</span>
            </p>
          )}

          {evento.respuesta_cliente && <p className="truncate text-xs text-muted-foreground italic">&quot;{evento.respuesta_cliente}&quot;</p>}

          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="size-3 shrink-0" /> {fechaStr}
          </p>
        </div>
      </div>
    </button>
  );
}

function DetalleNotificacionDialog({ evento, onClose }: { evento: WebhookEvento | null; onClose: () => void }) {
  const esAviso = evento?.estado === "Aviso";
  const esAceptado = evento?.estado === "Aceptado";
  const Icono = esAviso ? Warning2 : esAceptado ? TickCircle : Danger;
  const colorIcono = esAviso ? "text-amber-600" : esAceptado ? "text-emerald-600" : "text-destructive";
  const colorBadge = esAviso ? "bg-amber-100 text-amber-800" : esAceptado ? "bg-emerald-100 text-emerald-800" : "bg-destructive/10 text-destructive";
  const motivoLabel = evento?.motivo ? MOTIVO_LABELS[evento.motivo] || evento.motivo : null;
  const fechaStr = evento?.fecha
    ? new Date(evento.fecha).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  return (
    <Dialog open={!!evento} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        {evento && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Icono className={`size-5 shrink-0 ${colorIcono}`} />
                {esAviso ? "Revisión manual requerida" : evento.numero_presupuesto || "Notificación"}
                <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${colorBadge}`}>{evento.estado}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              {motivoLabel && (
                <div className={`flex items-start gap-1.5 rounded-md px-2.5 py-1.5 text-sm ${esAviso ? "bg-amber-50 text-amber-800" : "bg-muted text-muted-foreground"}`}>
                  <InfoCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{motivoLabel}</span>
                </div>
              )}

              {esAviso && evento.numero_presupuesto && evento.numero_presupuesto !== "(sin ref)" && (
                <div className="flex items-start gap-1.5 text-muted-foreground">
                  <Hashtag className="mt-0.5 size-4 shrink-0" />
                  <span><strong className="text-foreground">Candidatos:</strong> {evento.numero_presupuesto}</span>
                </div>
              )}

              {evento.resguardo && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Hashtag className="size-4 shrink-0" />
                  <span>
                    <strong className="text-foreground">Resguardo:</strong> {evento.resguardo}
                    {evento.importe ? ` — ${evento.importe} €` : ""}
                  </span>
                </div>
              )}

              {evento.nombre_cliente && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Profile className="size-4 shrink-0" /> {evento.nombre_cliente}
                </div>
              )}
              {evento.email_cliente && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Sms className="size-4 shrink-0" />
                  <a href={`mailto:${evento.email_cliente}`} className="text-primary hover:underline">{evento.email_cliente}</a>
                </div>
              )}

              {evento.respuesta_cliente && (
                <div className="rounded-md border bg-muted/40 p-2.5 text-sm italic text-muted-foreground">
                  &quot;{evento.respuesta_cliente}&quot;
                </div>
              )}

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5 shrink-0" /> {fechaStr}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
