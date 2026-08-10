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
}: {
  detalle: ReparacionDetalle;
  onActualizado: () => void;
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
    <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
      <div className={`space-y-2 rounded-md p-2.5 text-sm ${mensajeriaActiva ? "bg-amber-500/10" : "bg-muted/30"}`}>
        <p className="flex items-center gap-1.5 font-medium">
          <Truck className="size-4" /> Entrega por mensajería
        </p>
        {mensajeriaActiva ? (
          <>
            <p className="text-xs text-muted-foreground">{detalle.cliente.direccion || "Sin dirección especificada"}</p>
            <Button size="sm" variant="outline" disabled={enviando} onClick={() => ejecutar("entrega_mensajeria", { activar: "NO", direccion: "" })}>
              Desactivar
            </Button>
          </>
        ) : (
          <>
            <Input
              placeholder="Dirección de envío"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600"
              disabled={enviando}
              onClick={() => ejecutar("entrega_mensajeria", { activar: "SI", direccion })}
            >
              Activar
            </Button>
          </>
        )}
      </div>

      {mostrarToggleEquipo && (
        <div className={`space-y-2 rounded-md p-2.5 text-sm ${equipoEnLocal ? "bg-green-500/10" : "bg-amber-500/10"}`}>
          <p className="flex items-center gap-1.5 font-medium">
            {equipoEnLocal ? <Shop className="size-4" /> : <Home className="size-4" />}
            {equipoEnLocal ? "Equipo en local" : "Cliente se llevó el equipo"}
          </p>
          <p className="text-xs text-muted-foreground">
            {equipoEnLocal ? "Disponible en el local para reparación" : "Debe traerlo de nuevo para continuar"}
          </p>
          <Button
            size="sm"
            variant={equipoEnLocal ? "outline" : "default"}
            disabled={enviando}
            onClick={() => ejecutar("equipo_en_local", { estado: equipoEnLocal ? "NO" : "SI" })}
          >
            {equipoEnLocal ? "Cliente se lleva" : "Cliente lo trajo"}
          </Button>
        </div>
      )}
    </div>
  );
}
