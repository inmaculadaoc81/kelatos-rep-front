"use client";

import type { ReactNode } from "react";
import {
  ShieldTick,
  DocumentText,
  Timer1,
  Box,
  Box1,
  Truck,
  TickCircle,
  Setting2,
  BoxTick,
  ScanBarcode,
  Clock,
  InfoCircle,
  Trash,
} from "@/lib/icons";
import type { Icon } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { ReparacionDetalle } from "@/lib/reparacion-detalle";

type Tono = "danger" | "warning" | "info" | "success" | "neutral";

// Cada tono lleva borde + fondo tenue + color de título, como las cards
// `border-X bg-X bg-opacity-10 text-X` de renderizarAccion() en Index.html.
const ESTILO_TONO: Record<Tono, { caja: string; titulo: string }> = {
  danger: { caja: "border-destructive/40 bg-destructive/5", titulo: "text-destructive" },
  warning: { caja: "border-amber-500/40 bg-amber-500/5", titulo: "text-amber-700 dark:text-amber-400" },
  info: { caja: "border-sky-500/40 bg-sky-500/5", titulo: "text-sky-700 dark:text-sky-400" },
  success: { caja: "border-emerald-500/40 bg-emerald-500/5", titulo: "text-emerald-700 dark:text-emerald-400" },
  neutral: { caja: "border-border bg-muted/40", titulo: "text-foreground" },
};

interface Accion {
  tono: Tono;
  icono: Icon;
  titulo: string;
  texto: string;
  /** Línea secundaria: plazo, aviso de mensajería, motivo… */
  nota?: ReactNode;
}

export interface CallbacksAccion {
  onGestionarPresupuestos: () => void;
  onFinalizar: () => void;
  onMarcarEntregado: () => void;
  onVerQr: () => void;
  onIniciarReparacion: () => void;
  onRegistrarPedido: () => void;
  onEnviarPuntoLimpio: () => void;
}

const ESTADOS_LISTO_ENTREGA = ["Reparado", "No tiene Reparación", "Presupuesto Rechazado"];
const ENTREGA_CERRADA = ["ENTREGADO", "ENVIO", "RECICLAJE"];

function describir(detalle: ReparacionDetalle): Accion | null {
  const estado = detalle.estado;

  if (ENTREGA_CERRADA.includes(detalle.estadoEntrega)) {
    return {
      tono: "neutral",
      icono: TickCircle,
      titulo: "Reparación cerrada",
      texto: "El equipo ya salió del taller. No quedan acciones pendientes.",
    };
  }

  if (estado === "Garantía") {
    return {
      tono: "info",
      icono: ShieldTick,
      titulo: "Equipo en Garantía",
      texto:
        "Equipo cubierto por garantía. Puede iniciarse la reparación directamente, o elaborar un presupuesto si resulta que no está cubierto.",
    };
  }

  if (estado === "Formulario Pendiente") {
    return {
      tono: "warning",
      icono: Clock,
      titulo: "Esperando confirmación del cliente",
      texto: "El formulario de recepción se envió al cliente y todavía no lo ha confirmado.",
    };
  }

  if (estado === "Presupuesto Pendiente") {
    return {
      tono: "danger",
      icono: DocumentText,
      titulo: "Acción Requerida: Elaborar Presupuesto(s)",
      texto: "El equipo ha sido recibido. Elabore uno o más presupuestos para enviar al cliente.",
      nota: (
        <>
          <strong>Límite:</strong> 24 horas desde la recepción
        </>
      ),
    };
  }

  if (estado === "Presupuesto Enviado") {
    return {
      tono: "info",
      icono: Timer1,
      titulo: "Esperando Respuesta del Cliente",
      texto: "Presupuesto(s) enviado(s). Esperando aceptación o rechazo del cliente.",
    };
  }

  if (estado === "Presupuesto Aceptado") {
    return {
      tono: "success",
      icono: Box,
      titulo: "Acción Requerida: Registrar Pedido de Pieza",
      texto:
        "El presupuesto fue aceptado y requiere pieza por pedido. Registre el pedido al proveedor para continuar.",
    };
  }

  if (estado === "Pieza Pendiente") {
    const pedido = detalle.pedidos[0];
    const enTransito = pedido?.estado === "En Tránsito";
    return {
      tono: enTransito ? "warning" : "info",
      icono: Truck,
      titulo: enTransito ? "Pieza En Tránsito" : "Pedido Realizado",
      texto: enTransito
        ? "La pieza ha sido enviada. Esperando recepción."
        : "La pieza ha sido pedida. Esperando envío del proveedor.",
      nota: pedido?.fechaEstimada ? <>Fecha estimada: {pedido.fechaEstimada.slice(0, 10)}</> : undefined,
    };
  }

  if (estado === "Pieza Entregada") {
    const equipoFuera = detalle.equipoEnLocal === "NO";
    return {
      tono: equipoFuera ? "warning" : "success",
      icono: equipoFuera ? Box : TickCircle,
      titulo: equipoFuera
        ? "Pieza Recibida — Esperando Equipo del Cliente"
        : "Pieza Recibida — Listo para Reparar",
      texto: equipoFuera
        ? "La pieza ha llegado pero el cliente se llevó el equipo. Contactar al cliente para que lo traiga al local."
        : "La pieza ha sido recibida. Asigne un técnico e inicie la reparación.",
    };
  }

  if (estado === "En Reparación") {
    return {
      tono: "info",
      icono: Setting2,
      titulo: "Reparación en Curso",
      texto: "El técnico está trabajando en la reparación del equipo.",
      nota: detalle.tecnicoAsignado ? <>Técnico: {detalle.tecnicoAsignado}</> : undefined,
    };
  }

  if (ESTADOS_LISTO_ENTREGA.includes(estado)) {
    const mensaje =
      estado === "Reparado"
        ? "reparado"
        : estado === "Presupuesto Rechazado"
          ? "sin reparar (presupuesto rechazado)"
          : "sin reparación posible";
    return {
      tono: "success",
      icono: BoxTick,
      titulo: "Listo para Entrega",
      texto: `El equipo está ${mensaje}.`,
      nota:
        detalle.entregaMensajeria === "SI" ? (
          <strong className="text-amber-700 dark:text-amber-400">
            El cliente solicita envío por mensajería.
          </strong>
        ) : detalle.tipoRecepcion === "ENVIO" ? (
          <>Equipo recibido por mensajería — se puede devolver por mensajería.</>
        ) : (
          <>Esperando que el cliente recoja.</>
        ),
    };
  }

  if (estado === "Abandonado") {
    return {
      tono: "danger",
      icono: Clock,
      titulo: "Equipo Abandonado",
      texto: "El equipo lleva demasiado tiempo sin recoger. Puede revertirse desde los estados especiales.",
    };
  }

  return null;
}

