"use client";

import { useEffect, useState } from "react";
import { Add, Trash, DocumentText, SearchNormal1, Box, ShoppingCart } from "@/lib/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-provider";
import { Presupuesto } from "@/lib/reparacion-detalle";
import { DatosPresupuestoForm, PiezaForm, TipoPieza } from "@/lib/presupuesto-form";
import { Empleado } from "@/app/api/empleados/route";
import { Proveedor } from "@/app/api/proveedores/route";
import { proveedoresParaSelector } from "@/lib/proveedores";
import { StockPieza } from "@/lib/stock-piezas";
import { BuscarPiezaStockDialog } from "./buscar-pieza-stock-dialog";

function vacio(): DatosPresupuestoForm {
  return { elaboradoPor: "", descripcion: "", notas: "", manoObra: 0, diasEntrega: 0, tipoPieza: "no", piezas: [] };
}

function piezaStockVacia(): PiezaForm {
  return { descripcion: "", tipo: "stock", costo: 0, precio: 0, enlace: "", proveedorId: "", referenciaStock: "", notas: "" };
}

function piezaPedidoVacia(): PiezaForm {
  return { descripcion: "", tipo: "pedido", costo: 0, precio: 0, enlace: "", proveedorId: "", referenciaStock: "", notas: "" };
}

function desdeExistente(p: Presupuesto): DatosPresupuestoForm {
  return {
    elaboradoPor: p.elaboradoPor,
    descripcion: p.descripcion,
    notas: p.notas,
    manoObra: p.manoObra,
    diasEntrega: p.diasEntrega,
    tipoPieza: p.tipoPieza === "stock" || p.tipoPieza === "pedido" || p.tipoPieza === "mixto" ? p.tipoPieza : "no",
    piezas: p.piezas.map((pz) => ({
      descripcion: pz.descripcion,
      tipo: pz.tipo === "pedido" ? "pedido" : "stock",
      costo: pz.costo,
      precio: pz.precio,
      enlace: pz.enlace,
      proveedorId: pz.proveedorId,
      referenciaStock: pz.referenciaStock,
      notas: pz.notas,
    })),
  };
}

function euros(n: number): string {
  return n.toFixed(2) + " €";
}

/** Reparaciones habituales de portátil para el «presupuesto rápido»: el técnico marca las que hacen falta y escribe el precio de cada una. */
const REPARACIONES_RAPIDAS = [
  { id: "bateria", nombre: "Cambio de batería" },
  { id: "pantalla", nombre: "Cambio de pantalla" },
  { id: "bisagras", nombre: "Cambio de bisagras" },
  { id: "teclado", nombre: "Cambio de teclado" },
  { id: "conector", nombre: "Cambio de conector de carga" },
  { id: "placa", nombre: "Reparación de placa base" },
] as const;
type RapidasEstado = Record<string, { marcada: boolean; precio: number }>;

/**
 * Reproduce el formulario de Nuevo/Editar Presupuesto del original
 * (mostrarFormularioNuevoPresupuesto/editarPresupuesto/
 * guardarBorradorPresupuesto) — responsable como select, fecha de
 * elaboración de solo lectura, piezas separadas en dos tarjetas (stock
 * vs. a pedir, cada una con su propio color y acciones), y los totales
 * (Costo Piezas / Total al Cliente / Ganancia Neta) recalculados en vivo
 * exactamente igual que calcularGananciaPpto(), incluido el descuento de
 * 20€ cuando la revisión ya está pagada.
 */
