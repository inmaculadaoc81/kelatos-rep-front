"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useConfirm } from "@/components/confirm-provider";
import { Eye, Lock, TickCircle } from "@/lib/icons";
import { EstadoDispositivoPill } from "../../../pills";
import { type RemoteWorkerListItem, mapearRemoteWorkerListItem } from "@/lib/remote-workers";

function hace(fecha: string | null): string {
  if (!fecha) return "Nunca";
  const ms = Date.now() - new Date(fecha).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "Ahora mismo";
  if (min < 60) return `Hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `Hace ${horas} h`;
  return `Hace ${Math.floor(horas / 24)} d`;
}

/** Gestión de agentes (Fase 2): qué versión del agente y sistema
    operativo reporta cada dispositivo. Mismos datos que "Dispositivos"
    (misma llamada a /v1/asistencia/admin/remote-workers), otra columna
    y otro foco — aquí es sobre el AGENTE instalado, no sobre a quién
    está asignado. "Revocar" reutiliza el mismo activar/desactivar que ya
    existe; no hay "Regenerar token" ni "Actualizar versión" todavía —
    el sistema usa un token compartido (no uno por dispositivo) y no hay
    mecanismo de actualización remota del agente. */
export default function AgentesRemotosPage() {
  const router = useRouter();
  const confirmar = useConfirm();
  const [dispositivos, setDispositivos] = useState<RemoteWorkerListItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cambiandoEstado, setCambiandoEstado] = useState<number | null>(null);

  async function cargar() {
    try {
      const res = await fetch("/api/asistencia/admin/remote-workers");
      const data = await res.json();
      if (data.ok) setDispositivos((data.dispositivos as Record<string, unknown>[]).map(mapearRemoteWorkerListItem));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 30000);
    return () => clearInterval(t);
  }, []);

  async function revocar(d: RemoteWorkerListItem) {
    const desactivando = d.status === "activo";
    const ok = await confirmar(
      desactivando ? `¿Revocar el agente de "${d.hostname}"? Dejará de contarse como conectado.` : `¿Reactivar el agente de "${d.hostname}"?`,
      { titulo: desactivando ? "Revocar agente" : "Reactivar agente" },
    );
    if (!ok) return;
    setCambiandoEstado(d.deviceId);
    try {
      const res = await fetch(`/api/asistencia/admin/remote-workers/${d.deviceId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: desactivando ? "deshabilitado" : "activo" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No se pudo cambiar el estado");
      toast.success(desactivando ? "Agente revocado" : "Agente reactivado");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCambiandoEstado(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Agentes</h1>
        <p className="text-xs text-muted-foreground">Versión del agente y sistema operativo reportados por cada dispositivo.</p>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Dispositivo</TableHead>
              <TableHead>Device UUID</TableHead>
              <TableHead>Versión agente</TableHead>
              <TableHead>Sistema operativo</TableHead>
              <TableHead>Última conexión</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 8 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            ))}
            {!cargando && dispositivos.length === 0 && (
              <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Todavía no ha sincronizado ningún dispositivo.</TableCell></TableRow>
            )}
            {!cargando && dispositivos.map((d) => (
              <TableRow key={d.deviceId}>
                <TableCell className="font-medium">
                  {d.empleadoNombre || <span className="text-muted-foreground">Sin asignar</span>}
                </TableCell>
                <TableCell className="text-sm">{d.hostname}</TableCell>
                <TableCell className="max-w-40 truncate text-xs text-muted-foreground" title={d.deviceUuid}>{d.deviceUuid}</TableCell>
                <TableCell className="text-sm">{d.agentVersion || "—"}</TableCell>
                <TableCell className="max-w-48 truncate text-sm" title={d.osVersion || ""}>{d.osVersion || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{hace(d.lastSeen)}</TableCell>
                <TableCell><EstadoDispositivoPill estado={d.estado} /></TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className={`gap-1.5 ${d.status === "activo" ? "text-destructive" : "text-emerald-700"}`}
                      disabled={cambiandoEstado === d.deviceId}
                      onClick={() => revocar(d)}
                    >
                      {d.status === "activo" ? <Lock className="size-3.5" /> : <TickCircle className="size-3.5" />}
                      {d.status === "activo" ? "Revocar" : "Reactivar"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => router.push(`/asistencia/admin/remote-workers/${d.deviceId}`)}>
                      <Eye className="size-3.5" /> Ver detalle
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
