"use client";

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
  CloseCircle,
} from "@/lib/icons";
import { MetricCard, AlertCard } from "../metric-card";
import { MetricasDashboard, CardFiltroId } from "@/lib/metricas";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Tarjetas de métricas + alertas de retraso. En el sistema original
 * (Index.html, vistaActivas) esto vive arriba de la propia tabla de
 * reparaciones activas, no en una pestaña aparte — de ahí que aquí sea
 * un bloque más dentro de esta página y no su propia ruta.
 *
 * Todas las cards son clicables y filtran la tabla de abajo, igual que
 * filtrarPorCard() en el original (title="Click para filtrar" en cada
 * .card). Los datos ya se cargan en el padre (page.tsx), que también
 * necesita presupuestosRetrasados/equiposRetrasados para poder filtrar
 * la tabla por esas dos cards sin reimplementar el cálculo de días.
 */
export function DashboardMetricas({
  metricas,
  error,
  cardFiltro,
  onFiltrar,
}: {
  metricas: MetricasDashboard | null;
  error: string | null;
  cardFiltro: CardFiltroId | null;
  onFiltrar: (id: CardFiltroId) => void;
}) {
  // Fracción sobre el total de reparaciones activas, para la barra de cada
  // tarjeta — solo tiene sentido para las métricas en "equipos"; las de
  // formularios/pedidos se quedan sin barra (ver MetricCard).
  const total = metricas?.totalReparaciones || 0;
  const prop = (n: number) => (total > 0 ? n / total : undefined);

  return (
    <div className="mb-8">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
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
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      )}

      {metricas && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard titulo="Ppto. Pendiente" valor={metricas.presupuestoPendiente} unidad="equipos" icon={DocumentText} tono="sky" proporcion={prop(metricas.presupuestoPendiente)} onClick={() => onFiltrar("pptoPendiente")} activo={cardFiltro === "pptoPendiente"} />
            <MetricCard titulo="Pieza Pendiente" valor={metricas.esperandoPieza} unidad="equipos" icon={Box} tono="amber" proporcion={prop(metricas.esperandoPieza)} onClick={() => onFiltrar("piezaPendiente")} activo={cardFiltro === "piezaPendiente"} />
            <MetricCard titulo="En Reparación" valor={metricas.enReparacion} unidad="equipos" icon={Setting2} tono="slate" proporcion={prop(metricas.enReparacion)} onClick={() => onFiltrar("enReparacion")} activo={cardFiltro === "enReparacion"} />
            <MetricCard titulo="Listos p/ Recoger" valor={metricas.listos} unidad="equipos" icon={TickCircle} tono="green" proporcion={prop(metricas.listos)} onClick={() => onFiltrar("listos")} activo={cardFiltro === "listos"} />
            <MetricCard titulo="No tiene Reparación" valor={metricas.sinReparacion} unidad="equipos" icon={CloseCircle} tono="red" proporcion={prop(metricas.sinReparacion)} onClick={() => onFiltrar("sinReparacion")} activo={cardFiltro === "sinReparacion"} />
            <MetricCard titulo="Ppto. Enviado" valor={metricas.pptoEnviado} unidad="equipos" icon={Send2} tono="indigo" proporcion={prop(metricas.pptoEnviado)} onClick={() => onFiltrar("pptoEnviado")} activo={cardFiltro === "pptoEnviado"} />
            <MetricCard titulo="Ppto. Aceptado" valor={metricas.pptosAceptados} unidad="equipos" icon={Verify} tono="emerald" proporcion={prop(metricas.pptosAceptados)} onClick={() => onFiltrar("pptoAceptado")} activo={cardFiltro === "pptoAceptado"} />
            <MetricCard titulo="Pieza Entregada" valor={metricas.piezaEntregada} unidad="equipos" icon={Box1} tono="teal" proporcion={prop(metricas.piezaEntregada)} onClick={() => onFiltrar("piezaEntregada")} activo={cardFiltro === "piezaEntregada"} />
            <MetricCard titulo="Garantía" valor={metricas.garantia} unidad="equipos" icon={ShieldTick} tono="violet" proporcion={prop(metricas.garantia)} onClick={() => onFiltrar("garantia")} activo={cardFiltro === "garantia"} />
            <MetricCard titulo="Envío Mensajería" valor={metricas.mensajeriaActiva} unidad="equipos" icon={Truck} tono="blue" proporcion={prop(metricas.mensajeriaActiva)} onClick={() => onFiltrar("mensajeriaActiva")} activo={cardFiltro === "mensajeriaActiva"} />
            <MetricCard titulo="Form. Pendiente" valor={metricas.formularioPendiente} unidad="formularios" icon={ClipboardText} tono="orange" onClick={() => onFiltrar("formularioPendiente")} activo={cardFiltro === "formularioPendiente"} />
            <MetricCard titulo="Cintas en Conversión" valor={metricas.cintasEnReparacion} unidad="pedidos" icon={Video} tono="rose" onClick={() => onFiltrar("cintasEnReparacion")} activo={cardFiltro === "cintasEnReparacion"} />
          </div>

          {(metricas.presupuestosRetrasados.length > 0 || metricas.equiposRetrasados.length > 0) && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <AlertCard
                titulo="Presupuesto Retrasado (+24h)"
                contador={metricas.presupuestosRetrasados.length}
                items={metricas.presupuestosRetrasados
                  .sort((a, b) => b.horasRetraso - a.horasRetraso)
                  .map((p) => ({ resguardo: p.resguardo, cliente: p.cliente, sub: `${p.diasRetraso}d` }))}
                onClick={() => onFiltrar("pptoRetrasado")}
                activo={cardFiltro === "pptoRetrasado"}
              />
              <AlertCard
                titulo="Entrega Retrasada"
                contador={metricas.equiposRetrasados.length}
                items={metricas.equiposRetrasados.map((e) => ({ resguardo: e.resguardo, cliente: e.cliente, sub: `+${e.diasExcedidos}d` }))}
                onClick={() => onFiltrar("entregaRetrasada")}
                activo={cardFiltro === "entregaRetrasada"}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
