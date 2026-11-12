"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CloseCircle } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { fechaHora, haceCuanto } from "@/lib/crm";
import type { MensajeDetalle, MensajeLista } from "@/lib/mails";
import { CuerpoMensaje, LinksAdjuntos } from "@/app/mails/componentes-correo";

/** «Quién lo envió» en lenguaje de persona: empleado, envío automático o desconocido (correos enviados desde fuera del app no registran usuario). */
export function quienEnvio(m: { direccion: string; enviado_por?: string | null }): string | null {
  if (m.direccion !== "salida") return null;
  const v = (m.enviado_por || "").trim();
  if (!v) return "Enviado desde el correo (sin usuario registrado)";
  if (v.includes("@")) {
    const nombre = v.split("@")[0].split(/[._-]/).filter(Boolean).map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(" ");
    return `Enviado por ${nombre} (${v})`;
  }
  if (/^automatico/i.test(v)) return `Envío automático (${v.replace(/^automatico-?/i, "") || "sistema"})`;
  return `Enviado por ${v}`;
}

type Estado = { cargando: boolean; sinAcceso: boolean; error: string | null; mensajes: MensajeLista[] };
const INICIAL: Estado = { cargando: true, sinAcceso: false, error: null, mensajes: [] };

async function pedir(correo: string, q?: string): Promise<Estado> {
  const p = new URLSearchParams({ email: correo, vista: "todos", limit: "50" });
  if (q) p.set("q", q);
  try {
    const r = await fetch(`/api/mails/mensajes?${p}`);
    const datos = await r.json().catch(() => ({}));
    if (r.status === 403) return { cargando: false, sinAcceso: true, error: null, mensajes: [] };
    if (!datos.ok) return { cargando: false, sinAcceso: false, error: datos.error || "No se pudieron cargar los correos", mensajes: [] };
    return { cargando: false, sinAcceso: false, error: null, mensajes: datos.mensajes as MensajeLista[] };
  } catch {
    return { cargando: false, sinAcceso: false, error: "No se pudieron cargar los correos", mensajes: [] };
  }
}

/** Correos con el cliente de una reparación (recibidos y enviados) desde el Centro de mails.
    El aviso de «sin leer» cuenta siempre todos los correos del cliente; `soloEstaReparacion`
    solo cambia la lista, limitándola a los que mencionan el resguardo. */
export function useMensajesCliente(email: string | null | undefined, resguardo: string, soloEstaReparacion: boolean) {
  // Un campo como «No tiene» no es un correo: se trata como "sin correo" (antes se pedía igualmente y el servidor devolvía los correos de todo el buzón).
  const bruto = String(email || "").trim().toLowerCase();
  const correo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bruto) ? bruto : "";
  const [todos, setTodos] = useState<Estado>(INICIAL);
  const [esta, setEsta] = useState<Estado>(INICIAL);

  useEffect(() => {
    if (!correo) return setTodos({ ...INICIAL, cargando: false });
    let activo = true;
    setTodos(INICIAL);
    pedir(correo).then((e) => activo && setTodos(e));
    return () => { activo = false; };
  }, [correo]);

  useEffect(() => {
    if (!correo || !soloEstaReparacion || !resguardo) return;
    let activo = true;
    setEsta(INICIAL);
    pedir(correo, resguardo).then((e) => activo && setEsta(e));
    return () => { activo = false; };
  }, [correo, resguardo, soloEstaReparacion]);

  /** Tras abrir un mensaje recibido el servidor lo marca como leído; aquí se refleja sin recargar. */
  function marcarLeidoLocal(id: number) {
    const marca = (e: Estado): Estado => ({ ...e, mensajes: e.mensajes.map((m) => (m.id === id ? { ...m, leido: true } : m)) });
    setTodos(marca);
    setEsta(marca);
  }

  const vista = soloEstaReparacion ? esta : todos;
  const sinLeer = todos.mensajes.filter((m) => m.direccion === "entrada" && !m.leido && !m.es_rebote).length;
  return { ...vista, sinAcceso: todos.sinAcceso, sinLeer, correo, marcarLeidoLocal };
}

export type DatosMensajes = ReturnType<typeof useMensajesCliente>;

