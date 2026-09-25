"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Monitor, Warning2 } from "@/lib/icons";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Equipo } from "@/lib/equipos";

const ETIQUETAS_ESTADO: Record<string, string> = {
  DISPONIBLE: "Disponible",
  ALQUILADO: "Alquilado",
  MANTENIMIENTO: "Mantenimiento",
  FUERA_SERVICIO: "Fuera de servicio",
  VENDIDO: "Vendido",
};

interface Formulario {
  marca: string;
  modelo: string;
  serie: string;
  sistemaOperativo: string;
  caracteristicas: string;
  defectos: string;
  observaciones: string;
  enlaceRepuesto: string;
  imagenUrl: string;
  precioDia: string;
  precioSemana: string;
  precioMes: string;
  fianza: string;
}

function desdeEquipo(e: Equipo): Formulario {
  return {
    marca: e.marca,
    modelo: e.modelo,
    serie: e.serie,
    sistemaOperativo: e.sistemaOperativo,
    caracteristicas: e.caracteristicas,
    defectos: e.defectos,
    observaciones: e.observaciones,
    enlaceRepuesto: e.enlaceRepuesto ?? "",
    imagenUrl: e.imagenUrl,
    precioDia: String(e.precioDia),
    precioSemana: String(e.precioSemana),
    precioMes: String(e.precioMes),
    fianza: String(e.fianza),
  };
}

