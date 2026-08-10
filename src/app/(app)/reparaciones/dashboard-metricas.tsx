"use client";

import { useEffect, useState } from "react";
import {
  DocumentText,
  Box1,
  Setting2,
  TickCircle,
  Send2,
  Box,
  ShieldTick,
  Truck,
  ClipboardText,
  Video,
  Verify,
} from "@/lib/icons";
import { MetricCard, AlertCard } from "../metric-card";
import { MetricasDashboard } from "@/lib/metricas";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Tarjetas de métricas + alertas de retraso. En el sistema original
 * (Index.html, vistaActivas) esto vive arriba de la propia tabla de
 * reparaciones activas, no en una pestaña aparte — de ahí que aquí sea
 * un bloque más dentro de esta página y no su propia ruta.
 */
export function DashboardMetricas() {
  const [metricas, setMetricas] = useState<MetricasDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/metricas")
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) throw new Error(data.error);
        setMetricas(data.metricas);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error desconocido"));
  }, []);

  return (
    <div className="mb-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen general del sistema</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar métricas: {error}
        </div>
      )}

      {!metricas && !error && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}

      {metricas && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard titulo="Ppto. Pendiente" valor={metricas.presupuestoPendiente} unidad="equipos" icon={DocumentText} color="bg-blue-500/10 text-blue-600" />
            <MetricCard titulo="Pieza Pendiente" valor={metricas.esperandoPieza} unidad="equipos" icon={Box} color="bg-amber-500/10 text-amber-600" />
            <MetricCard titulo="En Reparación" valor={metricas.enReparacion} unidad="equipos" icon={Setting2} color="bg-slate-500/10 text-slate-600" />
            <MetricCard titulo="Listos p/ Recoger" valor={metricas.listos} unidad="equipos" icon={TickCircle} color="bg-green-500/10 text-green-600" />
            <MetricCard titulo="Ppto. Enviado" valor={metricas.pptoEnviado} unidad="equipos" icon={Send2} color="bg-secondary text-secondary-foreground" />
            <MetricCard titulo="Ppto. Aceptado" valor={metricas.pptosAceptados} unidad="equipos" icon={Verify} color="bg-emerald-500/10 text-emerald-600" />
            <MetricCard titulo="Pieza Entregada" valor={metricas.piezaEntregada} unidad="equipos" icon={Box1} color="bg-teal-500/10 text-teal-600" />
            <MetricCard titulo="Garantía" valor={metricas.garantia} unidad="equipos" icon={ShieldTick} color="bg-violet-500/10 text-violet-600" />
            <MetricCard titulo="Envío Mensajería" valor={metricas.mensajeriaActiva} unidad="equipos" icon={Truck} color="bg-sky-500/10 text-sky-600" />
            <MetricCard titulo="Form. Pendiente" valor={metricas.formularioPendiente} unidad="formularios" icon={ClipboardText} color="bg-orange-500/10 text-orange-600" />
            <MetricCard titulo="Cintas en Conversión" valor={metricas.cintasEnReparacion} unidad="pedidos" icon={Video} color="bg-amber-600/10 text-amber-700" />
          </div>

          {(metricas.presupuestosRetrasados.length > 0 || metricas.equiposRetrasados.length > 0) && (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <AlertCard
                titulo="Presupuesto Retrasado (+24h)"
                contador={metricas.presupuestosRetrasados.length}
                items={metricas.presupuestosRetrasados
                  .sort((a, b) => b.horasRetraso - a.horasRetraso)
                  .map((p) => ({ label: `${p.resguardo} ${p.cliente}`, sub: `${p.diasRetraso}d` }))}
              />
              <AlertCard
                titulo="Entrega Retrasada"
                contador={metricas.equiposRetrasados.length}
                items={metricas.equiposRetrasados.map((e) => ({ label: `${e.resguardo} ${e.cliente}`, sub: `+${e.diasExcedidos}d` }))}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
