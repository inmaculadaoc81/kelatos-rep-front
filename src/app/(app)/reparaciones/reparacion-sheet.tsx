"use client";

import { useEffect, useState } from "react";
import {
  AddCircle,
  Trash,
  Shop,
  Truck,
  Receipt,
  ShieldTick,
  Verify,
  ClipboardTick,
  Personalcard,
  Monitor,
  Video,
  CloseCircle,
  TickCircle,
} from "@/lib/icons";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Reparacion } from "@/lib/reparaciones";
import { PiezaForm, TipoLineaPieza } from "@/lib/presupuesto-form";
import { Empleado } from "@/app/api/empleados/route";
import {
  DatosReparacionSheet,
  EstadoInicial,
  TipoRecepcion,
  calcularTotalCintas,
  datosSheetVacios,
} from "@/lib/reparacion-sheet";

const PREFIJOS_TELEFONO = ["+34", "+33", "+351", "+44", "+49", "+39", "+1", "+54", "+52", "+57"];

/** Reproduce el parseo de teléfono de abrirModalConfirmarFormulario (Index.html): separa prefijo + número tanto si vienen con espacio como pegados. */
function separarTelefono(tel: string): { prefijo: string; numero: string } {
  if (!tel || tel === "No tiene") return { prefijo: "+34", numero: "" };
  const m = tel.match(/^(\+\d{1,4})\s*(\d+)$/);
  if (m) return { prefijo: m[1], numero: m[2] };
  const limpio = tel.replace(/[^\d+]/g, "");
  const m2 = limpio.match(/(\+\d{2,4})(\d{6,12})$/);
  if (m2) return { prefijo: m2[1], numero: m2[2] };
  return { prefijo: "+34", numero: tel };
}

function datosDesdeReparacion(rep: Reparacion): DatosReparacionSheet {
  const tel = separarTelefono(rep.cliente.telefono);
  const sinTelefono = !rep.cliente.telefono || rep.cliente.telefono === "No tiene";
  const sinEmail = !rep.cliente.email || rep.cliente.email === "No tiene";
  return {
    ...datosSheetVacios(),
    clienteNombre: rep.cliente.nombre,
    telPrefijo: tel.prefijo,
    clienteTelefono: tel.numero,
    noTieneTelefono: sinTelefono,
    clienteEmail: sinEmail ? "" : rep.cliente.email,
    noTieneEmail: sinEmail,
    dniCif: rep.dniCif,
    direccionEnvio: rep.cliente.direccion,
    esCintas: !!rep.datosCintas,
    equipoModelo: rep.equipo.modelo,
    sintoma: rep.equipo.sintoma,
    cintas: rep.datosCintas?.tipos || datosSheetVacios().cintas,
    tipoRecepcion: (rep.tipoRecepcion as TipoRecepcion) || "LOCAL",
    entregaMensajeria: rep.entregaMensajeria === "SI",
  };
}

function SeccionTitulo({ icono: Icono, children }: { icono: typeof Shop; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase">
      <Icono className="size-3.5" /> {children}
    </p>
  );
}