/** Pestaña «Mensajes» del detalle de una reparación. */
export function PanelMensajes({
  resguardo, datos, soloEstaReparacion, onCambiarAlcance, abiertoId, onAbrir,
}: {
  resguardo: string;
  datos: DatosMensajes;
  soloEstaReparacion: boolean;
  onCambiarAlcance: (soloEsta: boolean) => void;
  abiertoId: number | null;
  onAbrir: (m: MensajeLista) => void;
}) {
  const { cargando, sinAcceso, error, mensajes, sinLeer, correo } = datos;
  const ultimo = mensajes[0] ?? null; // la lista llega de más reciente a más antigua

  if (!correo) return <p className="pt-2 text-sm text-muted-foreground">Esta reparación no tiene correo de cliente.</p>;
  if (sinAcceso) return <p className="pt-2 text-sm text-muted-foreground">Tu cuenta no tiene acceso al Centro de mails, así que aquí no se muestran los correos con el cliente.</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{correo}</p>
          <p className="text-xs text-muted-foreground">
            {cargando ? "Cargando…" : `${mensajes.length} ${mensajes.length === 1 ? "mensaje" : "mensajes"}`}
            {sinLeer > 0 && <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 font-medium text-red-700">{sinLeer} sin leer</span>}
          </p>
        </div>
        <Link href={`/mails/bandeja?email=${encodeURIComponent(correo)}`} target="_blank" className="rounded-md border px-3 py-1.5 text-sm font-medium text-primary hover:bg-accent">
          Abrir en Gestión MAILS
        </Link>
      </div>

      <div className="inline-flex rounded-md border p-0.5 text-xs">
        {([[false, "Todos los correos del cliente"], [true, `Solo los que mencionan ${resguardo}`]] as const).map(([valor, texto]) => (
          <button key={String(valor)} type="button" onClick={() => onCambiarAlcance(valor)} className={cn("rounded px-2.5 py-1", soloEstaReparacion === valor ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>{texto}</button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {cargando && <Skeleton className="h-24 w-full" />}

      {!cargando && !error && ultimo && (
        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          <span className="font-medium">Último mensaje: </span>
          {ultimo.direccion === "entrada" ? "lo escribió el cliente" : "se lo enviamos nosotros"} · {haceCuanto(ultimo.fecha)} ·{" "}
          {ultimo.direccion === "entrada"
            ? ultimo.leido ? <span className="text-emerald-700">leído por nosotros</span> : <span className="font-medium text-red-600">sin leer</span>
            : <span className="text-muted-foreground">enviado</span>}
        </div>
      )}

      {!cargando && !error && mensajes.length === 0 && <p className="text-sm text-muted-foreground">No hay correos con este cliente{soloEstaReparacion ? " que mencionen esta reparación" : ""}.</p>}

      {!cargando && mensajes.length > 0 && (
        <ul className="divide-y rounded-xl border">
          {mensajes.map((m) => {
            const recibido = m.direccion === "entrada";
            const sinLeerEste = recibido && !m.leido && !m.es_rebote;
            return (
              <li key={m.id}>
                <button type="button" onClick={() => onAbrir(m)} className={cn("block w-full px-3 py-2 text-left hover:bg-accent/50", abiertoId === m.id && "bg-accent/60")}>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={cn("rounded px-1.5 py-0.5 font-medium", recibido ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800")}>{recibido ? "Recibido" : "Enviado"}</span>
                    {sinLeerEste && <span className="rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-700">Sin leer</span>}
                    <span className="ml-auto text-muted-foreground" title={fechaHora(m.fecha)}>{fechaHora(m.fecha)}</span>
                  </div>
                  <p className={cn("mt-1 truncate text-sm", sinLeerEste && "font-semibold")}>{m.asunto || "(sin asunto)"}</p>
                  {m.resumen && <p className="truncate text-xs text-muted-foreground">{m.resumen}</p>}
                  {quienEnvio(m) && <p className="mt-0.5 truncate text-[11px] font-medium text-emerald-700 dark:text-emerald-400">{quienEnvio(m)}</p>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Mensaje abierto, a la derecha del detalle de la reparación. Al abrirlo el servidor lo marca como leído. */
export function PanelMensajeAbierto({ id, correo, onCerrar, onLeido }: { id: number; correo: string; onCerrar: () => void; onLeido: (id: number) => void }) {
  const [m, setM] = useState<MensajeDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    setM(null);
    setError(null);
    fetch(`/api/mails/mensajes/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!activo) return;
        if (!d.ok) return setError(d.error || "No se pudo abrir el mensaje");
        setM(d.mensaje as MensajeDetalle);
        if (!d.mensaje.leido && d.mensaje.direccion === "entrada") onLeido(id);
      })
      .catch(() => activo && setError("No se pudo abrir el mensaje"));
    return () => { activo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-2 border-b bg-muted/30 px-4 py-3">
        <p className="min-w-0 text-sm font-semibold">{m?.asunto || "Mensaje"}</p>
        <Button variant="ghost" size="icon-sm" className="shrink-0" onClick={onCerrar} title="Cerrar el mensaje">
          <CloseCircle className="size-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && <p className="p-4 text-sm text-destructive">{error}</p>}
        {!m && !error && <Skeleton className="m-4 h-40" />}
        {m && (
          <>
            <div className="space-y-0.5 border-b px-4 py-2 text-xs text-muted-foreground">
              <p><span className="font-medium text-foreground">{m.direccion === "entrada" ? "De" : "Para"}:</span> {m.direccion === "entrada" ? (m.remitente_nombre ? `${m.remitente_nombre} <${m.remitente}>` : m.remitente) : m.destinatarios}</p>
              <p><span className="font-medium text-foreground">Fecha:</span> {fechaHora(m.fecha)}</p>
              {quienEnvio(m) && <p><span className="font-medium text-foreground">Quién lo envió:</span> {quienEnvio(m)!.replace(/^Enviado por /, "")}</p>}
              <LinksAdjuntos adjuntos={m.adjuntos} />
            </div>
            <CuerpoMensaje m={m} altura="h-[62vh]" ajustar />
          </>
        )}
      </div>
      <div className="border-t px-4 py-2">
        <Link href={`/mails/bandeja?email=${encodeURIComponent(correo)}`} target="_blank" className="text-sm font-medium text-primary hover:underline">
          Abrir en Gestión MAILS para responder
        </Link>
      </div>
    </div>
  );
}
