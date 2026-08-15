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
  Receipt,
  CloseCircle,
  Wallet,
  Edit2,
  Shop,
  Video,
  Profile,
  Danger,
} from "@/lib/icons";
import type { Icon } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { ReparacionDetalle, Pedido } from "@/lib/reparacion-detalle";

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
  onEntregadoLocal: () => void;
  onFacturarMensajeria: () => void;
  onNoCubiertoPorGarantia: () => void;
  onClienteSeLlevaAnticipo: () => void;
  onClienteSeLoLlevo: () => void;
  onVerQr: () => void;
  onIniciarReparacion: () => void;
  onRegistrarPedido: () => void;
  onMarcarEnTransito: () => void;
  onMarcarPiezaRecibida: () => void;
  onEditarPedido: () => void;
  onMarcarEquipoRecibido: () => void;
  onEnviarPuntoLimpio: () => void;
  onFacturacion: () => void;
  onMarcarEnviadoRapido: () => void;
  onReportarProblemaPieza: () => void;
}

const ESTADOS_LISTO_ENTREGA = ["Reparado", "No tiene Reparación", "Presupuesto Rechazado"];
const ENTREGA_CERRADA = ["ENTREGADO", "ENVIO", "RECICLAJE"];

// FASE 4 "Pieza Pendiente" (renderizarAccion(), Index.html:12965-12971): una
// reparación puede acumular varios pedidos para la misma pieza (pedido
// original + reemplazo tras "Problema con Pieza", o "Pedir pieza adicional"
// mientras ya había uno "Recibido") — detalle.pedidos[0] cogía siempre el
// PRIMERO sin mirar su estado, así que un pedido antiguo ya Recibido/con
// Problema tapaba al nuevo pedido activo: ni la tarjeta ni los botones
// ("Marcar En Tránsito"/"Marcar como Recibida") volvían a aparecer (bug real
// reportado, resguardo 18500). El original filtra los inactivos primero.
const ESTADOS_PEDIDO_INACTIVOS = ["Cancelado", "Recibido", "Problema", "Pieza Rota", "Pieza Defectuosa"];