export function ReparacionSheet({
  modo,
  reparacionPendiente,
  open,
  onOpenChange,
  onGuardado,
}: {
  modo: "nueva" | "confirmar";
  /** Solo en modo "confirmar" — la reparación con estado "Formulario Pendiente" que se va a confirmar. */
  reparacionPendiente?: Reparacion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuardado: () => void;
}) {
  const [datos, setDatos] = useState<DatosReparacionSheet>(datosSheetVacios());
  const [resguardoPreview, setResguardoPreview] = useState<string>("");
  const [cargandoResguardo, setCargandoResguardo] = useState(false);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [guardando, setGuardando] = useState(false);

  const esConfirmar = modo === "confirmar";
  const esAceptarAhora = datos.estado === "aceptar_ahora";

  useEffect(() => {
    if (!open) return;
    setDatos(esConfirmar && reparacionPendiente ? datosDesdeReparacion(reparacionPendiente) : datosSheetVacios());
    if (!esConfirmar) cargarResguardoPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reparacionPendiente]);

  useEffect(() => {
    fetch("/api/empleados")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setEmpleados(d.empleados); })
      .catch(() => {});
  }, []);

  async function cargarResguardoPreview() {
    setCargandoResguardo(true);
    try {
      const res = await fetch("/api/reparaciones/resguardo-siguiente");
      const data = await res.json();
      setResguardoPreview(data.ok ? String(data.siguiente) : "");
    } catch {
      setResguardoPreview("");
    } finally {
      setCargandoResguardo(false);
    }
  }

  function actualizar<K extends keyof DatosReparacionSheet>(campo: K, valor: DatosReparacionSheet[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }
  function actualizarInmediato<K extends keyof DatosReparacionSheet["presupuestoInmediato"]>(campo: K, valor: DatosReparacionSheet["presupuestoInmediato"][K]) {
    setDatos((prev) => ({ ...prev, presupuestoInmediato: { ...prev.presupuestoInmediato, [campo]: valor } }));
  }
  function actualizarPieza(i: number, campo: keyof PiezaForm, valor: string | number) {
    setDatos((prev) => ({
      ...prev,
      presupuestoInmediato: { ...prev.presupuestoInmediato, piezas: prev.presupuestoInmediato.piezas.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)) },
    }));
  }
  function agregarPieza() {
    setDatos((prev) => ({
      ...prev,
      presupuestoInmediato: {
        ...prev.presupuestoInmediato,
        piezas: [...prev.presupuestoInmediato.piezas, { descripcion: "", tipo: "stock", costo: 0, precio: 0, enlace: "", proveedorId: "", referenciaStock: "", notas: "" }],
      },
    }));
  }
  function quitarPieza(i: number) {
    setDatos((prev) => ({ ...prev, presupuestoInmediato: { ...prev.presupuestoInmediato, piezas: prev.presupuestoInmediato.piezas.filter((_, idx) => idx !== i) } }));
  }

  const calculoCintas = calcularTotalCintas(datos.cintas, datos.precioPorCintaPersonalizado);

  function validar(): string | null {
    if (!datos.clienteNombre.trim()) return "El nombre del cliente es obligatorio";
    if (!datos.dniCif.trim()) return "El DNI / CIF del cliente es obligatorio";
    if (!datos.direccionEnvio.trim()) return "La dirección del cliente es obligatoria";
    if (!datos.noTieneTelefono && !datos.clienteTelefono.trim()) return 'El teléfono es obligatorio. Si el cliente no tiene, marca "No tiene".';
    if (!datos.noTieneEmail) {
      if (!datos.clienteEmail.trim()) return 'El email es obligatorio. Si el cliente no tiene, marca "No tiene".';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.clienteEmail)) return "El email no es válido.";
    }
    if (datos.esCintas) {
      if (calculoCintas.total === 0) return "Debe ingresar al menos 1 cinta";
    } else {
      if (!datos.equipoModelo.trim()) return "El modelo/marca del equipo es obligatorio";
      if (!datos.sintoma.trim()) return "El síntoma/avería es obligatorio";
      if (!datos.revisionPagada) return "Indica si corresponde cobrar la revisión (20€)";
      if (!datos.dejaCargador) return "Indica si el cliente deja el cargador";
    }
    if (esAceptarAhora) {
      if (!datos.presupuestoInmediato.elaboradoPor) return "El responsable del presupuesto es obligatorio";
      if (!datos.presupuestoInmediato.descripcion.trim()) return "El diagnóstico del presupuesto es obligatorio";
      if (!datos.esCintas) {
        if (datos.presupuestoInmediato.manoObra <= 0 && !datos.necesitaPieza) return "Introduce la mano de obra o añade al menos una pieza";
        if (!datos.presupuestoInmediato.diasEntrega || datos.presupuestoInmediato.diasEntrega <= 0) return "Los días estimados de entrega son obligatorios";
        if (datos.necesitaPieza) {
          if (datos.presupuestoInmediato.piezas.length === 0) return "Añade al menos una pieza";
          if (datos.presupuestoInmediato.piezas.some((p) => !p.descripcion.trim())) return "Todas las piezas deben tener descripción";
          if (datos.presupuestoInmediato.piezas.some((p) => p.tipo === "pedido" && !p.enlace.trim())) return 'Las piezas "Por pedido" deben tener enlace de compra';
          if (datos.presupuestoInmediato.piezas.some((p) => !(p.costo > 0))) return "Todas las piezas deben tener un costo mayor a 0";
          if (datos.presupuestoInmediato.piezas.some((p) => !(p.precio > 0))) return "Todas las piezas deben tener un precio de venta mayor a 0";
        }
      }
    }
    return null;
  }

  async function guardar() {
    const error = validar();
    if (error) return toast.error(error);

    setGuardando(true);
    try {
      const url = esConfirmar ? `/api/reparaciones/${reparacionPendiente!.resguardo}/confirmar` : "/api/reparaciones/altas";
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(esConfirmar ? `Recepción ${reparacionPendiente!.resguardo} confirmada — ${data.nuevoEstado}` : `Reparación ${data.resguardo} registrada`);
      onOpenChange(false);
      onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !guardando && onOpenChange(o)}>
      <SheetContent className="w-full gap-0 p-0 data-[side=right]:sm:max-w-4xl" showCloseButton={false}>
        {/* Mismo patrón que detalle-dialog.tsx: cabecera a sangre en bg-primary
            con su propio botón de cerrar, cuerpo con fondo neutro y cada
            sección en una tarjeta con borde — no el Sheet en blanco liso. */}
        <header className="flex items-center gap-3 bg-primary px-5 py-3.5 text-primary-foreground">
          {esConfirmar ? <ClipboardTick className="size-5 shrink-0" /> : <AddCircle className="size-5 shrink-0" />}
          <SheetTitle className="text-base font-semibold text-primary-foreground">
            {esConfirmar ? `Confirmar Recepción — Formulario Tablet (#${reparacionPendiente?.resguardo})` : "Nueva Reparación — Recepción"}
          </SheetTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
            onClick={() => onOpenChange(false)}
            disabled={guardando}
            aria-label="Cerrar"
          >
            <CloseCircle className="size-5" />
          </Button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto bg-muted/20 p-5">
          {/* Datos del parte */}
          <div className="rounded-xl border bg-card p-4">
            <SeccionTitulo icono={ClipboardTick}>Datos del parte</SeccionTitulo>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nº Resguardo</Label>
                {esConfirmar ? (
                  <Input value={reparacionPendiente?.resguardo || ""} readOnly className="bg-muted" />
                ) : (
                  <div className="flex gap-1.5">
                    <Input value={cargandoResguardo ? "Cargando..." : resguardoPreview} readOnly className="bg-muted" />
                    <Button type="button" variant="outline" size="icon" onClick={cargarResguardoPreview} title="Recargar número">
                      <Verify className="size-4" />
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{esConfirmar ? "Ya reservado al crear la solicitud" : "Vista previa — el número real se asigna al guardar"}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fechaRecepcion">Fecha de recepción *</Label>
                <Input id="fechaRecepcion" type="date" value={datos.fechaRecepcion} onChange={(e) => actualizar("fechaRecepcion", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Datos del cliente */}
          <div className="rounded-xl border bg-card p-4">
            <SeccionTitulo icono={Personalcard}>Datos del cliente</SeccionTitulo>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="clienteNombre">Nombre completo *</Label>
                <Input id="clienteNombre" value={datos.clienteNombre} onChange={(e) => actualizar("clienteNombre", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono *</Label>
                <div className="flex gap-1.5">
                  <Select value={datos.telPrefijo} onValueChange={(v) => actualizar("telPrefijo", v || "+34")}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PREFIJOS_TELEFONO.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    value={datos.clienteTelefono}
                    disabled={datos.noTieneTelefono}
                    onChange={(e) => actualizar("clienteTelefono", e.target.value.replace(/[^\d]/g, ""))}
                  />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Checkbox checked={datos.noTieneTelefono} onCheckedChange={(v) => actualizar("noTieneTelefono", v === true)} /> No tiene
                </label>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clienteEmail">Email *</Label>
                <Input id="clienteEmail" type="email" disabled={datos.noTieneEmail} value={datos.clienteEmail} onChange={(e) => actualizar("clienteEmail", e.target.value)} />
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Checkbox checked={datos.noTieneEmail} onCheckedChange={(v) => actualizar("noTieneEmail", v === true)} /> No tiene
                </label>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dniCif">DNI / CIF *</Label>
                <Input id="dniCif" value={datos.dniCif} onChange={(e) => actualizar("dniCif", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="direccionEnvio">Dirección *</Label>
                <Input id="direccionEnvio" value={datos.direccionEnvio} onChange={(e) => actualizar("direccionEnvio", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Datos del equipo */}
          <div className="rounded-xl border bg-card p-4">
            <SeccionTitulo icono={Monitor}>Datos del equipo</SeccionTitulo>
            <label className="mt-3 flex items-center gap-2 text-sm font-medium text-sky-700 dark:text-sky-400">
              <Switch checked={datos.esCintas} onCheckedChange={(v) => actualizar("esCintas", v)} />
              <Video className="size-4" /> Equipo usa cintas (VHS, MiniDV, 8mm, etc.)
            </label>

            {!datos.esCintas ? (
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="equipoModelo">Modelo / Marca del equipo *</Label>
                  <Input id="equipoModelo" value={datos.equipoModelo} onChange={(e) => actualizar("equipoModelo", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sintoma">Síntoma / Avería *</Label>
                  <Textarea id="sintoma" rows={3} value={datos.sintoma} onChange={(e) => actualizar("sintoma", e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-3 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
                <p className="rounded-md bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400">
                  El presupuesto se generará y aceptará automáticamente al guardar.
                </p>
                <div className="space-y-1.5">
                  <Label>Precio por cinta (opcional)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Automático según cantidad"
                    value={datos.precioPorCintaPersonalizado}
                    onChange={(e) => actualizar("precioPorCintaPersonalizado", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">Dejar vacío para precio automático</p>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {(["vhs", "vhsc", "beta", "minidv", "8mm", "cassette", "bobina"] as const).map((k) => (
                    <div key={k} className="space-y-1">
                      <Label className="text-xs uppercase">{k}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={datos.cintas[k]}
                        onChange={(e) => actualizar("cintas", { ...datos.cintas, [k]: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-md border bg-card p-2.5 text-center text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Total cintas</p>
                    <p className="font-semibold">{calculoCintas.total}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Precio/cinta</p>
                    <p className="font-semibold">
                      {calculoCintas.precioPorCinta.toFixed(2)}€{datos.cintas.bobina > 0 && " / 20€ bob."}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total (IVA incl.)</p>
                    <p className="font-semibold">{calculoCintas.totalConIva.toFixed(2)}€</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Tarifa: 1-4 cintas=15€ · 5-9=12€ · 10-29=10€ · 30+=8€ · Bobina=20€ (fijo)</p>
              </div>
            )}
          </div>

          {/* Recepción y estado inicial */}
          <div className="rounded-xl border bg-card p-4">
            <SeccionTitulo icono={Truck}>Tipo de recepción</SeccionTitulo>
            <RadioGroup value={datos.tipoRecepcion} onValueChange={(v) => actualizar("tipoRecepcion", v as TipoRecepcion)} className="mt-3 flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="LOCAL" /> <Shop className="size-4" /> Cliente trajo al local
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="ENVIO" /> <Truck className="size-4" /> Recibido por envío
              </label>
            </RadioGroup>
            {datos.tipoRecepcion === "ENVIO" && (
              <label className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Switch checked={datos.entregaMensajeria} onCheckedChange={(v) => actualizar("entregaMensajeria", v)} />
                Devolución también por mensajería
              </label>
            )}

            <hr className="my-4" />

            <SeccionTitulo icono={ShieldTick}>Estado inicial</SeccionTitulo>
            <RadioGroup value={datos.estado} onValueChange={(v) => actualizar("estado", v as EstadoInicial)} className="mt-3 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="Presupuesto Pendiente" /> <Receipt className="size-4" /> Presupuesto Pendiente
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="Garantía" /> <ShieldTick className="size-4" /> Garantía
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="aceptar_ahora" /> <Verify className="size-4" /> Aceptar ahora
              </label>
            </RadioGroup>
          </div>

          {esAceptarAhora && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400">
                <Verify className="size-4" /> Presupuesto aceptado en el acto
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                El equipo pasará directamente a <strong>En Reparación</strong> (o <strong>Presupuesto Aceptado</strong> si requiere pieza).
              </p>
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <Label>Responsable *</Label>
                  <Select value={datos.presupuestoInmediato.elaboradoPor} onValueChange={(v) => actualizarInmediato("elaboradoPor", v || "")}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                    <SelectContent>
                      {empleados.map((e) => <SelectItem key={e.empleadoId} value={e.nombre}>{e.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Diagnóstico / trabajo a realizar *</Label>
                  <Textarea rows={2} value={datos.presupuestoInmediato.descripcion} onChange={(e) => actualizarInmediato("descripcion", e.target.value)} />
                </div>

                {!datos.esCintas && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Mano de obra (€) *</Label>
                      <Input type="number" min={0} step="0.01" value={datos.presupuestoInmediato.manoObra} onChange={(e) => actualizarInmediato("manoObra", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>¿Requiere pieza(s)? *</Label>
                      <RadioGroup value={datos.necesitaPieza ? "si" : "no"} onValueChange={(v) => actualizar("necesitaPieza", v === "si")} className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="no" /> No requiere pieza</label>
                        <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="si" /> Requiere pieza(s)</label>
                      </RadioGroup>
                    </div>
                    {datos.necesitaPieza && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Piezas</Label>
                          <Button type="button" size="sm" variant="outline" className="h-7 gap-1" onClick={agregarPieza}>
                            <AddCircle className="size-3.5" /> Añadir pieza
                          </Button>
                        </div>
                        {datos.presupuestoInmediato.piezas.map((p, i) => (
                          <div key={i} className="grid grid-cols-2 gap-2 rounded-md border bg-card p-2 sm:grid-cols-6">
                            <Input className="col-span-2" placeholder="Descripción" value={p.descripcion} onChange={(e) => actualizarPieza(i, "descripcion", e.target.value)} />
                            <Select value={p.tipo} onValueChange={(v) => actualizarPieza(i, "tipo", v as TipoLineaPieza)}>
                              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="stock">En stock</SelectItem>
                                <SelectItem value="pedido">Por pedido</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input type="number" placeholder="Costo" step="0.01" value={p.costo} onChange={(e) => actualizarPieza(i, "costo", parseFloat(e.target.value) || 0)} />
                            <Input type="number" placeholder="Precio" step="0.01" value={p.precio} onChange={(e) => actualizarPieza(i, "precio", parseFloat(e.target.value) || 0)} />
                            <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => quitarPieza(i)}>
                              <Trash className="size-4" />
                            </Button>
                            {p.tipo === "pedido" && (
                              <Input className="col-span-2 sm:col-span-6" placeholder="Enlace de compra *" value={p.enlace} onChange={(e) => actualizarPieza(i, "enlace", e.target.value)} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label>Días estimados de entrega *</Label>
                      <Input type="number" min={1} value={datos.presupuestoInmediato.diasEntrega} onChange={(e) => actualizarInmediato("diasEntrega", parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Notas adicionales</Label>
                      <Textarea rows={2} value={datos.presupuestoInmediato.notas} onChange={(e) => actualizarInmediato("notas", e.target.value)} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Revisión pagada + Deja cargador */}
          {!datos.esCintas && (
            <div className="rounded-xl border bg-card p-4">
              <SeccionTitulo icono={TickCircle}>Revisión y cargador</SeccionTitulo>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Revisión pagada (20€) *</Label>
                  <Select value={datos.revisionPagada} onValueChange={(v) => actualizar("revisionPagada", v as DatosReparacionSheet["revisionPagada"])}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="— Seleccionar —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corresponde">Corresponde</SelectItem>
                      <SelectItem value="no_corresponde">No corresponde</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Deja el cargador *</Label>
                  <Select value={datos.dejaCargador} onValueChange={(v) => actualizar("dejaCargador", v as DatosReparacionSheet["dejaCargador"])}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="— Seleccionar —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="si">Corresponde</SelectItem>
                      <SelectItem value="no">No corresponde</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t bg-muted/50 px-5 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando..." : esConfirmar ? "Confirmar recepción" : "Registrar Recepción"}
          </Button>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
