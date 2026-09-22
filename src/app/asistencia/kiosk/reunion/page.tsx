"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Profile2User, Clock, PauseCircle, Sms } from "@/lib/icons";
import { formatDuracion } from "@/lib/remote-workers";

interface Dispositivo {
  id: number;
  hostname: string;
  reunionActiva: { id: number; inicio: string } | null;
}

interface Hoy {
  active_seconds: number;
  idle_seconds: number;
  reunion_seconds: number;
}

const POLL_MS = 15000;

/** Mientras el PC no toca teclado/ratón durante una reunión (llamada,
    videollamada), el agente lo reporta como "inactivo" — normal, nadie
    escribe en una reunión. Este botón lo corrige: mientras está marcado,
    ese tiempo pasa a contarse como Reunión y no como Inactivo. Petición
    del usuario, 2026-09-22. */
export default function ReunionPage() {
  const [cargando, setCargando] = useState(true);
  const [dispositivo, setDispositivo] = useState<Dispositivo | null>(null);
  const [hoy, setHoy] = useState<Hoy | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const res = await fetch("/api/asistencia/kiosk/reunion");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setDispositivo(data.dispositivo);
      setHoy(data.detalle?.hoy || null);
    } catch (e) {
      if (!silencioso) toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(() => cargar(true), POLL_MS);
    return () => clearInterval(t);
  }, [cargar]);

  // Reloj propio para el "llevas X" en vivo, sin esperar al próximo poll.
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  async function iniciar() {
    if (!dispositivo) return;
    setEnviando(true);
    try {
      const res = await fetch("/api/asistencia/kiosk/reunion/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: dispositivo.id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Reunión iniciada — el tiempo inactivo desde ahora no cuenta como inactivo");
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  async function finalizar() {
    if (!dispositivo) return;
    setEnviando(true);
    try {
      const res = await fetch("/api/asistencia/kiosk/reunion/finalizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: dispositivo.id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Reunión finalizada");
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!dispositivo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Profile2User className="size-5" /> Reunión</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Todavía no tienes ningún equipo remoto vinculado a tu usuario. Pídele a un administrador que lo vincule desde
            Asistencia → Remote Workers para poder usar el botón de Reunión.
          </p>
        </CardContent>
      </Card>
    );
  }

  const activa = dispositivo.reunionActiva;
  const segundosEnCurso = activa ? Math.max(0, Math.floor((ahora - new Date(activa.inicio).getTime()) / 1000)) : 0;

  return (
    <div className="space-y-4">
      <Card className={activa ? "border-amber-400" : undefined}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Profile2User className="size-5" /> Reunión
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activa ? (
            <div className="rounded-lg bg-amber-500/10 p-4 text-center">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Reunión en curso</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-amber-700 dark:text-amber-400">{formatDuracion(segundosEnCurso)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Desde las {new Date(activa.inicio).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Pulsa el botón cuando entres a una llamada o videollamada — el tiempo que no toques el teclado mientras tanto no
              contará como inactivo.
            </p>
          )}

          <Button
            size="lg"
            className="w-full gap-2"
            variant={activa ? "destructive" : "default"}
            disabled={enviando}
            onClick={activa ? finalizar : iniciar}
          >
            {activa ? <PauseCircle className="size-5" /> : <Sms className="size-5" />}
            {enviando ? "Un momento…" : activa ? "Finalizar reunión" : "Iniciar reunión"}
          </Button>
        </CardContent>
      </Card>

      {hoy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="size-4" /> Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-green-500/10 p-2">
                <p className="text-[11px] text-muted-foreground">Activo</p>
                <p className="text-sm font-semibold tabular-nums">{formatDuracion(hoy.active_seconds)}</p>
              </div>
              <div className="rounded-md bg-amber-500/10 p-2">
                <p className="text-[11px] text-muted-foreground">Reunión</p>
                <p className="text-sm font-semibold tabular-nums">{formatDuracion(hoy.reunion_seconds)}</p>
              </div>
              <div className="rounded-md bg-muted p-2">
                <p className="text-[11px] text-muted-foreground">Inactivo</p>
                <p className="text-sm font-semibold tabular-nums">{formatDuracion(hoy.idle_seconds)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
