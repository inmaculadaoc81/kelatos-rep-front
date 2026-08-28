"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FirmaPad } from "./firma-pad";

interface MiInfo {
  nombre: string;
  hora_entrada: string;
  hora_salida: string;
}

interface Fichaje {
  id: number;
  check_in: string;
  check_out: string;
  tipo_fichaje: string;
  firmado: boolean;
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
  }, []);

  const abierto = fichajes.find((f) => !f.check_out);

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
    <div className="mx-auto max-w-lg space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {cargando ? "Cargando…" : info ? `Hola, ${info.nombre}` : "Fichaje"}
          </CardTitle>
          {info?.hora_entrada && (
            <p className="text-xs text-muted-foreground">Horario de hoy: {info.hora_entrada} – {info.hora_salida}</p>
          )}
        </CardHeader>
        <CardContent>
          {mostrandoFirma ? (
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
          {!cargando && fichajes.length === 0 && <p className="text-sm text-muted-foreground">Sin fichajes en los últimos 7 días.</p>}
          {fichajes.map((f) => (
            <div key={f.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0 last:pb-0">
              <span className="text-muted-foreground">{fechaCorta(f.check_in)}</span>
              <span>{horaCorta(f.check_in)} – {f.check_out ? horaCorta(f.check_out) : "…"}</span>
              <span className="text-xs font-medium">{ETIQUETA_TIPO[f.tipo_fichaje] || f.tipo_fichaje}</span>
              {f.firmado && <span title="Firmado">✍️</span>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