const esUrlValida = (v: string) => !v.trim() || /^https?:\/\/[^\s]+$/i.test(v.trim());
const fecha = (v: string | null) => (v ? new Date(v).toLocaleDateString("es-ES") : "—");
const euros = (n: number) => (n || 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

/**
 * Ficha del equipo: datos, tarifas y alquileres. Se abre al pulsar la fila.
 * El estado (disponible, mantenimiento…) se sigue cambiando con los botones de la fila.
 */
export function EquipoDetalleDialog({
  equipo,
  open,
  onOpenChange,
  onActualizado,
  onVerAlquiler,
}: {
  equipo: Equipo | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onActualizado: () => void;
  onVerAlquiler: (e: Equipo) => void;
}) {
  const [f, setF] = useState<Formulario | null>(null);
  const [origen, setOrigen] = useState<Formulario | null>(null);
  const [visto, setVisto] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Recarga el formulario al abrir un equipo distinto (o al refrescar tras guardar).
  const clave = equipo ? `${equipo.id}|${JSON.stringify(desdeEquipo(equipo))}` : null;
  if (clave !== visto) {
    setVisto(clave);
    if (equipo) {
      const base = desdeEquipo(equipo);
      setF(base);
      setOrigen(base);
    }
  }

  if (!equipo || !f || !origen) return null;

  const cambios = (Object.keys(f) as (keyof Formulario)[]).filter((k) => f[k] !== origen[k]);
  const poner = (campo: keyof Formulario, valor: string) => setF((p) => (p ? { ...p, [campo]: valor } : p));

  async function guardar() {
    if (!f || !equipo) return;
    if (!f.marca.trim()) return toast.error("La marca es obligatoria");
    if (!f.modelo.trim()) return toast.error("El modelo es obligatorio");
    if (!esUrlValida(f.imagenUrl)) return toast.error("La imagen debe ser una URL válida (https://…)");
    if (!esUrlValida(f.enlaceRepuesto)) return toast.error("El enlace del repuesto debe ser una URL válida (https://…)");
    for (const k of ["precioDia", "precioSemana", "precioMes", "fianza"] as const) {
      const n = Number(String(f[k]).replace(",", "."));
      if (!Number.isFinite(n) || n < 0) return toast.error("Las tarifas y la fianza deben ser números de 0 o más");
    }
    setGuardando(true);
    try {
      const enviar: Record<string, string | number> = {};
      for (const k of cambios) enviar[k] = ["precioDia", "precioSemana", "precioMes", "fianza"].includes(k) ? Number(String(f[k]).replace(",", ".")) : f[k];
      const res = await fetch(`/api/equipos/${encodeURIComponent(equipo.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enviar),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(data.sinCambios ? "No había cambios que guardar" : "Cambios guardados");
      onActualizado();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  const alquileres = [...(equipo.alquilerActivo ? [equipo.alquilerActivo] : []), ...equipo.historicoAlquileres];
  const avisoCatalogo = !!(f.defectos.trim() || f.observaciones.trim());

  return (
    <Dialog open={open} onOpenChange={(o) => !guardando && onOpenChange(o)}>
      <DialogContent className="flex max-h-[88vh] flex-col sm:max-w-2xl" showCloseButton={!guardando}>
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <Monitor className="size-5" /> {equipo.marca} {equipo.modelo}
            <span className="text-sm font-normal text-muted-foreground">{equipo.id}</span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">{ETIQUETAS_ESTADO[equipo.estado] ?? equipo.estado}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span>Alta: {fecha(equipo.fechaAlta)}</span>
            {equipo.tipo && <span>Tipo: {equipo.tipo}</span>}
            <span>{alquileres.length} alquiler(es) registrados</span>
          </div>

          {equipo.alquilerActivo && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
              <div>
                <div className="font-medium">Alquilado a {equipo.alquilerActivo.clienteNombre}</div>
                <div className="text-xs text-muted-foreground">
                  {equipo.alquilerActivo.clienteTelefono} · hasta {fecha(equipo.alquilerActivo.fechaFinPrevista)}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => onVerAlquiler(equipo)}>
                Ver alquiler
              </Button>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="ed-marca">Marca *</Label>
              <Input id="ed-marca" value={f.marca} onChange={(e) => poner("marca", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-modelo">Modelo *</Label>
              <Input id="ed-modelo" value={f.modelo} onChange={(e) => poner("modelo", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-serie">Nº serie</Label>
              <Input id="ed-serie" value={f.serie} onChange={(e) => poner("serie", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ed-so">Sistema operativo</Label>
              <Input id="ed-so" value={f.sistemaOperativo} onChange={(e) => poner("sistemaOperativo", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-enlace">Enlace repuesto</Label>
              <Input id="ed-enlace" type="url" placeholder="https://…" value={f.enlaceRepuesto} onChange={(e) => poner("enlaceRepuesto", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ed-img">Imagen URL</Label>
            <Input id="ed-img" type="url" placeholder="https://…" value={f.imagenUrl} onChange={(e) => poner("imagenUrl", e.target.value)} />
            <p className="text-xs text-muted-foreground">Se usa en el catálogo web, no en el dashboard.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ed-car">Características</Label>
            <Textarea id="ed-car" rows={3} value={f.caracteristicas} onChange={(e) => poner("caracteristicas", e.target.value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ed-def">Defectos conocidos</Label>
              <Textarea id="ed-def" rows={2} className="border-amber-500/50" value={f.defectos} onChange={(e) => poner("defectos", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-obs">Observaciones internas</Label>
              <Textarea id="ed-obs" rows={2} className="border-amber-500/50" value={f.observaciones} onChange={(e) => poner("observaciones", e.target.value)} />
            </div>
          </div>
          {avisoCatalogo && (
            <p className="flex items-start gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
              <Warning2 className="mt-0.5 size-3 shrink-0" /> Con defectos u observaciones rellenados, el equipo queda deshabilitado en el catálogo hasta que se resuelvan.
            </p>
          )}

          <div className="space-y-1.5">
            <Label>Tarifas y fianza (€)</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  ["precioDia", "Día"],
                  ["precioSemana", "Semana"],
                  ["precioMes", "Mes"],
                  ["fianza", "Fianza"],
                ] as const
              ).map(([campo, etiqueta]) => (
                <div key={campo} className="space-y-1">
                  <span className="text-xs text-muted-foreground">{etiqueta}</span>
                  <Input inputMode="decimal" className="tabular-nums" value={f[campo]} onChange={(e) => poner(campo, e.target.value)} aria-label={etiqueta} />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Los cambios de tarifa solo afectan a los alquileres nuevos; cada alquiler ya creado conserva sus precios.</p>
          </div>

          {alquileres.length > 0 && (
            <div className="space-y-1.5">
              <Label>Alquileres</Label>
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">Alquiler</th>
                      <th className="px-2 py-1.5 text-left font-medium">Cliente</th>
                      <th className="px-2 py-1.5 text-left font-medium">Periodo</th>
                      <th className="px-2 py-1.5 text-right font-medium">Cobrado</th>
                      <th className="px-2 py-1.5 text-left font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alquileres.slice(0, 12).map((a) => (
                      <tr key={a.alquilerId} className="border-t">
                        <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{a.alquilerId}</td>
                        <td className="px-2 py-1.5">{a.clienteNombre}</td>
                        <td className="px-2 py-1.5 text-xs tabular-nums">
                          {fecha(a.fechaInicio)} → {fecha(a.fechaDevolucionReal || a.fechaFinPrevista)}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{euros(a.totalCobrado)}</td>
                        <td className="px-2 py-1.5 text-xs">{a.estado}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>
            Cerrar
          </Button>
          <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={guardar} disabled={guardando || cambios.length === 0}>
            {guardando ? "Guardando..." : cambios.length ? `Guardar cambios (${cambios.length})` : "Sin cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
