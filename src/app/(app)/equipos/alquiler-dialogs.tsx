"use client";

import { useEffect, useMemo, useState } from "react";
import { TimerStart, Building, Profile, SearchNormal1, Truck, ArrowLeft2, ArrowRight2, Receipt } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Equipo, DatosNuevoAlquiler } from "@/lib/equipos";
import { Cliente } from "@/lib/clientes";
import { esEmailValido } from "@/lib/validacion";
import { BuscarClienteDialog } from "@/components/buscar-cliente-dialog";

const METODOS_PAGO = ["Efectivo", "Tarjeta bancaria", "Bizum", "Transferencia"];
const BANCOS = ["Santander", "Sabadell", "BBVA", "CaixaBank"];
const PORTE_MENSAJERIA = 12.4;

function euros(n: number): string {
  return (n || 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function hoyISO(): string {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
}

/** Reproduce recalcularFechaFin() del original — suma meses*30 + semanas*7 + días a la fecha de inicio. */
function calcularFechaFin(inicio: string, meses: number, semanas: number, dias: number): string {
  if (!inicio || meses + semanas + dias <= 0) return "";
  const [anio, mes, dia] = inicio.split("-").map(Number);
  const f = new Date(anio, mes - 1, dia);
  f.setDate(f.getDate() + meses * 30 + semanas * 7 + dias);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
}

interface DuracionForm {
  meses: number;
  semanas: number;
  dias: number;
  fechaInicio: string;
}

interface FacturacionForm {
  clienteNombre: string;
  clienteTelefono: string;
  clienteDNI: string;
  clienteEmail: string;
  clienteDireccion: string;
  codigoCliente: string;
  metodoPago: string;
  banco: string;
  numeroOperacion: string;
  estadoFactura: string;
  observaciones: string;
  envioActivado: boolean;
  recogidaActivada: boolean;
}

function duracionVacia(): DuracionForm {
  return { meses: 0, semanas: 0, dias: 1, fechaInicio: hoyISO() };
}

function facturacionVacia(): FacturacionForm {
  return {
    clienteNombre: "", clienteTelefono: "", clienteDNI: "", clienteEmail: "", clienteDireccion: "", codigoCliente: "",
    // Decisión explícita del usuario: en un alquiler nuevo el cobro se hace
    // en el momento de registrarlo (a diferencia de una reparación, donde
    // puede quedar pendiente), así que el estado por defecto es "Cobrada" —
    // se puede cambiar a "Pendiente" a mano si hiciera falta.
    metodoPago: "", banco: "", numeroOperacion: "", estadoFactura: "Cobrada", observaciones: "",
    envioActivado: false, recogidaActivada: false,
  };
}

/**
 * Reproduce #modalNuevoAlquiler + #modalNuevoAlquilerPaso2
 * (abrirModalNuevoAlquiler/_alqPaso1Siguiente/confirmarAlquilerConFactura)
 * del original — el equipo ya llega preseleccionado (como en el original,
 * que también se abre siempre con equipoIdPreselect desde el detalle del
 * equipo), así que aquí se omite solo el buscador de equipo del paso 1, no
 * el resto del flujo.
 *
 * La tabla de Conceptos del paso 2 es de solo lectura: en el original es
 * técnicamente editable, pero confirmarAlquilerConFactura() nunca lee esas
 * filas — apiGenerarFacturaAlquiler() recalcula las líneas en el servidor
 * a partir del alquiler ya creado (duración, tarifas, fianza y
 * mensajería). Editar esa tabla en el original no cambia la factura real;
 * mostrarla como editable aquí sería un espejismo, así que se muestra como
 * el resumen fiel que realmente es.
 *
 * Tampoco existen columnas para "banco"/"nº de operación de tarjeta" en el
 * esquema migrado (ALQUILER_FISCAL_COLUMNAS_PERMITIDAS no las incluye) —
 * mismo hueco de migración que "ventas.metodo_pago": se capturan en el
 * formulario igual que el original, pero solo quedan constancia dentro de
 * las observaciones del alquiler, no en una columna propia.
 */
export function NuevoAlquilerDialog({
  equipo,
  open,
  onOpenChange,
  onCreado,
}: {
  equipo: Equipo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreado: () => void;
}) {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [duracion, setDuracion] = useState<DuracionForm>(duracionVacia());
  const [factu, setFactu] = useState<FacturacionForm>(facturacionVacia());
  const [enviando, setEnviando] = useState(false);
  const [buscarClienteAbierto, setBuscarClienteAbierto] = useState(false);

  useEffect(() => {
    if (open) {
      setPaso(1);
      setDuracion(duracionVacia());
      setFactu(facturacionVacia());
    }
  }, [open]);

  function actualizarDuracion<K extends keyof DuracionForm>(campo: K, valor: DuracionForm[K]) {
    setDuracion((prev) => ({ ...prev, [campo]: valor }));
  }
  function actualizarFactu<K extends keyof FacturacionForm>(campo: K, valor: FacturacionForm[K]) {
    setFactu((prev) => ({ ...prev, [campo]: valor }));
  }

  const fechaFin = useMemo(() => calcularFechaFin(duracion.fechaInicio, duracion.meses, duracion.semanas, duracion.dias), [duracion]);
  const diasTotales = duracion.meses * 30 + duracion.semanas * 7 + duracion.dias;
  const mensajeriaGratis = diasTotales >= 7;

  const resumenPaso1 = useMemo(() => {
    if (!equipo) return { subtotal: 0, iva: 0, total: 0, fianzaConIva: 0, totalCobrar: 0 };
    const subtotal = duracion.meses * equipo.precioMes + duracion.semanas * equipo.precioSemana + duracion.dias * equipo.precioDia;
    const iva = +(subtotal * 0.21).toFixed(2);
    const total = subtotal + iva;
    const fianzaConIva = Math.round(equipo.fianza * 1.21 * 100) / 100;
    return { subtotal, iva, total, fianzaConIva, totalCobrar: total + fianzaConIva };
  }, [equipo, duracion]);

  const lineasPaso2 = useMemo(() => {
    if (!equipo) return [];
    const nombreEq = `${equipo.marca} ${equipo.modelo}`;
    const lineas: { descripcion: string; cantidad: number; precioUnitario: number }[] = [];
    if (duracion.meses > 0) lineas.push({ descripcion: `Alquiler ${nombreEq} (${duracion.meses} ${duracion.meses > 1 ? "meses" : "mes"})`, cantidad: duracion.meses, precioUnitario: equipo.precioMes });
    if (duracion.semanas > 0) lineas.push({ descripcion: `Alquiler ${nombreEq} (${duracion.semanas} ${duracion.semanas > 1 ? "semanas" : "semana"})`, cantidad: duracion.semanas, precioUnitario: equipo.precioSemana });
    if (duracion.dias > 0) lineas.push({ descripcion: `Alquiler ${nombreEq} (${duracion.dias} ${duracion.dias > 1 ? "días" : "día"})`, cantidad: duracion.dias, precioUnitario: equipo.precioDia });
    if (equipo.fianza > 0) lineas.push({ descripcion: "Fianza", cantidad: 1, precioUnitario: equipo.fianza });
    if (factu.envioActivado) lineas.push({ descripcion: "Envío a domicilio", cantidad: 1, precioUnitario: mensajeriaGratis ? 0 : PORTE_MENSAJERIA });
    if (factu.recogidaActivada) lineas.push({ descripcion: "Recogida a domicilio", cantidad: 1, precioUnitario: mensajeriaGratis ? 0 : PORTE_MENSAJERIA });
    return lineas;
  }, [equipo, duracion, factu.envioActivado, factu.recogidaActivada, mensajeriaGratis]);

  const totalesPaso2 = useMemo(() => {
    const base = lineasPaso2.reduce((s, l) => s + l.cantidad * l.precioUnitario, 0);
    const iva = base * 0.21;
    return { base, iva, total: base + iva };
  }, [lineasPaso2]);

  function siguiente() {
    if (duracion.meses + duracion.semanas + duracion.dias <= 0) return toast.error("Indica la duración del alquiler");
    if (!duracion.fechaInicio) return toast.error("Indica la fecha de inicio");
    setPaso(2);
  }

  function seleccionarCliente(c: Cliente) {
    setFactu((prev) => ({
      ...prev,
      codigoCliente: c.codigo || "",
      clienteNombre: c.nombre || "",
      clienteDNI: c.dniCif || "",
      clienteTelefono: c.telefono || "",
      clienteEmail: c.email || "",
      clienteDireccion: c.direccion || "",
    }));
    toast.success("Cliente cargado");
  }

  async function registrarYFacturar() {
    if (!equipo) return;
    if (!factu.clienteNombre.trim() || !factu.clienteTelefono.trim() || !factu.clienteDNI.trim() || !factu.clienteEmail.trim()) {
      return toast.error("Nombre, teléfono, DNI y email son obligatorios");
    }
    if (!esEmailValido(factu.clienteEmail)) return toast.error("El email no tiene un formato válido");
    if (!factu.metodoPago) return toast.error("El método de pago es obligatorio");
    if (factu.metodoPago === "Tarjeta bancaria" && !factu.banco) return toast.error("Selecciona el banco para el pago con tarjeta");

    setEnviando(true);
    try {
      const numOpFinal = factu.banco && factu.numeroOperacion ? `${factu.banco} · ${factu.numeroOperacion}` : factu.banco || factu.numeroOperacion;
      const observacionesFinal = numOpFinal ? [factu.observaciones.trim(), `Tarjeta: ${numOpFinal}`].filter(Boolean).join(" — ") : factu.observaciones.trim();

      const datos: DatosNuevoAlquiler = {
        clienteNombre: factu.clienteNombre.trim(),
        clienteTelefono: factu.clienteTelefono.trim(),
        clienteDNI: factu.clienteDNI.trim(),
        clienteEmail: factu.clienteEmail.trim(),
        clienteDireccion: factu.clienteDireccion.trim(),
        fechaInicio: duracion.fechaInicio,
        fechaFinPrevista: fechaFin,
        meses: duracion.meses,
        semanas: duracion.semanas,
        dias: duracion.dias,
        metodoPago: factu.metodoPago,
        observaciones: observacionesFinal,
        envioActivado: factu.envioActivado,
        recogidaActivada: factu.recogidaActivada,
      };

      const resCrear = await fetch("/api/alquileres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipoId: equipo.id, datos }),
      });
      const dataCrear = await resCrear.json();
      if (!dataCrear.ok) throw new Error(dataCrear.error || "Error al registrar el alquiler");

      const alquilerId = dataCrear.alquilerId as string;

      const resFactura = await fetch(`/api/alquileres/${alquilerId}/facturas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "alquiler",
          requestId: crypto.randomUUID(),
          cliente: { nombre: datos.clienteNombre, direccion: datos.clienteDireccion, dni: datos.clienteDNI, telefono: datos.clienteTelefono },
          formaPago: factu.metodoPago,
          banco: factu.metodoPago === "Tarjeta bancaria" ? factu.banco : "",
          equipoNombre: `${equipo.marca} ${equipo.modelo}`,
          estadoFactura: factu.estadoFactura,
          ...(factu.envioActivado ? { envioLinea: mensajeriaGratis ? 0 : PORTE_MENSAJERIA } : {}),
          ...(factu.recogidaActivada ? { recogidaLinea: mensajeriaGratis ? 0 : PORTE_MENSAJERIA } : {}),
        }),
      });
      const dataFactura = await resFactura.json();
      if (!dataFactura.ok) {
        toast.error(`Alquiler ${alquilerId} registrado, pero falló la factura: ${dataFactura.error || "error desconocido"}`);
        onCreado();
        onOpenChange(false);
        return;
      }

      toast.success(`Alquiler ${alquilerId} registrado · Factura ${dataFactura.numeroFactura} generada`);
      if (dataFactura.url) window.open(dataFactura.url, "_blank");
      onOpenChange(false);
      onCreado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !enviando && onOpenChange(o)}>
        <DialogContent className="max-w-6xl gap-0 p-0 sm:max-w-6xl" showCloseButton={false}>
          <header className="flex items-center gap-2 rounded-t-xl bg-primary px-4 py-3 text-primary-foreground">
            <TimerStart className="size-4.5 shrink-0" />
            <DialogTitle className="text-sm font-semibold text-primary-foreground">
              Nuevo Alquiler <span className="font-normal opacity-80">— Paso {paso} de 2: {paso === 1 ? "Equipo y duración" : "Facturación"}</span>
            </DialogTitle>
          </header>

          {paso === 1 ? (
            <div className="max-h-[75vh] space-y-4 overflow-y-auto bg-muted/30 p-4">
              <div className="rounded-lg border bg-card p-3">
                <p className="font-semibold">{equipo?.marca} {equipo?.modelo}</p>
                <p className="text-xs text-muted-foreground">{[equipo?.serie, equipo?.caracteristicas, equipo?.sistemaOperativo].filter(Boolean).join(" · ")}</p>
                <div className="mt-2 grid grid-cols-4 gap-2 text-sm">
                  <div><span className="text-xs text-muted-foreground">Día:</span> <strong>{equipo?.precioDia}€</strong></div>
                  <div><span className="text-xs text-muted-foreground">Semana:</span> <strong>{equipo?.precioSemana}€</strong></div>
                  <div><span className="text-xs text-muted-foreground">Mes:</span> <strong>{equipo?.precioMes}€</strong></div>
                  <div><span className="text-xs text-muted-foreground">Fianza:</span> <strong>{equipo?.fianza}€</strong></div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-5">
                <div className="space-y-1.5">
                  <Label htmlFor="alqMeses">Meses</Label>
                  <Input id="alqMeses" type="number" min={0} value={duracion.meses} onChange={(e) => actualizarDuracion("meses", parseInt(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="alqSemanas">Semanas</Label>
                  <Input id="alqSemanas" type="number" min={0} value={duracion.semanas} onChange={(e) => actualizarDuracion("semanas", parseInt(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="alqDias">Días</Label>
                  <Input id="alqDias" type="number" min={0} value={duracion.dias} onChange={(e) => actualizarDuracion("dias", parseInt(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="alqFechaInicio">Fecha inicio *</Label>
                  <Input id="alqFechaInicio" type="date" min={hoyISO()} value={duracion.fechaInicio} onChange={(e) => actualizarDuracion("fechaInicio", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha fin prevista</Label>
                  <Input disabled value={fechaFin} className="bg-muted/50" />
                </div>
              </div>

              <div className="rounded-lg border bg-card p-3">
                <div className="grid grid-cols-5 gap-2 text-center text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Subtotal</p>
                    <p className="font-semibold">{euros(resumenPaso1.subtotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">IVA (21%)</p>
                    <p className="font-semibold">{euros(resumenPaso1.iva)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total alquiler</p>
                    <p className="font-semibold text-primary">{euros(resumenPaso1.total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">+ Fianza</p>
                    <p className="font-semibold text-amber-600">{euros(resumenPaso1.fianzaConIva)}</p>
                  </div>
                  <div className="border-l pl-2">
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">TOTAL A COBRAR</p>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{euros(resumenPaso1.totalCobrar)}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-h-[75vh] space-y-4 overflow-y-auto bg-muted/30 p-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>N.º Factura</Label>
                  <Input disabled placeholder="Se asigna al registrar" className="bg-muted/50" />
                </div>
                <div className="space-y-1.5">
                  <Label>Forma de pago *</Label>
                  <Select value={factu.metodoPago} onValueChange={(v) => { actualizarFactu("metodoPago", v || ""); if (v !== "Tarjeta bancaria") { actualizarFactu("banco", ""); actualizarFactu("numeroOperacion", ""); } }}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona —" /></SelectTrigger>
                    <SelectContent>
                      {METODOS_PAGO.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {factu.metodoPago === "Tarjeta bancaria" && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Banco</Label>
                      <Select value={factu.banco} onValueChange={(v) => actualizarFactu("banco", v || "")}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona banco —" /></SelectTrigger>
                        <SelectContent>
                          {BANCOS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="alqNumOp">Nº operación tarjeta</Label>
                      <Input id="alqNumOp" placeholder="Ej: 123456789012" value={factu.numeroOperacion} onChange={(e) => actualizarFactu("numeroOperacion", e.target.value)} />
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label>Estado factura *</Label>
                  <Select value={factu.estadoFactura} onValueChange={(v) => actualizarFactu("estadoFactura", v || "Pendiente")}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendiente">Pendiente</SelectItem>
                      <SelectItem value="Cobrada">Cobrada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[5fr_7fr]">
                <div className="space-y-3">
                  <div className="rounded-lg border bg-card shadow-sm">
                    <div className="flex items-center gap-1.5 rounded-t-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white">
                      <Building className="size-3.5" /> Emisor
                    </div>
                    <div className="space-y-0.5 p-3 text-xs">
                      <p className="font-semibold">KELATOS INFORMÁTICA</p>
                      <p className="text-muted-foreground">Affirma Technology Group S.L.</p>
                      <p>CIF: B72990443</p>
                      <p>Blasco de Garay 63 BJ 2, 28015 Madrid</p>
                      <p>918 294 660 · soporte@kelatos.com</p>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card shadow-sm">
                    <div className="flex items-center justify-between gap-1.5 rounded-t-lg bg-muted-foreground/80 px-3 py-2 text-xs font-semibold text-white">
                      <span className="flex items-center gap-1.5"><Profile className="size-3.5" /> Cliente</span>
                      <Button size="sm" variant="secondary" className="h-6 gap-1 px-2 text-xs" onClick={() => setBuscarClienteAbierto(true)}>
                        <SearchNormal1 className="size-3" /> Buscar
                      </Button>
                    </div>
                    <div className="space-y-2 p-3">
                      <div className="grid grid-cols-[5rem_1fr] items-center gap-2 text-sm">
                        <Label htmlFor="alqDni" className="text-xs text-muted-foreground">DNI / CIF *</Label>
                        <Input id="alqDni" className="h-8 text-sm" value={factu.clienteDNI} onChange={(e) => actualizarFactu("clienteDNI", e.target.value)} />
                        <Label htmlFor="alqCodigo" className="text-xs text-muted-foreground">Código</Label>
                        <Input id="alqCodigo" className="h-8 font-mono text-sm" maxLength={5} value={factu.codigoCliente} onChange={(e) => actualizarFactu("codigoCliente", e.target.value)} />
                        <Label htmlFor="alqNombre" className="text-xs text-muted-foreground">Nombre *</Label>
                        <Input id="alqNombre" className="h-8 text-sm" value={factu.clienteNombre} onChange={(e) => actualizarFactu("clienteNombre", e.target.value)} />
                        <Label htmlFor="alqTel" className="text-xs text-muted-foreground">Teléfono *</Label>
                        <Input id="alqTel" className="h-8 text-sm" value={factu.clienteTelefono} onChange={(e) => actualizarFactu("clienteTelefono", e.target.value)} />
                        <Label htmlFor="alqEmail" className="text-xs text-muted-foreground">Email *</Label>
                        <Input id="alqEmail" className="h-8 text-sm" type="email" value={factu.clienteEmail} onChange={(e) => actualizarFactu("clienteEmail", e.target.value)} />
                        <Label htmlFor="alqDir" className="text-xs text-muted-foreground">Dirección</Label>
                        <Input id="alqDir" className="h-8 text-sm" value={factu.clienteDireccion} onChange={(e) => actualizarFactu("clienteDireccion", e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg border bg-card shadow-sm">
                    <div className="flex items-center gap-1.5 rounded-t-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white">
                      Equipo / Servicio
                    </div>
                    <div className="space-y-1 p-3 text-xs">
                      <p><span className="text-muted-foreground">Equipo:</span> <strong>{equipo?.marca} {equipo?.modelo}</strong></p>
                      <p><span className="text-muted-foreground">Descripción:</span> {[equipo?.serie, equipo?.caracteristicas, equipo?.sistemaOperativo].filter(Boolean).join(" · ")}</p>
                      <p><span className="text-muted-foreground">Período:</span> {duracion.fechaInicio || "—"} → {fechaFin || "—"}</p>
                      <div className="space-y-1 pt-1">
                        <Label htmlFor="alqObs" className="text-xs text-muted-foreground">Observaciones</Label>
                        <Input id="alqObs" className="h-7 text-xs" placeholder="Ej: Se entrega con cargador y funda" value={factu.observaciones} onChange={(e) => actualizarFactu("observaciones", e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card shadow-sm">
                    <div className="flex items-center gap-1.5 rounded-t-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
                      <Receipt className="size-3.5" /> Conceptos
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs text-muted-foreground">
                        <tr>
                          <th className="p-2 text-left">Descripción</th>
                          <th className="w-14 p-2 text-center">Cant.</th>
                          <th className="w-20 p-2 text-right">P. unit.</th>
                          <th className="w-24 p-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineasPaso2.map((l, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2">{l.descripcion} {l.precioUnitario === 0 && (l.descripcion.includes("domicilio")) && <Badge className="ml-1 h-4 bg-emerald-600 px-1 text-[10px]">¡Gratis!</Badge>}</td>
                            <td className="p-2 text-center">{l.cantidad}</td>
                            <td className="p-2 text-right">{euros(l.precioUnitario)}</td>
                            <td className="p-2 text-right">{euros(l.cantidad * l.precioUnitario)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/30 text-sm">
                        <tr>
                          <td colSpan={2} className="p-1.5 text-right text-xs text-muted-foreground">Base imponible</td>
                          <td className="p-1.5 text-right font-semibold" colSpan={2}>{euros(totalesPaso2.base)}</td>
                        </tr>
                        <tr>
                          <td colSpan={2} className="p-1.5 text-right text-xs text-muted-foreground">IVA (21%)</td>
                          <td className="p-1.5 text-right" colSpan={2}>{euros(totalesPaso2.iva)}</td>
                        </tr>
                        <tr className="bg-primary/10">
                          <td colSpan={2} className="p-1.5 text-right font-bold">TOTAL</td>
                          <td className="p-1.5 text-right text-base font-bold" colSpan={2}>{euros(totalesPaso2.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="rounded-lg border bg-card shadow-sm">
                    <div className="flex items-center gap-1.5 border-b px-3 py-2 text-xs font-semibold">
                      <Truck className="size-3.5 text-primary" /> Mensajería
                    </div>
                    <div className="grid gap-2 p-2 sm:grid-cols-2">
                      <label className="flex items-start gap-2 rounded-md border p-2 text-xs">
                        <Checkbox checked={factu.envioActivado} onCheckedChange={(v) => actualizarFactu("envioActivado", v === true)} />
                        <span>
                          <strong className="block">Envío a domicilio</strong>
                          {factu.envioActivado && mensajeriaGratis && <Badge className="mb-0.5 h-4 bg-emerald-600 px-1 text-[10px]">¡Gratis!</Badge>}
                          <span className="block text-muted-foreground">{PORTE_MENSAJERIA.toFixed(2)} € + IVA · gratis si ≥ 1 semana</span>
                        </span>
                      </label>
                      <label className="flex items-start gap-2 rounded-md border p-2 text-xs">
                        <Checkbox checked={factu.recogidaActivada} onCheckedChange={(v) => actualizarFactu("recogidaActivada", v === true)} />
                        <span>
                          <strong className="block">Recogida a domicilio</strong>
                          {factu.recogidaActivada && mensajeriaGratis && <Badge className="mb-0.5 h-4 bg-emerald-600 px-1 text-[10px]">¡Gratis!</Badge>}
                          <span className="block text-muted-foreground">{PORTE_MENSAJERIA.toFixed(2)} € + IVA · gratis si ≥ 1 semana</span>
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <footer className="flex justify-end gap-2 border-t bg-muted/50 px-4 py-3">
            {paso === 1 ? (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>Cancelar</Button>
                <Button className="gap-1.5" onClick={siguiente} disabled={enviando || !equipo}>
                  Siguiente <ArrowRight2 className="size-3.5" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="gap-1.5" onClick={() => setPaso(1)} disabled={enviando}>
                  <ArrowLeft2 className="size-3.5" /> Volver
                </Button>
                <Button className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={registrarYFacturar} disabled={enviando}>
                  <Receipt className="size-3.5" /> {enviando ? "Registrando…" : "Registrar y generar factura"}
                </Button>
              </>
            )}
          </footer>
        </DialogContent>
      </Dialog>

      <BuscarClienteDialog open={buscarClienteAbierto} onOpenChange={setBuscarClienteAbierto} onSeleccionar={seleccionarCliente} />
    </>
  );
}
