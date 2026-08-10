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
  Chart,
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
    <div className="mb-8">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Chart className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Resumen general del sistema</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar métricas: {error}
        </div>
      )}

      {!metricas && !error && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}

      {metricas && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard titulo="Ppto. Pendiente" valor={metricas.presupuestoPendiente} unidad="equipos" icon={DocumentText} tono="sky" />
            <MetricCard titulo="Pieza Pendiente" valor={metricas.esperandoPieza} unidad="equipos" icon={Box} tono="amber" />
            <MetricCard titulo="En Reparación" valor={metricas.enReparacion} unidad="equipos" icon={Setting2} tono="slate" />
            <MetricCard titulo="Listos p/ Recoger" valor={metricas.listos} unidad="equipos" icon={TickCircle} tono="green" />
            <MetricCard titulo="Ppto. Enviado" valor={metricas.pptoEnviado} unidad="equipos" icon={Send2} tono="indigo" />
            <MetricCard titulo="Ppto. Aceptado" valor={metricas.pptosAceptados} unidad="equipos" icon={Verify} tono="emerald" />
            <MetricCard titulo="Pieza Entregada" valor={metricas.piezaEntregada} unidad="equipos" icon={Box1} tono="teal" />
            <MetricCard titulo="Garantía" valor={metricas.garantia} unidad="equipos" icon={ShieldTick} tono="violet" />
            <MetricCard titulo="Envío Mensajería" valor={metricas.mensajeriaActiva} unidad="equipos" icon={Truck} tono="blue" />
            <MetricCard titulo="Form. Pendiente" valor={metricas.formularioPendiente} unidad="formularios" icon={ClipboardText} tono="orange" />
            <MetricCard titulo="Cintas en Conversión" valor={metricas.cintasEnReparacion} unidad="pedidos" icon={Video} tono="rose" />
          </div>

          {(metricas.presupuestosRetrasados.length > 0 || metricas.equiposRetrasados.length > 0) && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <AlertCard
                titulo="Presupuesto Retrasado (+24h)"
                contador={metricas.presupuestosRetrasados.length}
                items={metricas.presupuestosRetrasados
                  .sort((a, b) => b.horasRetraso - a.horasRetraso)
                  .map((p) => ({ resguardo: p.resguardo, cliente: p.cliente, sub: `${p.diasRetraso}d` }))}
              />
              <AlertCard
                titulo="Entrega Retrasada"
                contador={metricas.equiposRetrasados.length}
                items={metricas.equiposRetrasados.map((e) => ({ resguardo: e.resguardo, cliente: e.cliente, sub: `+${e.diasExcedidos}d` }))}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
