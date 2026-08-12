"use client";

import { useState } from "react";
import { Edit2, Personalcard, Call, Sms, Location, TickCircle, CloseCircle } from "@/lib/icons";
import type { Icon } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ReparacionDetalle } from "@/lib/reparacion-detalle";
import { formatearFecha } from "@/lib/dias-entrega";

function Linea({ icono: Icono, valor }: { icono: Icon; valor: string }) {
  if (!valor) return null;
  return (
    <p className="flex items-start gap-2 text-sm">
      <Icono className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span className="wrap-break-word">{valor}</span>
    </p>
  );
}

function TituloEditable({ children, onEditar }: { children: React.ReactNode; onEditar: () => void }) {
  return (
    <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
      <Button size="icon-sm" variant="ghost" className="size-5" onClick={onEditar} title="Editar">
        <Edit2 className="size-3" />
      </Button>
    </h3>
  );
}

/** Reproduce el toggle "Cliente" (btnEditarCliente/guardarEditarCliente) del original — vista de lectura ↔ formulario inline, sin modal aparte. */
export function ClienteEditable({ detalle, onActualizado }: { detalle: ReparacionDetalle; onActualizado: () => void }) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [dniCif, setDniCif] = useState("");
  const [direccion, setDireccion] = useState("");
  const [guardando, setGuardando] = useState(false);

  function empezarEdicion() {
    setNombre(detalle.cliente.nombre);
    setTelefono(detalle.cliente.telefono);
    setEmail(detalle.cliente.email);
    setDniCif(detalle.dniCif);
    setDireccion(detalle.cliente.direccion);
    setEditando(true);
  }

  async function guardar() {
    if (!nombre.trim()) return toast.error("El nombre es obligatorio");
    setGuardando(true);
    try {
      const res = await fetch(`/api/reparaciones/${detalle.resguardo}/cliente`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, telefono, email, dniCif, direccionEnvio: direccion }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Cliente actualizado");
      setEditando(false);
      onActualizado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  if (editando) {
    return (
      <div className="space-y-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</h3>
        <Input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <div className="flex items-center gap-1.5">
          <Call className="size-4 shrink-0 text-muted-foreground" />
          <Input placeholder="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </div>
        <div className="flex items-center gap-1.5">
          <Sms className="size-4 shrink-0 text-muted-foreground" />
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex items-center gap-1.5">
          <Personalcard className="size-4 shrink-0 text-muted-foreground" />
          <Input placeholder="DNI / CIF" value={dniCif} onChange={(e) => setDniCif(e.target.value)} />
        </div>
        <div className="flex items-center gap-1.5">
          <Location className="size-4 shrink-0 text-muted-foreground" />
          <Input placeholder="Dirección" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
        </div>
        <div className="flex gap-1.5 pt-0.5">
          <Button size="sm" className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700" onClick={guardar} disabled={guardando}>
            <TickCircle className="size-3.5" /> {guardando ? "Guardando..." : "Guardar"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setEditando(false)} disabled={guardando}>
            <CloseCircle className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <TituloEditable onEditar={empezarEdicion}>Cliente</TituloEditable>
      <p className="text-base font-semibold">{detalle.cliente.nombre || "-"}</p>
      <Linea icono={Personalcard} valor={detalle.dniCif} />
      <Linea icono={Call} valor={detalle.cliente.telefono} />
      <Linea icono={Sms} valor={detalle.cliente.email} />
      <Linea icono={Location} valor={detalle.cliente.direccion} />
    </div>
  );
}

/** Reproduce el toggle "Equipo" (btnEditarEquipo/guardarEditarEquipo) del original. */
export function EquipoEditable({
  detalle,
  sintoma,
  onActualizado,
}: {
  detalle: ReparacionDetalle;
  sintoma: { principal: string; extras: string[] };
  onActualizado: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [modelo, setModelo] = useState("");
  const [sintomaTexto, setSintomaTexto] = useState("");
  const [guardando, setGuardando] = useState(false);

  function empezarEdicion() {
    setModelo(detalle.equipo.modelo);
    setSintomaTexto(detalle.equipo.sintoma);
    setEditando(true);
  }

  async function guardar() {
    if (!modelo.trim()) return toast.error("El modelo del equipo es obligatorio");
    setGuardando(true);
    try {
      const res = await fetch(`/api/reparaciones/${detalle.resguardo}/equipo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelo, sintoma: sintomaTexto }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Equipo actualizado");
      setEditando(false);
      onActualizado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  if (editando) {
    return (
      <div className="space-y-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Equipo</h3>
        <Input placeholder="Modelo del equipo" value={modelo} onChange={(e) => setModelo(e.target.value)} />
        <Textarea placeholder="Síntoma" rows={2} value={sintomaTexto} onChange={(e) => setSintomaTexto(e.target.value)} />
        <div className="flex gap-1.5 pt-0.5">
          <Button size="sm" className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700" onClick={guardar} disabled={guardando}>
            <TickCircle className="size-3.5" /> {guardando ? "Guardando..." : "Guardar"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setEditando(false)} disabled={guardando}>
            <CloseCircle className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <TituloEditable onEditar={empezarEdicion}>Equipo</TituloEditable>
      <p className="text-base font-semibold">{detalle.equipo.modelo || "-"}</p>
      <p className="text-sm"><span className="text-muted-foreground">Síntoma:</span> {sintoma.principal || "-"}</p>
      {sintoma.extras.length > 0 && (
        <div className="space-y-0.5">
          {sintoma.extras.map((linea, i) => (
            <p key={i} className="text-xs text-muted-foreground">{linea}</p>
          ))}
        </div>
      )}
      <p className="text-sm"><span className="text-muted-foreground">Fecha recepción:</span> {formatearFecha(detalle.fechaRecepcion)}</p>
    </div>
  );
}