export function AccionRequerida({
  detalle,
  callbacks,
}: {
  detalle: ReparacionDetalle;
  callbacks: CallbacksAccion;
}) {
  const accion = describir(detalle);
  if (!accion) return null;

  const estilo = ESTILO_TONO[accion.tono];
  const Icono = accion.icono;
  const estado = detalle.estado;
  const entregaAbierta = !ENTREGA_CERRADA.includes(detalle.estadoEntrega);

  const botones: ReactNode[] = [];
  // Mismos botones/colores que el original: "Gestionar Presupuestos" en
  // rojo (Presupuesto Pendiente/Garantía, abrirModalGestionPresupuestos con
  // acción requerida) y "Ver Presupuestos" en azul (Presupuesto Enviado,
  // solo consultando lo ya enviado). Ambos abren el mismo modal de gestión.
  if (estado === "Presupuesto Pendiente" || estado === "Garantía") {
    botones.push(
      <Button key="ppto" size="sm" variant="destructive" className="gap-1.5 bg-red-600 text-white hover:bg-red-700" onClick={callbacks.onGestionarPresupuestos}>
        <DocumentText className="size-3.5" /> Gestionar Presupuestos
      </Button>
    );
  }
  if (estado === "Presupuesto Enviado") {
    botones.push(
      <Button key="ppto" size="sm" className="gap-1.5 bg-sky-600 text-white hover:bg-sky-700" onClick={callbacks.onGestionarPresupuestos}>
        <DocumentText className="size-3.5" /> Ver Presupuestos
      </Button>
    );
  }
  if (estado === "Garantía") {
    botones.push(
      <Button key="iniciar" size="sm" variant="outline" className="gap-1.5" onClick={callbacks.onIniciarReparacion}>
        <Setting2 className="size-3.5" /> Iniciar reparación
      </Button>,
      <Button key="pedido-garantia" size="sm" variant="outline" className="gap-1.5" onClick={callbacks.onRegistrarPedido}>
        <Box1 className="size-3.5" /> Registrar pedido de pieza
      </Button>
    );
  }
  // No aplica a la rama de cintas (digitalización, sin piezas por pedido).
  if (estado === "Presupuesto Aceptado" && !detalle.datosCintas) {
    botones.push(
      <Button key="pedido-aceptado" size="sm" className="gap-1.5" onClick={callbacks.onRegistrarPedido}>
        <Box1 className="size-3.5" /> Registrar pedido de pieza
      </Button>
    );
  }
  if (estado === "En Reparación") {
    botones.push(
      <Button key="fin" size="sm" className="gap-1.5" onClick={callbacks.onFinalizar}>
        <Setting2 className="size-3.5" /> Finalizar reparación
      </Button>,
      <Button key="pedido-adicional" size="sm" variant="outline" className="gap-1.5" onClick={callbacks.onRegistrarPedido}>
        <Box1 className="size-3.5" /> Pedir pieza adicional
      </Button>
    );
  }
  if (ESTADOS_LISTO_ENTREGA.includes(estado) && entregaAbierta) {
    botones.push(
      <Button key="entrega" size="sm" className="gap-1.5" onClick={callbacks.onMarcarEntregado}>
        <BoxTick className="size-3.5" /> Marcar como entregado
      </Button>,
      <Button key="qr" size="sm" variant="outline" className="gap-1.5" onClick={callbacks.onVerQr}>
        <ScanBarcode className="size-3.5" /> Ver QR de recogida
      </Button>
    );
    // Solo "No tiene Reparación"/"Presupuesto Rechazado" — el original no la
    // ofrece cuando el equipo sí está "Reparado".
    if (estado !== "Reparado") {
      botones.push(
        <Button key="punto-limpio" size="sm" variant="outline" className="gap-1.5 text-muted-foreground" onClick={callbacks.onEnviarPuntoLimpio}>
          <Trash className="size-3.5" /> Enviar a punto limpio
        </Button>
      );
    }
  }

  return (
    <section className={`rounded-xl border p-4 ${estilo.caja}`}>
      <h3 className={`flex items-center gap-2 text-sm font-semibold ${estilo.titulo}`}>
        <Icono className="size-4.5 shrink-0" variant="Bold" />
        {accion.titulo}
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{accion.texto}</p>
      {accion.nota && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <InfoCircle className="size-3.5 shrink-0" />
          {accion.nota}
        </p>
      )}
      {botones.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{botones}</div>}
    </section>
  );
}
