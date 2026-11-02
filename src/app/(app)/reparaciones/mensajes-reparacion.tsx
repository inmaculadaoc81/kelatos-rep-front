"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fechaHora, haceCuanto } from "@/lib/crm";
import type { MensajeLista } from "@/lib/mails";

type Estado = { cargando: boolean; sinAcceso: boolean; error: string | null; mensajes: MensajeLista[] };

/** Correos con el cliente de una reparación (recibidos y enviados) desde el Centro de mails.
    `soloEstaReparacion` limita a los que mencionan el número de resguardo. */
export function useMensajesCliente(email: string | null | undefined, resguardo: string, soloEstaReparacion: boolean) {
  const [estado, setEstado] = useState<Estado>({ cargando: true, sinAcceso: false, error: null, mensajes: [] });
  const correo = String(email || "").trim().toLowerCase();

  useEffect(() => {
    if (!correo) {
      setEstado({ cargando: false, sinAcceso: false, error: null, mensajes: [] });
      return;
    }
    let activo = true;
    const p = new URLSearchParams({ email: correo, vista: "todos", limit: "50" });
    if (soloEstaReparacion) p.set("q", resguardo);
    fetch(`/api/mails/mensajes?${p}`)
      .then(async (r) => ({ status: r.status, datos: await r.json().catch(() => ({})) }))
      .then(({ status, datos }) => {
        if (!activo) return;
        if (status === 403) return setEstado({ cargando: false, sinAcceso: true, error: null, mensajes: [] });
        if (!datos.ok) return setEstado({ cargando: false, sinAcceso: false, error: datos.error || "No se pudieron cargar los correos", mensajes: [] });
        setEstado({ cargando: false, sinAcceso: false, error: null, mensajes: datos.mensajes as MensajeLista[] });
      })
      .catch(() => activo && setEstado({ cargando: false, sinAcceso: false, error: "No se pudieron cargar los correos", mensajes: [] }));
    return () => {
      activo = false;
    };
  }, [correo, resguardo, soloEstaReparacion]);

  const sinLeer = estado.mensajes.filter((m) => m.direccion === "entrada" && !m.leido).length;
  return { ...estado, sinLeer, correo };
}

/** Pestaña «Mensajes» del detalle de una reparación. */
export function PanelMensajes({
  resguardo, datos, soloEstaReparacion, onCambiarAlcance,
}: {
  resguardo: string;
  datos: ReturnType<typeof useMensajesCliente>;
  soloEstaReparacion: boolean;
  onCambiarAlcance: (soloEsta: boolean) => void;
}) {
  const { cargando, sinAcceso, error, mensajes, sinLeer, correo } = datos;
  const ultimo = mensajes[0] ?? null; // la lista llega de más reciente a más antigua
  const enlace = `/mails/bandeja?email=${encodeURIComponent(correo)}`;

  if (!correo) return <p className="pt-2 text-sm text-muted-foreground">Esta reparación no tiene correo de cliente.</p>;
  if (sinAcceso) return <p className="pt-2 text-sm text-muted-foreground">Tu cuenta no tiene acceso al Centro de mails, así que aquí no se muestran los correos con el cliente.</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{correo}</p>
          <p className="text-xs text-muted-foreground">
            {cargando ? "Cargando…" : `${mensajes.length} ${mensajes.length === 1 ? "mensaje" : "mensajes"}`}
            {sinLeer > 0 && <span className="ml-2 rounded-full bg-sky-100 px-1.5 py-0.5 font-medium text-sky-800">{sinLeer} sin leer</span>}
          </p>
        </div>
        <Link href={enlace} target="_blank" className="rounded-md border px-3 py-1.5 text-sm font-medium text-primary hover:bg-accent">
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
            ? ultimo.leido ? <span className="text-emerald-700">leído por nosotros</span> : <span className="font-medium text-sky-700">sin leer</span>
            : <span className="text-muted-foreground">enviado</span>}
        </div>
      )}

      {!cargando && !error && mensajes.length === 0 && <p className="text-sm text-muted-foreground">No hay correos con este cliente{soloEstaReparacion ? " que mencionen esta reparación" : ""}.</p>}

      {!cargando && mensajes.length > 0 && (
        <ul className="divide-y rounded-xl border">
          {mensajes.map((m) => {
            const recibido = m.direccion === "entrada";
            const sinLeerEste = recibido && !m.leido;
            return (
              <li key={m.id}>
                <Link href={`/mails/bandeja?email=${encodeURIComponent(correo)}`} target="_blank" className="block px-3 py-2 hover:bg-accent/50">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={cn("rounded px-1.5 py-0.5 font-medium", recibido ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800")}>{recibido ? "Recibido" : "Enviado"}</span>
                    {sinLeerEste && <span className="rounded bg-sky-100 px-1.5 py-0.5 font-medium text-sky-800">Sin leer</span>}
                    <span className="ml-auto text-muted-foreground" title={fechaHora(m.fecha)}>{fechaHora(m.fecha)}</span>
                  </div>
                  <p className={cn("mt-1 truncate text-sm", sinLeerEste && "font-semibold")}>{m.asunto || "(sin asunto)"}</p>
                  {m.resumen && <p className="truncate text-xs text-muted-foreground">{m.resumen}</p>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