function pedidoActivoDePiezaPendiente(detalle: ReparacionDetalle): { estado: "Pedido" | "En Tránsito" | ""; pedido: Pedido | undefined } {
  const activos = detalle.pedidos.filter((p) => !ESTADOS_PEDIDO_INACTIVOS.includes(p.estado));
  const hayPedido = activos.some((p) => p.estado === "Pedido");
  const hayTransito = activos.some((p) => p.estado === "En Tránsito");
  const estado = hayPedido ? "Pedido" : hayTransito ? "En Tránsito" : "";
  return { estado, pedido: estado ? activos.find((p) => p.estado === estado) : undefined };
}

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
    // Reproduce la tarjeta "Listo para Digitalizar" (Index.html:12892-12913)
    // — distinta de "Registrar Pedido de Pieza": las cintas no piden
    // piezas, solo esperan turno de digitalización.
    if (detalle.datosCintas) {
      return {
        tono: "success",
        icono: Video,
        titulo: "Listo para Digitalizar",
        texto: "Presupuesto aceptado. Inicia la digitalización cuando el técnico esté disponible.",
      };
    }
    if (detalle.equipoEnLocal === "NO" && detalle.anticipoImporte > 0) {
      const importeFmt = detalle.anticipoImporte.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return {
        tono: "warning",
        icono: Wallet,
        titulo: "Anticipo Registrado — Equipo con el Cliente",
        texto: `El cliente se llevó el equipo con un anticipo de ${importeFmt} €. Cuando esté lista la reparación, el cliente traerá el equipo para la factura final del resto.`,
        nota: detalle.numeroFacturaAnticipo ? <>Factura {detalle.numeroFacturaAnticipo}</> : undefined,
      };
    }
    return {
      tono: "success",
      icono: Box,
      titulo: "Acción Requerida: Registrar Pedido de Pieza",
      texto:
        "El presupuesto fue aceptado y requiere pieza por pedido. Registre el pedido al proveedor para continuar.",
    };
  }

  if (estado === "Pieza Pendiente") {
    const { estado: estadoPedido, pedido } = pedidoActivoDePiezaPendiente(detalle);
    const enTransito = estadoPedido === "En Tránsito";
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
      </Button>,
      // Reproduce el tercer botón de la tarjeta FASE 1 "Garantía"
      // (solicitarPresupuestoDesdeGarantia) — el escape cuando resulta que
      // el equipo NO está cubierto.
      <Button key="no-cubierto" size="sm" variant="outline" className="gap-1.5 text-muted-foreground" onClick={callbacks.onNoCubiertoPorGarantia}>
        <CloseCircle className="size-3.5" /> No cubierto por garantía
      </Button>
    );
  }
  // Reproduce los dos botones de la tarjeta "Listo para Digitalizar"
  // (Index.html:12900-12906): iniciar digitalización o, si el cliente
  // prefiere, llevarse el equipo mientras espera turno.
  if (estado === "Presupuesto Aceptado" && detalle.datosCintas) {
    botones.push(
      <Button key="iniciar-digitalizacion" size="sm" className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={callbacks.onIniciarReparacion}>
        <Video className="size-3.5" /> Iniciar Digitalización
      </Button>,
      <Button key="se-lo-llevo" size="sm" variant="outline" className="gap-1.5" onClick={callbacks.onClienteSeLoLlevo}>
        <Profile className="size-3.5" /> Se llevó el equipo
      </Button>
    );
  }
  // No aplica a la rama de cintas (digitalización, sin piezas por pedido).
  if (estado === "Presupuesto Aceptado" && !detalle.datosCintas) {
    const anticipoRegistrado = detalle.equipoEnLocal === "NO" && detalle.anticipoImporte > 0;
    botones.push(
      <Button key="pedido-aceptado" size="sm" className="gap-1.5" onClick={callbacks.onRegistrarPedido}>
        <Box1 className="size-3.5" /> Registrar pedido de pieza
      </Button>
    );
    // Reproduce clienteSeYLlevaConFactura() — solo disponible mientras no
    // haya ya un anticipo registrado para esta reparación.
    if (!anticipoRegistrado) {
      botones.push(
        <Button key="anticipo" size="sm" variant="outline" className="gap-1.5" onClick={callbacks.onClienteSeLlevaAnticipo}>
          <Wallet className="size-3.5" /> Cliente se lleva el equipo
        </Button>
      );
    }
  }
  // Reproduce las dos variantes de la tarjeta FASE 4 "Pieza Pendiente"
  // (estadoPedido 'Pedido' vs 'En Tránsito' en renderizarAccion()) — mismos
  // tres botones en ambas, solo cambia el primero.
  if (estado === "Pieza Pendiente") {
    const { estado: estadoPedido } = pedidoActivoDePiezaPendiente(detalle);
    if (estadoPedido === "En Tránsito") {
      botones.push(
        <Button key="recibida" size="sm" className="gap-1.5 bg-amber-500 text-white hover:bg-amber-600" onClick={callbacks.onMarcarPiezaRecibida}>
          <TickCircle className="size-3.5" /> Marcar como Recibida
        </Button>,
        <Button key="editar-pedido" size="sm" variant="outline" className="gap-1.5" onClick={callbacks.onEditarPedido}>
          <Edit2 className="size-3.5" /> Editar Pedido
        </Button>,
        <Button key="ppto" size="sm" variant="outline" className="gap-1.5" onClick={callbacks.onGestionarPresupuestos}>
          <DocumentText className="size-3.5" /> Presupuesto
        </Button>
      );
    } else if (estadoPedido === "Pedido") {
      botones.push(
        <Button key="transito" size="sm" className="gap-1.5 bg-sky-600 text-white hover:bg-sky-700" onClick={callbacks.onMarcarEnTransito}>
          <Truck className="size-3.5" /> Marcar En Tránsito
        </Button>,
        <Button key="editar-pedido" size="sm" variant="outline" className="gap-1.5" onClick={callbacks.onEditarPedido}>
          <Edit2 className="size-3.5" /> Editar Pedido
        </Button>,
        <Button key="ppto" size="sm" variant="outline" className="gap-1.5" onClick={callbacks.onGestionarPresupuestos}>
          <DocumentText className="size-3.5" /> Presupuesto
        </Button>
      );
    }
  }
  // Reproduce las dos variantes de la tarjeta FASE 4 "Pieza Entregada":
  // si el cliente se había llevado el equipo, primero hay que recuperarlo;
  // si ya estaba en el local, se puede iniciar la reparación directamente.
  if (estado === "Pieza Entregada") {
    if (detalle.equipoEnLocal === "NO") {
      botones.push(
        <Button key="equipo-recibido" size="sm" className="gap-1.5 bg-amber-500 text-white hover:bg-amber-600" onClick={callbacks.onMarcarEquipoRecibido}>
          <Shop className="size-3.5" /> Marcar Equipo Recibido
        </Button>,
        <Button key="ppto" size="sm" variant="outline" className="gap-1.5" onClick={callbacks.onGestionarPresupuestos}>
          <DocumentText className="size-3.5" /> Presupuesto
        </Button>
      );
    } else {
      botones.push(
        <Button key="iniciar-reparacion" size="sm" className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={callbacks.onIniciarReparacion}>
          <Setting2 className="size-3.5" /> Iniciar Reparación
        </Button>,
        <Button key="ppto" size="sm" variant="outline" className="gap-1.5" onClick={callbacks.onGestionarPresupuestos}>
          <DocumentText className="size-3.5" /> Presupuesto
        </Button>
      );
    }
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
    // Reproduce tienePieza de renderizarAccion() (Index.html:13069-13070):
    // el presupuesto aceptado (o el primero, si ninguno lo está) llevaba
    // costoPiezas, o ya existe algún pedido registrado.
    const pptoAceptadoRep = detalle.presupuestos.find((p) => p.estado === "aceptado") || detalle.presupuestos[0];
    const tienePieza = (pptoAceptadoRep?.costoPiezas ?? 0) > 0 || detalle.pedidos.length > 0;
    if (tienePieza) {
      botones.push(
        <Button key="problema-pieza" size="sm" variant="outline" className="gap-1.5 text-amber-700 dark:text-amber-400" onClick={callbacks.onReportarProblemaPieza}>
          <Danger className="size-3.5" /> Problema con Pieza
        </Button>
      );
    }
  }
  // Facturación: solo reparaciones normales (no garantía) que quedaron
  // "Reparado" — igual que el original, el botón se muestra siempre en esa
  // rama (ya haya factura o no); el propio diálogo decide lectura/escritura.
  if (estado === "Reparado" && detalle.tipoIngreso !== "GARANTIA" && entregaAbierta) {
    botones.push(
      <Button key="facturacion" size="sm" className="gap-1.5" onClick={callbacks.onFacturacion}>
        <Receipt className="size-3.5" /> Facturación
      </Button>
    );
  }
  if (ESTADOS_LISTO_ENTREGA.includes(estado) && entregaAbierta) {
    // Reproduce la rama de renderizarAccion() (Index.html) exactamente:
    // - "Reparado" (no garantía) con devolución por mensajería: la factura
    //   ya se generó en el flujo normal de Facturación (incluye ahí la
    //   línea de mensajería), así que solo hace falta el atajo de un clic
    //   "Marcar como enviado" (marcarEnviadoRapido, sin factura nueva).
    // - Cualquier caso SIN mensajería: "Entregado en Local" (confirmación
    //   rápida si "Reparado" ya facturado, formulario completo en el resto)
    //   + "QR Recogida", salvo garantía recibida por mensajería que se
    //   recoge en local (_garantiaConRecojo), donde se cobra el trayecto y
    //   no se ofrece QR.
    // - "Facturar y Enviar por Mensajería" solo en "No tiene Reparación" /
    //   "Presupuesto Rechazado" / "Reparado"+Garantía — nunca en un
    //   "Reparado" normal, porque ahí la mensajería no tiene factura propia
    //   por separado.
    const garantiaConRecojo = estado === "Reparado" && detalle.tipoIngreso === "GARANTIA" && detalle.tipoRecepcion === "ENVIO";
    const mensajeriaPendiente = detalle.entregaMensajeria === "SI";

    if (estado === "Reparado" && detalle.tipoIngreso !== "GARANTIA" && mensajeriaPendiente) {
      botones.push(
        <Button key="marcar-enviado" size="sm" className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={callbacks.onMarcarEnviadoRapido}>
          <TickCircle className="size-3.5" /> Marcar como enviado
        </Button>
      );
    }

    if (!mensajeriaPendiente) {
      botones.push(
        <Button
          key="entrega"
          size="sm"
          className="gap-1.5"
          onClick={estado === "Reparado" && !garantiaConRecojo ? callbacks.onEntregadoLocal : callbacks.onMarcarEntregado}
        >
          <BoxTick className="size-3.5" /> Entregado en Local
        </Button>
      );
      if (!garantiaConRecojo) {
        botones.push(
          <Button key="qr" size="sm" variant="outline" className="gap-1.5" onClick={callbacks.onVerQr}>
            <ScanBarcode className="size-3.5" /> Ver QR de recogida
          </Button>
        );
      }
    }

    if (
      (estado === "No tiene Reparación" || estado === "Presupuesto Rechazado" || (estado === "Reparado" && detalle.tipoIngreso === "GARANTIA")) &&
      mensajeriaPendiente &&
      !detalle.numeroFacturaMensajeria
    ) {
      botones.push(
        <Button key="facturar-mensajeria" size="sm" variant="outline" className="gap-1.5" onClick={callbacks.onFacturarMensajeria}>
          <Truck className="size-3.5" /> Facturar y Enviar por Mensajería
        </Button>
      );
    }
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
