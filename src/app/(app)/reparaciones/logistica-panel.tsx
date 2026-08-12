"use client";

import { useState } from "react";
import { Truck, Shop, Home } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ReparacionDetalle } from "@/lib/reparacion-detalle";

// Mismos estados que actualizarSeccionEquipoEnLocal() en Index.html — el
// toggle "equipo en local" solo tiene sentido mientras se espera una pieza.
const ESTADOS_CON_TOGGLE_EQUIPO = ["Pieza Pendiente", "En Tránsito", "Pieza Entregada"];

export function LogisticaPanel({
  detalle,
  onActualizado,
  onClienteSeLleva,
  onClienteLoTrajo,
}: {
  detalle: ReparacionDetalle;
  onActualizado: () => void;
  /** Reproduce toggleEquipoEnLocal(): "Cliente se lleva" NO cambia el
   * estado directamente — abre la factura de anticipo (50%) antes, y es
   * esa confirmación la que deja el equipo en 'NO'. */
  onClienteSeLleva: () => void;
  /** Dirección inversa: confirmación simple + toggle directo (marcarEquipoRecibido). */
  onClienteLoTrajo: () => void;
}) {
  const [direccion, setDireccion] = useState(detalle.cliente.direccion || "");
  const [enviando, setEnviando] = useState(false);
  const mensajeriaActiva = detalle.entregaMensajeria === "SI";
  const equipoEnLocal = detalle.equipoEnLocal !== "NO";
  const mostrarToggleEquipo = ESTADOS_CON_TOGGLE_EQUIPO.includes(detalle.estado);

  async function ejecutar(accion: string, datos: Record<string, unknown>) {
    setEnviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${detalle.resguardo}/logistica`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, datos }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Actualizado");
      onActualizado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Tira a lo ancho con el texto a la izquierda y el botón al final,
          como la sección de mensajería del sistema original. */}
      <div
        className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${
          mensajeriaActiva ? "border-amber-500/40 bg-amber-500/10" : "bg-muted/40"
        }`}
      >
        <Truck className="size-5 shrink-0 text-muted-foreground" variant="Bold" />
        <div className="min-w-40 flex-1">
          <p className="text-sm font-medium">Entrega por mensajería</p>
          <p className="text-xs text-muted-foreground">
            {mensajeriaActiva
              ? detalle.cliente.direccion || "Sin dirección especificada"
              : "Actívala si el cliente solicita envío a domicilio"}
          </p>
        </div>
        {mensajeriaActiva ? (
          <Button
            size="sm"
            variant="outline"
            disabled={enviando}
            onClick={() => ejecutar("entrega_mensajeria", { activar: "NO", direccion: "" })}
          >
            Desactivar
          </Button>
        ) : (
          <>
            <Input
              placeholder="Dirección de envío"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="h-8 w-full text-xs sm:w-64"
            />
            <Button
              size="sm"
              className="bg-amber-500 text-white hover:bg-amber-600"
              disabled={enviando}
              onClick={() => ejecutar("entrega_mensajeria", { activar: "SI", direccion })}
            >
              Activar
            </Button>
          </>
        )}
      </div>

      {mostrarToggleEquipo && (
        <div
          className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${
            equipoEnLocal ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10"
          }`}
        >
          {equipoEnLocal ? (
            <Shop className="size-5 shrink-0 text-muted-foreground" variant="Bold" />
          ) : (
            <Home className="size-5 shrink-0 text-muted-foreground" variant="Bold" />
          )}
          <div className="min-w-40 flex-1">
            <p className="text-sm font-medium">
              {equipoEnLocal ? "Equipo en local" : "Cliente se llevó el equipo"}
            </p>
            <p className="text-xs text-muted-foreground">
              {equipoEnLocal ? "Disponible en el local para reparación" : "Debe traerlo de nuevo para continuar"}
            </p>
          </div>
          <Button
            size="sm"
            variant={equipoEnLocal ? "outline" : "default"}
            disabled={enviando}
            onClick={equipoEnLocal ? onClienteSeLleva : onClienteLoTrajo}
          >
            {equipoEnLocal ? "Cliente se lleva" : "Cliente lo trajo"}
          </Button>
        </div>
      )}
    </div>
  );
}
