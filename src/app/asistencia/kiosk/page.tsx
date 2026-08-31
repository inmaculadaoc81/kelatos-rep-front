"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock } from "@/lib/icons";
import { colorAvatar, iniciales } from "@/lib/registro-acciones-estilo";
import { TipoFichajePill } from "../pills";
import { FirmaPad } from "./firma-pad";

interface MiInfo {
  nombre: string;
  horario_nombre: string;
  hora_entrada: string;
  hora_salida: string;
}

function fechaHoyLarga(): string {
  const s = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface Fichaje {
  id: number;
  check_in: string;
  check_out: string;
  tipo_fichaje: string;
  firmado: boolean;
}

interface EstadoAusencia {
  tiene_regreso_pendiente: boolean;
  fichaje_id: number | null;
  hora_regreso: string | null;
  puede_confirmar: boolean;
}

const POLL_AUSENCIA_MS = 20000;

// El registro regreso_ausencia NO se cierra al confirmar (queda abierto
// "como nueva entrada", regla explícita) — así que el backend seguiría
// diciendo "pendiente" para siempre tras confirmar. Se recuerda en el
// propio navegador, por id de fichaje, para no volver a bloquear la
// pantalla por el mismo regreso ya confirmado (sobrevive a un refresh).
function regresoYaConfirmado(fichajeId: number): boolean {
  try {
    return localStorage.getItem(`asistencia_regreso_confirmado_${fichajeId}`) === "1";
  } catch {
    return false;
  }
}
function marcarRegresoConfirmado(fichajeId: number) {
  try {
    localStorage.setItem(`asistencia_regreso_confirmado_${fichajeId}`, "1");
  } catch {
    // localStorage puede fallar en modo privado — sin bloqueo persistente no pasa nada grave
  }
}

const ETIQUETA_TIPO: Record<string, string> = {
  entrada: "Entrada",
  salida_comida: "Salida comida",
  vuelta_comida: "Vuelta comida",
  salida: "Salida",
  ausencia: "Ausencia",
  regreso_ausencia: "Regreso ausencia",
};

function horaCorta(iso: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}
function fechaCorta(iso: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
}

export default function KioskPage() {
  const [info, setInfo] = useState<MiInfo | null>(null);
  const [fichajes, setFichajes] = useState<Fichaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fichando, setFichando] = useState(false);
  const [mostrandoFirma, setMostrandoFirma] = useState(false);
  const [estadoAusencia, setEstadoAusencia] = useState<EstadoAusencia | null>(null);

  async function cargarEstadoAusencia() {
    try {
      const r = await fetch("/api/asistencia/kiosk/estado-ausencia-hoy").then((r) => r.json());
      if (r.ok) {
        if (r.tiene_regreso_pendiente && r.fichaje_id && regresoYaConfirmado(r.fichaje_id)) {
          setEstadoAusencia({ ...r, tiene_regreso_pendiente: false });
        } else {
          setEstadoAusencia(r);
        }
      }
    } catch {
      // best-effort — si falla el poll, se reintenta en 20s
    }
  }

  async function cargar() {
    setCargando(true);
    try {
      const [rInfo, rFichajes] = await Promise.all([
        fetch("/api/asistencia/kiosk/mi-info").then((r) => r.json()),
        fetch("/api/asistencia/kiosk/mis-fichajes").then((r) => r.json()),
      ]);
      if (rInfo.ok) setInfo(rInfo);
      if (rFichajes.ok) setFichajes(rFichajes.items);
    } catch {
      toast.error("No se pudo cargar tu información");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    cargarEstadoAusencia();
    // Regla del sistema: mientras haya una ausencia con regreso pendiente,
    // los botones normales se bloquean — se comprueba cada 20s para que
    // la hora de vuelta se desbloquee sola sin que el empleado tenga que
    // recargar la página.
    const intervalo = setInterval(cargarEstadoAusencia, POLL_AUSENCIA_MS);
    return () => clearInterval(intervalo);
  }, []);

  const abierto = fichajes.find((f) => !f.check_out);

  async function confirmarRegreso() {
    setFichando(true);
    try {
      const res = await fetch("/api/asistencia/kiosk/fichar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "regreso_ausencia" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      if (estadoAusencia?.fichaje_id) marcarRegresoConfirmado(estadoAusencia.fichaje_id);
      toast.success("Regreso confirmado");
      await Promise.all([cargar(), cargarEstadoAusencia()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setFichando(false);
    }
  }

  async function fichar(tipo: string) {
    setFichando(true);
    try {
      const res = await fetch("/api/asistencia/kiosk/fichar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`${ETIQUETA_TIPO[tipo] || tipo} registrada`);
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setFichando(false);
    }
  }

  async function confirmarSalida(firmaDataUrl: string) {
    setFichando(true);
    try {
      const res = await fetch("/api/asistencia/kiosk/fichar-con-firma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "salida", firma: firmaDataUrl }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Salida registrada");
      setMostrandoFirma(false);
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setFichando(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarFallback className={info ? colorAvatar(info.nombre) : undefined}>
                {info ? iniciales(info.nombre) : "…"}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">
                {cargando ? "Cargando…" : info ? `Hola, ${info.nombre}` : "Fichaje"}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{fechaHoyLarga()}</p>
            </div>
          </div>
          {info?.hora_entrada && (
            <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <Clock className="size-3.5" />
              {info.hora_entrada} – {info.hora_salida}
              {info.horario_nombre && ` (${info.horario_nombre})`}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {estadoAusencia?.tiene_regreso_pendiente ? (
            <div className="space-y-3 text-center">
              <div className="rounded-lg bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900">Estás en ausencia</p>
                <p className="text-xs text-amber-700">
                  {estadoAusencia.puede_confirmar
                    ? "Ya puedes fichar tu regreso"
                    : `Podrás fichar tu regreso a las ${estadoAusencia.hora_regreso}`}
                </p>
              </div>
              <Button
                className="h-20 w-full flex-col gap-1 bg-sky-600 text-white hover:bg-sky-700"
                disabled={fichando || !estadoAusencia.puede_confirmar}
                onClick={confirmarRegreso}
              >
                <span className="text-lg">🔓</span> Regreso ausencia
              </Button>
            </div>
          ) : mostrandoFirma ? (
            <FirmaPad onCancelar={() => setMostrandoFirma(false)} onConfirmar={confirmarSalida} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button
                className="h-20 flex-col gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={fichando || !!abierto}
                onClick={() => fichar("entrada")}
              >
                <span className="text-lg">☀️</span> Entrada
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-1"
                disabled={fichando || !abierto}
                onClick={() => fichar("salida_comida")}
              >
                <span className="text-lg">🍴</span> Salida comida
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-1"
                disabled={fichando || !!abierto}
                onClick={() => fichar("vuelta_comida")}
              >
                <span className="text-lg">↩️</span> Vuelta comida
              </Button>
              <Button
                className="h-20 flex-col gap-1 bg-slate-800 text-white hover:bg-slate-900"
                disabled={fichando || !abierto}
                onClick={() => setMostrandoFirma(true)}
              >
                <span className="text-lg">🌙</span> Salida
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Mis últimos fichajes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!cargando && fichajes.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Sin fichajes en los últimos 7 días.</p>}
          {fichajes.map((f) => (
            <div key={f.id} className="rounded-lg border p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2">
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">{fechaCorta(f.check_in)}</span>
                  <TipoFichajePill tipo={f.tipo_fichaje} />
                </span>
                {f.firmado && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    ✍️ Firmado
                  </span>
                )}
              </div>
              <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" /> {horaCorta(f.check_in)} – {f.check_out ? horaCorta(f.check_out) : "En curso"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
