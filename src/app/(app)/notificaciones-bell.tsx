"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Notification, TickCircle, CloseCircle, Warning2, InfoCircle, Danger, Hashtag, Sms, Profile, Clock, Category2, Copy, AddCircle, Send2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MOTIVO_LABELS, esConsultaCliente, type WebhookEvento } from "@/lib/webhook-eventos";
import { limpiarRespuestaCliente } from "@/lib/texto";
import { toast } from "sonner";

interface PresupuestoPendiente {
  presupuestoId: string;
  numeroPresupuesto: string;
  estado: string;
}

type FiltroFecha = "todas" | "hoy" | "ayer" | "semana" | "mes" | "mes_anterior";
type FiltroTipo = "todos" | "Aviso" | "Aceptado" | "Rechazado";

const FILTROS_FECHA: { valor: FiltroFecha; label: string }[] = [
  { valor: "todas", label: "Todas" },
  { valor: "hoy", label: "Hoy" },
  { valor: "ayer", label: "Ayer" },
  { valor: "semana", label: "Semana" },
  { valor: "mes", label: "Mes" },
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
  if (filtro === "ayer") {
    const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
    return fecha.toDateString() === ayer.toDateString();
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
  const filtroTipoLabel = FILTROS_TIPO.find((f) => f.valor === filtroTipo)?.label || "Todos los tipos";

  // null = todavía no se hizo la primera carga (no avisar sobre "nuevas"
  // que en realidad ya estaban ahí desde antes de abrir la página).
  const noLeidasPrevRef = useRef<number | null>(null);

  function avisarNuevaNotificacion(evento: WebhookEvento | undefined, cuantasNuevas: number) {
    if (!evento) {
      toast.info(cuantasNuevas === 1 ? "1 notificación nueva" : `${cuantasNuevas} notificaciones nuevas`);
      return;
    }
    const esAviso = evento.estado === "Aviso";
    const motivoLabel = evento.motivo ? MOTIVO_LABELS[evento.motivo] || evento.motivo : null;
    const titulo = esAviso ? "Revisión manual requerida" : `Presupuesto ${evento.estado?.toLowerCase()}`;
    const detalle = [evento.nombre_cliente, esAviso ? motivoLabel : evento.numero_presupuesto].filter(Boolean).join(" — ");
    const resto = cuantasNuevas - 1;

    toast.info(titulo, {
      description: resto > 0 ? `${detalle}${detalle ? " " : ""}(y ${resto} más)` : detalle || undefined,
      duration: 5000,
    });
  }

  async function cargarBadge() {
    try {
      const res = await fetch("/api/webhook-eventos?leida=false&porPagina=1");
      const data = await res.json();
      if (!data.ok) return;
      const nuevoConteo = data.noLeidas as number;
      const anterior = noLeidasPrevRef.current;
      if (anterior !== null && nuevoConteo > anterior) {
        avisarNuevaNotificacion((data.eventos as WebhookEvento[])[0], nuevoConteo - anterior);
      }
      noLeidasPrevRef.current = nuevoConteo;
      setNoLeidas(nuevoConteo);
    } catch {
      /* silencioso: el badge es solo un aviso rápido, el panel siempre puede reintentar */
    }
  }

  // Sin un canal real (WebSocket/SSE) desde el backend, se sondea el
  // contador de no-leídas cada 25s — antes solo se cargaba una vez al
  // montar el componente, así que un evento nuevo del workflow no se veía
  // hasta recargar la página a mano (petición del usuario, 2026-09-03).
  // Se pausa mientras el panel está abierto (no tiene sentido, ya se
  // marcan como leídas al abrir) y arranca de nuevo al cerrarlo.
  useEffect(() => {
    cargarBadge();
    if (abierto) return;
    const id = setInterval(cargarBadge, 25_000);
    return () => clearInterval(id);
  }, [abierto]);

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
          // Si no se resetea aquí también, el sondeo periódico compara contra
          // el conteo viejo (de antes de abrir) y una notificación realmente
          // nueva más tarde no dispara el aviso porque "no supera" ese valor.
          noLeidasPrevRef.current = 0;
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
            <div className="flex flex-wrap items-center gap-1 rounded-md border bg-muted/40 p-0.5">
              {FILTROS_FECHA.map((f) => (
                <button
                  key={f.valor}
                  type="button"
                  onClick={() => setFiltroFecha(f.valor)}
                  className={cn(
                    "rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors",
                    filtroFecha === f.valor
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background hover:text-foreground"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

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

          {evento.respuesta_cliente && <p className="truncate text-xs text-muted-foreground italic">&quot;{limpiarRespuestaCliente(evento.respuesta_cliente)}&quot;</p>}

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

  // Rechazar el presupuesto pendiente de un "Aviso" (revisión manual) —
  // petición del usuario, 2026-09-04. Reutiliza POST
  // /api/presupuestos/cambiar-estado (el mismo que usa la ficha de la
  // reparación para rechazar) para que quede en el mismo historial real de
  // la reparación (kelatos_app.historial vía server.js) — no se reinventa
  // el registro aparte. Solo se ofrece el botón cuando hay EXACTAMENTE un
  // presupuesto "enviado" para el resguardo del aviso — con 0 o varios no
  // se adivina cuál, se manda al usuario a la ficha de la reparación.
  const [presupuestosPendientes, setPresupuestosPendientes] = useState<PresupuestoPendiente[]>([]);
  const [cargandoPptos, setCargandoPptos] = useState(false);
  const [motivoAbierto, setMotivoAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [aceptarAbierto, setAceptarAbierto] = useState(false);
  const [hayMas, setHayMas] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Responder consulta — petición del usuario, 2026-09-04: cuando el
  // cliente responde a un presupuesto y de paso hace una pregunta (motivo
  // CONSULTA/ACEPTACION_CON_CONSULTA), poder contestarle por correo desde
  // el propio panel, sin entrar al buzón.
  const [respuestaTexto, setRespuestaTexto] = useState("");
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false);
  const [respuestaEnviada, setRespuestaEnviada] = useState(false);

  useEffect(() => {
    setPresupuestosPendientes([]);
    setMotivoAbierto(false);
    setMotivo("");
    setAceptarAbierto(false);
    setHayMas(false);
    setRespuestaTexto("");
    setRespuestaEnviada(false);
    if (!evento || evento.estado !== "Aviso" || !evento.resguardo) return;
    const resguardo = evento.resguardo;
    setCargandoPptos(true);
    fetch(`/api/reparaciones/${resguardo}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) return;
        const todos = (data.detalle?.presupuestos || []) as PresupuestoPendiente[];
        setPresupuestosPendientes(todos.filter((p) => p.estado === "enviado"));
      })
      .catch(() => {})
      .finally(() => setCargandoPptos(false));
  }, [evento]);

  async function rechazar() {
    if (presupuestosPendientes.length !== 1) return;
    if (!motivo.trim()) return toast.error("El motivo del rechazo es obligatorio");
    setEnviando(true);
    try {
      const res = await fetch("/api/presupuestos/cambiar-estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presupuestoId: presupuestosPendientes[0].presupuestoId, accion: "rechazar", motivo }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Presupuesto rechazado");
      setMotivoAbierto(false);
      setMotivo("");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  async function aceptar() {
    if (presupuestosPendientes.length !== 1) return;
    setEnviando(true);
    try {
      const res = await fetch("/api/presupuestos/cambiar-estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // mantenerEnAceptado: este botón (panel de Notificaciones) nunca debe
        // pasar la reparación a "En Reparación" por su cuenta, aunque el
        // presupuesto no necesite pieza — el técnico inicia la reparación
        // manualmente desde la ficha. El botón de la ficha no manda esto.
        body: JSON.stringify({ presupuestoId: presupuestosPendientes[0].presupuestoId, accion: "aceptar", hayMas, mantenerEnAceptado: true }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Presupuesto aceptado");
      setAceptarAbierto(false);
      setHayMas(false);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  async function responderConsulta() {
    if (!evento || !respuestaTexto.trim()) return;
    setEnviandoRespuesta(true);
    try {
      const res = await fetch(`/api/webhook-eventos/${evento.id}/responder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: respuestaTexto.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Respuesta enviada al cliente");
      setRespuestaEnviada(true);
      setRespuestaTexto("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviandoRespuesta(false);
    }
  }

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
                  <button
                    type="button"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    title="Copiar email"
                    onClick={() => {
                      navigator.clipboard.writeText(evento.email_cliente as string);
                      toast.success("Email copiado");
                    }}
                  >
                    <Copy className="size-3" />
                  </button>
                </div>
              )}

              {evento.respuesta_cliente && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">Respuesta del cliente:</p>
                  <div className="rounded-md border bg-muted/40 p-2.5 text-sm italic text-muted-foreground">
                    &quot;{limpiarRespuestaCliente(evento.respuesta_cliente)}&quot;
                  </div>
                </div>
              )}

              {esConsultaCliente(evento.motivo) && evento.email_cliente && (
                <div className="space-y-1.5 rounded-md border border-primary/30 bg-primary/5 p-2.5">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Send2 className="size-3.5" /> Responder consulta
                  </p>
                  {respuestaEnviada ? (
                    <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                      <TickCircle className="size-3.5" /> Respuesta enviada a {evento.email_cliente}
                    </p>
                  ) : (
                    <>
                      <Textarea
                        value={respuestaTexto}
                        onChange={(e) => setRespuestaTexto(e.target.value)}
                        placeholder={`Escribe la respuesta para ${evento.nombre_cliente || evento.email_cliente}...`}
                        rows={3}
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={responderConsulta}
                          disabled={enviandoRespuesta || !respuestaTexto.trim()}
                        >
                          <Send2 className="size-3.5" />
                          {enviandoRespuesta ? "Enviando..." : "Enviar respuesta"}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5 shrink-0" /> {fechaStr}
              </div>

              {esAviso && evento.resguardo && (
                <div className="border-t pt-3">
                  {cargandoPptos ? (
                    <p className="text-xs text-muted-foreground">Comprobando presupuestos pendientes...</p>
                  ) : presupuestosPendientes.length === 1 ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => setAceptarAbierto(true)}
                      >
                        <TickCircle className="size-3.5" />
                        Aceptar presupuesto {presupuestosPendientes[0].numeroPresupuesto || ""}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-destructive hover:bg-destructive/10"
                        onClick={() => setMotivoAbierto(true)}
                      >
                        <CloseCircle className="size-3.5" />
                        Rechazar
                      </Button>
                    </div>
                  ) : presupuestosPendientes.length > 1 ? (
                    <p className="text-xs text-muted-foreground">
                      Hay {presupuestosPendientes.length} presupuestos pendientes de respuesta para este resguardo — ve a la ficha
                      de la reparación #{evento.resguardo} para rechazar el que corresponda.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">No hay ningún presupuesto pendiente de respuesta para este resguardo.</p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
            </DialogFooter>

            <Dialog open={aceptarAbierto} onOpenChange={(o) => { if (!enviando) { setAceptarAbierto(o); if (!o) setHayMas(false); } }}>
              <DialogContent className="sm:max-w-sm">
                <DialogTitle>¿El cliente aceptó el presupuesto {presupuestosPendientes[0]?.numeroPresupuesto}?</DialogTitle>
                <p className="text-sm text-muted-foreground">Resguardo {evento.resguardo}.</p>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">¿Habrá más presupuestos a aceptar en esta reparación?</p>
                  <RadioGroup value={hayMas ? "si" : "no"} onValueChange={(v) => setHayMas(v === "si")} className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="no" />
                      <TickCircle className="size-4 text-emerald-600" /> No, es el único o último
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="si" />
                      <AddCircle className="size-4 text-primary" /> Sí, se aceptarán más presupuestos
                    </label>
                  </RadioGroup>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setAceptarAbierto(false)} disabled={enviando}>
                    Cancelar
                  </Button>
                  <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={aceptar} disabled={enviando}>
                    {enviando ? "Guardando..." : "Confirmar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={motivoAbierto} onOpenChange={(o) => { if (!enviando) setMotivoAbierto(o); }}>
              <DialogContent className="sm:max-w-sm">
                <DialogTitle>Rechazar presupuesto</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Vas a rechazar <strong className="text-foreground">{presupuestosPendientes[0]?.numeroPresupuesto}</strong> del
                  resguardo {evento.resguardo}. Indica el motivo:
                </p>
                <Textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Motivo del rechazo..."
                  rows={3}
                  autoFocus
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setMotivoAbierto(false)} disabled={enviando}>
                    Cancelar
                  </Button>
                  <Button variant="destructive" onClick={rechazar} disabled={enviando || !motivo.trim()}>
                    {enviando ? "Rechazando..." : "Confirmar rechazo"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