export function PresupuestoFormDialog({
  resguardo,
  presupuestoExistente,
  revisionPagada = false,
  clienteEmail = "",
  equipoModelo = "",
  otrosBorradores = 0,
  open,
  onOpenChange,
  onGuardado,
}: {
  resguardo: string;
  presupuestoExistente: Presupuesto | null;
  revisionPagada?: boolean;
  clienteEmail?: string;
  equipoModelo?: string;
  /** Borradores que ya tiene la reparación: «Enviar al cliente» manda TODOS los borradores juntos. */
  otrosBorradores?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuardado: () => void;
}) {
  const [datos, setDatos] = useState<DatosPresupuestoForm>(() => (presupuestoExistente ? desdeExistente(presupuestoExistente) : vacio()));
  const [enviando, setEnviando] = useState(false);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [catalogoAbierto, setCatalogoAbierto] = useState(false);
  const esEdicion = presupuestoExistente !== null;
  const confirmar = useConfirm();
  const [rapidas, setRapidas] = useState<RapidasEstado>({});
  const [enviarAlGuardar, setEnviarAlGuardar] = useState(true);
  const algunaRapida = REPARACIONES_RAPIDAS.some((r) => rapidas[r.id]?.marcada);
  const esHp = /\bhp\b|hewlett|pavilion|omen|elitebook|probook|envy|victus/i.test(equipoModelo);

  /** Cambia una reparación rápida y recalcula la mano de obra (suma de precios) y el diagnóstico que verá el cliente. */
  function cambiarRapida(id: string, cambio: Partial<{ marcada: boolean; precio: number }>) {
    const sig: RapidasEstado = { ...rapidas, [id]: { marcada: rapidas[id]?.marcada ?? false, precio: rapidas[id]?.precio ?? 0, ...cambio } };
    setRapidas(sig);
    const elegidas = REPARACIONES_RAPIDAS.filter((r) => sig[r.id]?.marcada);
    setDatos((prev) => ({
      ...prev,
      tipoPieza: "no",
      piezas: [],
      manoObra: Math.round(elegidas.reduce((n, r) => n + (Number(sig[r.id].precio) || 0), 0) * 100) / 100,
      descripcion: elegidas.length
        ? `Reparación a realizar: ${elegidas.map((r) => `${r.nombre}${sig[r.id].precio > 0 ? ` (${euros(Number(sig[r.id].precio))})` : ""}`).join("; ")}.`
        : "",
    }));
  }

  const fechaElaboracion = presupuestoExistente?.fechaElaboracion
    ? presupuestoExistente.fechaElaboracion.slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!open) return;
    fetch("/api/empleados").then((r) => r.json()).then((d) => { if (d.ok) setEmpleados(d.empleados); });
    fetch("/api/proveedores").then((r) => r.json()).then((d) => { if (d.ok) setProveedores(d.proveedores); });
  }, [open]);

  // mostrarFormularioNuevoPresupuesto() (Index.html): el original resetea
  // el formulario en cada apertura, no solo al cerrar. Este diálogo se
  // monta una sola vez dentro de GestionPresupuestosDialog y nunca se
  // desmonta, así que `datos` sobrevivía entre aperturas — guardar un
  // presupuesto y luego pulsar "+ Nuevo Presupuesto" otra vez reabría el
  // formulario con los datos del presupuesto recién creado en vez de en
  // blanco (bug real reportado; solo se veía en blanco tras cerrar con la
  // X/Escape, que sí pasaba por reiniciar() — nunca al reabrir).
  useEffect(() => {
    if (open) reiniciar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function reiniciar() {
    setDatos(presupuestoExistente ? desdeExistente(presupuestoExistente) : vacio());
    setRapidas({});
    setEnviarAlGuardar(true);
  }

  function actualizar<K extends keyof DatosPresupuestoForm>(campo: K, valor: DatosPresupuestoForm[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  const noRequiere = datos.tipoPieza === "no";
  const tieneStock = datos.tipoPieza === "stock" || datos.tipoPieza === "mixto";
  const tienePedido = datos.tipoPieza === "pedido" || datos.tipoPieza === "mixto";
  const piezasStock = datos.piezas.filter((p) => p.tipo === "stock");
  const piezasPedido = datos.piezas.filter((p) => p.tipo === "pedido");

  // Reproduce toggleSeccionPiezasPpto(): marcar un checkbox desmarca el
  // radio "No requiere pieza"; los datos de la sección que se oculta se
  // conservan (no se borran al desmarcar) para no perder trabajo si el
  // usuario vuelve a marcarla — única diferencia deliberada con el
  // original, que sí vacía el contenedor de "a pedir" al desmarcar.
  function marcarNoRequiere() {
    setDatos((prev) => ({ ...prev, tipoPieza: "no" }));
  }

  function cambiarSeccionPieza(campo: "stock" | "pedido", valor: boolean) {
    setDatos((prev) => {
      const stockActivo = campo === "stock" ? valor : tieneStock;
      const pedidoActivo = campo === "pedido" ? valor : tienePedido;
      const nuevoTipo: TipoPieza = stockActivo && pedidoActivo ? "mixto" : stockActivo ? "stock" : pedidoActivo ? "pedido" : "no";
      let piezas = prev.piezas;
      // Reproduce toggleSeccionPiezasPpto(): solo "Pieza en stock" arranca
      // con una fila automática al marcarse por primera vez; "Pieza por
      // pedido" solo revela la sección vacía — la fila se añade con el
      // botón "+ Agregar Pieza".
      if (campo === "stock" && valor && piezasStock.length === 0) piezas = [...piezas, piezaStockVacia()];
      return { ...prev, tipoPieza: nuevoTipo, piezas };
    });
  }

  function actualizarPieza(tipo: TipoPieza, indiceEnTipo: number, campo: keyof PiezaForm, valor: string | number) {
    setDatos((prev) => {
      let contador = -1;
      return {
        ...prev,
        piezas: prev.piezas.map((p) => {
          if (p.tipo !== tipo) return p;
          contador++;
          return contador === indiceEnTipo ? { ...p, [campo]: valor } : p;
        }),
      };
    });
  }

  function agregarPiezaStock() {
    setDatos((prev) => ({ ...prev, piezas: [...prev.piezas, piezaStockVacia()] }));
  }

  function agregarPiezaDesdeCatalogo(pieza: StockPieza) {
    setDatos((prev) => ({
      ...prev,
      tipoPieza: prev.tipoPieza === "pedido" ? "mixto" : "stock",
      // La pieza del catálogo puede llevar su propia mano de obra asociada
      // (p.ej. "cambiar batería" = 30€). Se suma a la casilla de arriba en
      // vez de sustituirla, para que añadir varias piezas acumule la mano
      // de obra de cada una.
      manoObra: prev.manoObra + (pieza.manoObra > 0 ? pieza.manoObra : 0),
      piezas: [
        ...prev.piezas,
        { descripcion: pieza.nombre, tipo: "stock", costo: pieza.costeInterno, precio: pieza.precioCliente, enlace: "", proveedorId: "", referenciaStock: pieza.referencia, notas: "" },
      ],
    }));
    setCatalogoAbierto(false);
  }

  function agregarPiezaPedido() {
    setDatos((prev) => ({ ...prev, piezas: [...prev.piezas, piezaPedidoVacia()] }));
  }

  function quitarPieza(tipo: TipoPieza, indiceEnTipo: number) {
    setDatos((prev) => {
      let contador = -1;
      return { ...prev, piezas: prev.piezas.filter((p) => (p.tipo !== tipo ? true : ++contador !== indiceEnTipo)) };
    });
  }

  // Reproduce calcularGananciaPpto(): solo cuentan las piezas de las
  // secciones actualmente activas (desmarcar = 0, igual que el original).
  const piezasActivas = datos.piezas.filter((p) => (p.tipo === "stock" && tieneStock) || (p.tipo === "pedido" && tienePedido));
  const costoPiezas = piezasActivas.reduce((s, p) => s + (Number(p.costo) || 0), 0);
  const precioPiezas = piezasActivas.reduce((s, p) => s + (Number(p.precio) || 0), 0);
  const descuentoRevision = revisionPagada ? 20 : 0;
  const total = Math.max(0, Number(datos.manoObra) + precioPiezas - descuentoRevision);
  const gananciaNeta = total - costoPiezas;

  async function guardar() {
    if (algunaRapida && REPARACIONES_RAPIDAS.some((r) => rapidas[r.id]?.marcada && !(Number(rapidas[r.id].precio) > 0))) return toast.error("Pon el precio de cada reparación marcada");
    if (!datos.elaboradoPor.trim()) return toast.error("El responsable es obligatorio");
    if (datos.diasEntrega < 1) return toast.error("Los días de reparación deben ser al menos 1");
    if (datos.descripcion.trim().length < 20) return toast.error("El diagnóstico del equipo es obligatorio y debe tener al menos 20 caracteres");
    if (!noRequiere && !tieneStock && !tienePedido) return toast.error('Selecciona al menos un tipo de pieza, o marca "No requiere pieza".');

    // Reproduce guardarBorradorPresupuesto(): la mano de obra debe ser > 0
    // cuando no se requieren piezas (es lo único que cobra el presupuesto);
    // si se requieren piezas puede ser 0, pero nunca negativa.
    if (noRequiere) {
      if (!(datos.manoObra > 0)) return toast.error("La mano de obra es obligatoria cuando no se requieren piezas");
    } else if (isNaN(datos.manoObra) || datos.manoObra < 0) {
      return toast.error("La mano de obra es obligatoria. Ingresa 0 si no aplica mano de obra en este presupuesto");
    }

    if (tieneStock) {
      if (piezasStock.length === 0) return toast.error("Debe agregar al menos una pieza en stock");
      for (let i = 0; i < piezasStock.length; i++) {
        const p = piezasStock[i];
        if (!p.descripcion.trim()) return toast.error(`Pieza stock #${i + 1}: El nombre es obligatorio`);
        if (!(p.costo > 0)) return toast.error(`Pieza stock #${i + 1}: El costo debe ser mayor a 0`);
        if (!(p.precio > 0)) return toast.error(`Pieza stock #${i + 1}: El precio de venta es obligatorio`);
      }
    }
    if (tienePedido) {
      if (piezasPedido.length === 0) return toast.error("Debe agregar al menos una pieza a pedir");
      for (let i = 0; i < piezasPedido.length; i++) {
        const p = piezasPedido[i];
        if (!p.descripcion.trim()) return toast.error(`Pieza pedido #${i + 1}: La descripción es obligatoria`);
        if (!p.proveedorId) return toast.error(`Pieza pedido #${i + 1}: El proveedor es obligatorio`);
        if (!(p.costo > 0)) return toast.error(`Pieza pedido #${i + 1}: El costo debe ser mayor a 0`);
        if (!(p.precio > 0)) return toast.error(`Pieza pedido #${i + 1}: El precio de venta es obligatorio`);
        if (!p.enlace.trim()) return toast.error(`Pieza pedido #${i + 1}: El enlace de compra es obligatorio`);
      }
    }

    // Solo se envían las piezas de las secciones activas — igual que el
    // cálculo de arriba, una sección desmarcada no cuenta aunque conserve
    // datos localmente.
    const datosEnvio: DatosPresupuestoForm = { ...datos, piezas: piezasActivas };

    setEnviando(true);
    try {
      const url = esEdicion ? `/api/presupuestos/${presupuestoExistente!.presupuestoId}` : `/api/reparaciones/${resguardo}/presupuestos`;
      const res = await fetch(url, {
        method: esEdicion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosEnvio),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(esEdicion ? "Presupuesto actualizado" : `Presupuesto v${data.presupuesto?.version || ""} guardado`);
      // Presupuesto rápido: se envía al cliente por correo a la vez que se guarda (el correo incluye los botones para aceptar o rechazar).
      if (!esEdicion && algunaRapida && enviarAlGuardar) {
        await enviarAlCliente();
      }
      onOpenChange(false);
      onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  async function enviarAlCliente() {
    if (!clienteEmail.trim()) {
      toast.warning("El presupuesto se guardó, pero el cliente no tiene correo: no se pudo enviar. Añade el correo y usa «Enviar al Cliente».");
      return;
    }
    const aviso = otrosBorradores > 0 ? ` Ojo: hay ${otrosBorradores} borrador${otrosBorradores !== 1 ? "es" : ""} más en esta reparación y se enviarán también.` : "";
    const ok = await confirmar(`¿Enviar ahora el presupuesto (${euros(total)}) a ${clienteEmail}?${aviso}`, { titulo: "Enviar al cliente" });
    if (!ok) {
      toast.info("Presupuesto guardado como borrador, sin enviar.");
      return;
    }
    const res = await fetch(`/api/reparaciones/${resguardo}/presupuestos/enviar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: crypto.randomUUID(), canal: "email", modo: "alternativas" }),
    });
    const r = await res.json();
    if (!r.ok) {
      toast.error(`El presupuesto se guardó, pero no se pudo enviar: ${r.error || "error desconocido"}. Usa «Enviar al Cliente».`);
      return;
    }
    toast.success(`Presupuesto enviado a ${clienteEmail}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (enviando) return;
        if (!o) reiniciar();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl sm:max-w-2xl" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DocumentText className="size-5" /> {esEdicion ? "Editar presupuesto" : "Nuevo presupuesto"} — #{resguardo}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh]">
          <div className="space-y-4 pr-3">
            {!esEdicion && (
              <details open={esHp || algunaRapida} className="rounded-lg border border-primary/30 bg-primary/5">
                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-primary">
                  Presupuesto rápido de portátil{esHp ? " (HP)" : ""} <span className="text-xs font-normal text-muted-foreground">· marca las reparaciones y pon el precio de cada una</span>
                </summary>
                <div className="space-y-1.5 border-t px-3 py-2.5">
                  {REPARACIONES_RAPIDAS.map((r) => {
                    const e = rapidas[r.id];
                    return (
                      <div key={r.id} className="flex items-center gap-3">
                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
                          <Checkbox checked={!!e?.marcada} onCheckedChange={(v) => cambiarRapida(r.id, { marcada: v === true })} /> {r.nombre}
                        </label>
                        <div className="flex w-32 items-center gap-1">
                          <DecimalInput className="h-8" disabled={!e?.marcada} value={e?.precio ?? 0} onChange={(n) => cambiarRapida(r.id, { precio: n })} />
                          <span className="text-xs text-muted-foreground">€</span>
                        </div>
                      </div>
                    );
                  })}
                  {algunaRapida && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
                      <span className="text-sm">Total al cliente: <strong>{euros(total)}</strong>{revisionPagada ? " (con -20 € de la revisión)" : ""}</span>
                      <label className="flex cursor-pointer items-center gap-2 text-xs">
                        <Checkbox checked={enviarAlGuardar} onCheckedChange={(v) => setEnviarAlGuardar(v === true)} /> Enviar al cliente por correo al guardar
                      </label>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary">Responsable del Presupuesto</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Responsable *</Label>
                  <Select value={datos.elaboradoPor} onValueChange={(v) => actualizar("elaboradoPor", v || "")}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                    <SelectContent>
                      {empleados.map((e) => <SelectItem key={e.empleadoId} value={e.nombre}>{e.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fechaElaboracionPpto">Fecha de Elaboración *</Label>
                  <Input id="fechaElaboracionPpto" type="date" value={fechaElaboracion} disabled className="bg-muted/50" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="diasEntrega">Días de Reparación *</Label>
                  <Input id="diasEntrega" type="number" min={1} placeholder="Ej: 3" value={datos.diasEntrega} onChange={(e) => actualizar("diasEntrega", parseInt(e.target.value) || 0)} />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descripcion">
                Diagnóstico del equipo (irá al cliente) <span className="text-destructive">*</span>
              </Label>
              <Textarea id="descripcion" rows={2} value={datos.descripcion} onChange={(e) => actualizar("descripcion", e.target.value)} placeholder="Ej: Incluye limpieza profunda y calibración" />
              <p className="text-xs text-muted-foreground">Obligatorio · mínimo 20 caracteres. Detalle que se mostrará al cliente.</p>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-primary">Costos del Presupuesto</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="manoObra">Mano de Obra *</Label>
                  <DecimalInput id="manoObra" value={datos.manoObra} onChange={(n) => actualizar("manoObra", n)} />
                  <p className="text-[11px] text-muted-foreground">
                    {noRequiere ? "Obligatoria (mayor a 0) al no requerir piezas" : "Poner 0 si no aplica"}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Costo Piezas (nuestro)</Label>
                  <Input value={euros(costoPiezas)} disabled className="bg-muted/50" />
                  <p className="text-[11px] text-muted-foreground">Pago al proveedor</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Total al Cliente</Label>
                  <Input value={euros(total)} disabled className="bg-muted/50" />
                  {revisionPagada ? (
                    <p className="text-[11px] font-semibold text-emerald-600">-20€ revisión aplicada</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Mano obra + precio piezas</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Ganancia Neta</Label>
                  <Input value={euros(gananciaNeta)} disabled className="bg-muted/50" />
                  <p className="text-[11px] text-muted-foreground">Total - Costo Piezas</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold">
                ¿Requiere piezas? <span className="text-destructive">*</span>
              </Label>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={noRequiere} onCheckedChange={(v) => v === true && marcarNoRequiere()} />
                  No requiere pieza
                </label>
                <span className="h-4 w-px bg-border" />
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={tieneStock} onCheckedChange={(v) => cambiarSeccionPieza("stock", v === true)} />
                  Pieza en stock
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={tienePedido} onCheckedChange={(v) => cambiarSeccionPieza("pedido", v === true)} />
                  Pieza por pedido
                </label>
              </div>
              <p className="text-xs text-muted-foreground">Puedes añadir piezas de stock, piezas a pedir o ambas a la vez.</p>
            </div>

            {tieneStock && (
              <div className="overflow-hidden rounded-lg border border-sky-500/40">
                <div className="flex items-center justify-between bg-sky-500/10 px-3 py-2">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <Box className="size-4 text-sky-600" /> Piezas en Stock
                  </span>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => setCatalogoAbierto(true)}>
                      <SearchNormal1 className="size-3.5" /> Buscar en catálogo
                    </Button>
                    <Button size="sm" className="h-7 gap-1 bg-emerald-600 text-white hover:bg-emerald-700" onClick={agregarPiezaStock}>
                      <Add className="size-3.5" /> Manual
                    </Button>
                  </div>
                </div>
                <div className="space-y-3 p-3">
                  {piezasStock.map((p, i) => (
                    <div key={i} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-6">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-normal text-muted-foreground">REF</Label>
                        <Input placeholder="REF" value={p.referenciaStock} onChange={(e) => actualizarPieza("stock", i, "referenciaStock", e.target.value.toUpperCase())} />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-[11px] font-normal text-muted-foreground">Nombre de la pieza</Label>
                        <Input placeholder="Nombre de la pieza" value={p.descripcion} onChange={(e) => actualizarPieza("stock", i, "descripcion", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-normal text-muted-foreground">Coste (nuestro)</Label>
                        <DecimalInput placeholder="Coste" value={p.costo} onChange={(n) => actualizarPieza("stock", i, "costo", n)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-normal text-muted-foreground">Precio cliente</Label>
                        <DecimalInput placeholder="Precio cliente" value={p.precio} onChange={(n) => actualizarPieza("stock", i, "precio", n)} />
                      </div>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => quitarPieza("stock", i)}>
                        <Trash className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tienePedido && (
              <div className="overflow-hidden rounded-lg border border-amber-500/40">
                <div className="flex items-center justify-between bg-amber-500/10 px-3 py-2">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <ShoppingCart className="size-4 text-amber-600" /> Piezas a Pedir
                  </span>
                  <Button size="sm" className="h-7 gap-1 bg-emerald-600 text-white hover:bg-emerald-700" onClick={agregarPiezaPedido}>
                    <Add className="size-3.5" /> Agregar Pieza
                  </Button>
                </div>
                <div className="space-y-2 p-3">
                  {piezasPedido.map((p, i) => (
                    <div key={i} className="rounded-md border p-2">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">Pieza #{i + 1}</span>
                        <Button size="icon-sm" variant="ghost" className="text-destructive" onClick={() => quitarPieza("pedido", i)}>
                          <Trash className="size-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-5">
                        <div className="sm:col-span-1 space-y-1">
                          <Label className="text-[11px] font-normal text-muted-foreground">Descripción</Label>
                          <Input placeholder="Descripción" value={p.descripcion} onChange={(e) => actualizarPieza("pedido", i, "descripcion", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-normal text-muted-foreground">Proveedor</Label>
                          <Select value={p.proveedorId} onValueChange={(v) => actualizarPieza("pedido", i, "proveedorId", v || "")}>
                            <SelectTrigger className="w-full">
                              {/* Sin esto, al editar un presupuesto existente el select
                                  muestra el id crudo del proveedor en vez de su nombre —
                                  el popup (y sus SelectItem) no existe en el DOM mientras
                                  está cerrado, así que Select.Value no puede resolverlo solo. */}
                              <SelectValue>
                                {(v: string) => (v ? proveedores.find((pv) => pv.proveedorId === v)?.nombre || v : "Proveedor...")}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {proveedoresParaSelector(proveedores, p.proveedorId).map((pv) => <SelectItem key={pv.proveedorId} value={pv.proveedorId}>{pv.nombre}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-normal text-muted-foreground">Costo (nuestro)</Label>
                          <DecimalInput placeholder="Costo" value={p.costo} onChange={(n) => actualizarPieza("pedido", i, "costo", n)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-normal text-muted-foreground">Precio cliente</Label>
                          <DecimalInput placeholder="Precio cliente" value={p.precio} onChange={(n) => actualizarPieza("pedido", i, "precio", n)} />
                        </div>
                        <div className="col-span-2 sm:col-span-1 space-y-1">
                          <Label className="text-[11px] font-normal text-muted-foreground">Enlace de compra *</Label>
                          <Input placeholder="Enlace *" value={p.enlace} onChange={(e) => actualizarPieza("pedido", i, "enlace", e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="notasPpto">Notas</Label>
              <Textarea id="notasPpto" rows={2} value={datos.notas} onChange={(e) => actualizar("notas", e.target.value)} />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={enviando}>
            {enviando ? "Guardando..." : !esEdicion && algunaRapida && enviarAlGuardar ? "Guardar y enviar al cliente" : "Guardar Borrador"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <BuscarPiezaStockDialog open={catalogoAbierto} onOpenChange={setCatalogoAbierto} onSeleccionar={agregarPiezaDesdeCatalogo} />
    </Dialog>
  );
}
