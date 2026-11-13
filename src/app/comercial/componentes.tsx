"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Call, Calendar, Clock, TickCircle, Warning2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useSoftphone, type ResumenFinLlamada } from "../(app)/softphone";
import {
  apiComercial, fechaHoraCorta, COLOR_ESTADO_CONTACTO, ETIQUETA_ESTADO_CONTACTO, ETIQUETA_RESULTADO,
  type AgenteComercial, type Contacto, type Gestion, type Reunion, type ResultadoLlamada,
} from "@/lib/comercial";
import { useComercial } from "./contexto";

export function InsigniaEstado({ estado }: { estado: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", COLOR_ESTADO_CONTACTO[estado] || "bg-muted text-muted-foreground")}>
      {ETIQUETA_ESTADO_CONTACTO[estado] || estado}
    </span>
  );
}

/** Solo para administradores: elegir de qué agente se ven los datos. `todos` permite ver el conjunto. */
export function SelectorAgente({ valor, onCambio, conTodos = true }: { valor: string; onCambio: (v: string) => void; conTodos?: boolean }) {
  const { admin } = useComercial();
  const [agentes, setAgentes] = useState<AgenteComercial[]>([]);
  useEffect(() => {
    if (!admin) return;
    let vivo = true;
    apiComercial<{ agentes: AgenteComercial[] }>("agentes").then((d) => { if (vivo) setAgentes(d.agentes); }).catch(() => {});
    return () => { vivo = false; };
  }, [admin]);
  if (!admin) return null;
  const TODOS = "__todos";
  const opciones = [...(conTodos ? [{ email: TODOS, nombre: "Todos los agentes" }] : []), ...agentes.filter((a) => a.activo).map((a) => ({ email: a.email, nombre: a.nombre }))];
  return (
    <div>
      <label className="mb-1 block text-xs text-muted-foreground">Agente</label>
      <Select value={valor || (conTodos ? TODOS : "")} onValueChange={(v) => onCambio(!v || v === TODOS ? "" : v)}>
        <SelectTrigger className="h-9 w-56" aria-label="Agente">
          <SelectValue placeholder="Elige un agente">{(v: string) => opciones.find((o) => o.email === v)?.nombre ?? "Elige un agente"}</SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {opciones.map((o) => <SelectItem key={o.email} value={o.email}>{o.nombre}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

const OPCIONES_RESULTADO: { valor: ResultadoLlamada; descripcion: string }[] = [
  { valor: "no_contesta", descripcion: "No cogió el teléfono. Se reintenta más tarde." },
  { valor: "volver_a_llamar", descripcion: "Pidió que se le llame en otro momento." },
  { valor: "interesado", descripcion: "Quiere saber más; queda en tu lista de seguimiento." },
  { valor: "reunion", descripcion: "Se agenda una reunión." },
  { valor: "no_interesa", descripcion: "No quiere el servicio. No vuelve a salir." },
  { valor: "erroneo", descripcion: "El número no existe o no es de la empresa." },
  { valor: "venta", descripcion: "Ha contratado." },
];

function localAISO(valor: string): string | undefined {
  if (!valor) return undefined;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Valor por defecto de un <input type="datetime-local">: mañana a las 10:00. */
function mananaA(hora: number): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hora, 0, 0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Qué ha pasado con esta llamada (o una nota sin llamada). Actualiza el estado del contacto y, si hay reunión, la agenda. */
export function ResultadoDialog({
  contacto, llamadaId, contestada, onCerrar, onGuardado,
}: {
  contacto: Pick<Contacto, "id" | "empresa" | "telefono">;
  llamadaId?: string | null;
  contestada?: boolean;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [resultado, setResultado] = useState<ResultadoLlamada | "">(contestada === false ? "no_contesta" : "");
  const [nota, setNota] = useState("");
  const [proxima, setProxima] = useState(mananaA(10));
  const [reunionCuando, setReunionCuando] = useState(mananaA(11));
  const [canal, setCanal] = useState("videollamada");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!resultado && !nota.trim()) return toast.error("Elige un resultado o escribe una nota");
    if (resultado === "volver_a_llamar" && !localAISO(proxima)) return toast.error("Indica cuándo volver a llamar");
    if (resultado === "reunion" && !localAISO(reunionCuando)) return toast.error("Indica la fecha y hora de la reunión");
    setGuardando(true);
    try {
      await apiComercial(`contactos/${contacto.id}/gestion`, {
        metodo: "POST",
        cuerpo: {
          resultado: resultado || undefined,
          nota: nota.trim() || undefined,
          llamadaId: llamadaId || undefined,
          proximaLlamada: resultado === "volver_a_llamar" || resultado === "interesado" ? localAISO(proxima) : undefined,
          reunion: resultado === "reunion" ? { fechaHora: localAISO(reunionCuando), canal } : undefined,
        },
      });
      toast.success("Guardado");
      onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !guardando) onCerrar(); }}>
      <DialogContent className="max-h-[90vh] gap-3 overflow-y-auto sm:max-w-lg">
        <DialogTitle className="flex items-center gap-2"><Call className="size-5 text-primary" /> {llamadaId ? "¿Cómo ha ido la llamada?" : "Registrar resultado"}</DialogTitle>
        <DialogDescription>{contacto.empresa} · {contacto.telefono}</DialogDescription>

        <div className="grid gap-1.5">
          {OPCIONES_RESULTADO.map((o) => (
            <button
              key={o.valor}
              type="button"
              onClick={() => setResultado(o.valor)}
              className={cn("flex flex-col rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50", resultado === o.valor && "border-primary bg-primary/5")}
            >
              <span className="font-medium">{ETIQUETA_RESULTADO[o.valor]}</span>
              <span className="text-xs text-muted-foreground">{o.descripcion}</span>
            </button>
          ))}
        </div>

        {(resultado === "volver_a_llamar" || resultado === "interesado") && (
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{resultado === "volver_a_llamar" ? "Volver a llamar el *" : "Volver a llamar el (opcional)"}</label>
            <Input type="datetime-local" value={proxima} onChange={(e) => setProxima(e.target.value)} />
          </div>
        )}
        {resultado === "reunion" && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Fecha y hora de la reunión *</label>
              <Input type="datetime-local" value={reunionCuando} onChange={(e) => setReunionCuando(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Cómo</label>
              <Select value={canal} onValueChange={(v) => v && setCanal(v)}>
                <SelectTrigger className="h-9 w-full"><SelectValue>{(v: string) => ({ videollamada: "Videollamada", llamada: "Llamada", presencial: "Presencial" }[v] ?? v)}</SelectValue></SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value="videollamada">Videollamada</SelectItem>
                  <SelectItem value="llamada">Llamada</SelectItem>
                  <SelectItem value="presencial">Presencial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Nota (opcional)</label>
          <Textarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Qué dijo, qué necesita, quién decide…" className="min-h-20" />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCerrar} disabled={guardando}>{llamadaId ? "Lo registro luego" : "Cancelar"}</Button>
          <Button onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Llamar a un contacto con el softphone del dashboard; al colgar, abre el diálogo de resultado. */
export function useLlamarContacto(alColgar: (c: Contacto, fin: ResumenFinLlamada) => void) {
  const softphone = useSoftphone();
  const llamar = useCallback(
    (c: Contacto, telefono?: string) => {
      if (!softphone.disponible) return toast.error("La telefonía no está disponible ahora mismo");
      void softphone.llamar({ telefono: telefono || c.telefono, nombre: c.empresa, contactoId: Number(c.id), alTerminar: (fin) => alColgar(c, fin) });
    },
    [softphone, alColgar]
  );
  return { llamar, disponible: softphone.disponible, ocupado: softphone.ocupado };
}

function Dato({ etiqueta, valor, enlace }: { etiqueta: string; valor: string | null | undefined; enlace?: "mail" | "web" | "tel" }) {
  if (!valor) return null;
  const href = enlace === "mail" ? `mailto:${valor}` : enlace === "web" ? (/^https?:/i.test(valor) ? valor : `https://${valor}`) : enlace === "tel" ? `tel:${valor}` : null;
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{etiqueta}</div>
      {href ? <a href={href} target={enlace === "web" ? "_blank" : undefined} rel="noreferrer" className="break-words text-sm text-primary hover:underline">{valor}</a> : <div className="break-words text-sm">{valor}</div>}
    </div>
  );
}

/** Ficha completa de un contacto: datos, botones de llamar, historial de gestiones y reuniones. */
export function FichaContacto({ id, onCambio, onCerrar }: { id: string; onCambio?: () => void; onCerrar?: () => void }) {
  const [datos, setDatos] = useState<{ contacto: Contacto; gestiones: Gestion[]; reuniones: Reunion[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [registrando, setRegistrando] = useState<{ llamadaId?: string | null; contestada?: boolean } | null>(null);

  useEffect(() => {
    let vivo = true;
    apiComercial<{ contacto: Contacto; gestiones: Gestion[]; reuniones: Reunion[] }>(`contactos/${id}`)
      .then((d) => { if (vivo) setDatos(d); })
      .catch((e) => { if (vivo) setError(e instanceof Error ? e.message : "No se pudo cargar"); });
    return () => { vivo = false; };
  }, [id, recarga]);

  const alColgar = useCallback((_c: Contacto, fin: ResumenFinLlamada) => setRegistrando({ llamadaId: fin.llamadaId, contestada: fin.contestada }), []);
  const { llamar, ocupado } = useLlamarContacto(alColgar);

  if (error) return <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>;
  if (!datos) return <div className="space-y-2"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-32 w-full" /></div>;
  const c = datos.contacto;
  const cambiado = () => { setRecarga((n) => n + 1); onCambio?.(); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{c.empresa}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2"><InsigniaEstado estado={c.estado} /><span className="text-xs text-muted-foreground">Lista: {c.lista} · {c.intentos} {c.intentos === 1 ? "intento" : "intentos"}</span></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => llamar(c)} disabled={ocupado} className="gap-1.5"><Call className="size-4" /> Llamar</Button>
          {c.telefono2 && <Button variant="outline" onClick={() => llamar(c, c.telefono2!)} disabled={ocupado} className="gap-1.5"><Call className="size-4" /> Otro teléfono</Button>}
          <Button variant="outline" onClick={() => setRegistrando({})}>Registrar resultado / nota</Button>
          {onCerrar && <Button variant="ghost" onClick={onCerrar}>Cerrar</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/30 p-3 sm:grid-cols-3">
        <Dato etiqueta="Teléfono" valor={c.telefono} enlace="tel" />
        <Dato etiqueta="Otro teléfono" valor={c.telefono2} enlace="tel" />
        <Dato etiqueta="Persona de contacto" valor={c.contacto} />
        <Dato etiqueta="Cargo" valor={c.cargo} />
        <Dato etiqueta="Correo" valor={c.email} enlace="mail" />
        <Dato etiqueta="Web" valor={c.web} enlace="web" />
        <Dato etiqueta="Ciudad" valor={c.ciudad} />
        <Dato etiqueta="Sector" valor={c.sector} />
        {c.proxima_llamada && <Dato etiqueta="Volver a llamar" valor={fechaHoraCorta(c.proxima_llamada)} />}
      </div>
      {c.notas && <p className="rounded-xl border p-3 text-sm"><span className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Notas de la lista</span>{c.notas}</p>}

      {datos.reuniones.length > 0 && (
        <div>
          <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-primary"><Calendar className="size-4" /> Reuniones</h4>
          <ul className="space-y-1">
            {datos.reuniones.map((m) => <li key={m.id} className="rounded-lg border px-3 py-1.5 text-sm">{fechaHoraCorta(m.fecha_hora)} · {m.canal} · <span className="text-muted-foreground">{m.estado}</span>{m.nota ? ` · ${m.nota}` : ""}</li>)}
          </ul>
        </div>
      )}

      <div>
        <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-primary"><Clock className="size-4" /> Historial</h4>
        {datos.gestiones.length === 0 ? (
          <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">Todavía no se ha trabajado este contacto.</p>
        ) : (
          <ul className="space-y-1.5">
            {datos.gestiones.map((g) => (
              <li key={g.id} className="rounded-lg border px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="tabular-nums">{fechaHoraCorta(g.creada_en)}</span>
                  <span>{g.agente}</span>
                  {g.resultado && <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">{ETIQUETA_RESULTADO[g.resultado] || g.resultado}</span>}
                </div>
                {g.nota && <p className="mt-1 whitespace-pre-wrap">{g.nota}</p>}
                {g.proxima_llamada && <p className="mt-0.5 text-xs text-muted-foreground">Volver a llamar: {fechaHoraCorta(g.proxima_llamada)}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {registrando && (
        <ResultadoDialog
          contacto={c}
          llamadaId={registrando.llamadaId}
          contestada={registrando.contestada}
          onCerrar={() => setRegistrando(null)}
          onGuardado={() => { setRegistrando(null); cambiado(); }}
        />
      )}
    </div>
  );
}

/** Ventana con la ficha de un contacto (para abrirla desde listas y tablas). */
export function FichaDialog({ id, onCerrar, onCambio }: { id: string; onCerrar: () => void; onCambio?: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCerrar(); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogTitle className="sr-only">Ficha del contacto</DialogTitle>
        <DialogDescription className="sr-only">Datos, historial y reuniones del contacto</DialogDescription>
        <FichaContacto id={id} onCambio={onCambio} />
      </DialogContent>
    </Dialog>
  );
}

export function AvisoSinTelefonia() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
      <Warning2 className="size-4 shrink-0" /> La telefonía no está disponible ahora mismo, así que no se puede llamar desde el navegador.
    </div>
  );
}

export function Hecho({ texto }: { texto: string }) {
  return <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400"><TickCircle className="size-3.5" /> {texto}</span>;
}
