"use client";

import { useEffect, useRef, useState } from "react";
import { Book1, DocumentUpload, Paperclip2, Truck, MoneyRecive, Wallet, Category } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DecimalInput } from "@/components/ui/decimal-input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Proveedor } from "@/lib/proveedores";
import { ProveedorFormDialog } from "../proveedores/proveedor-form-dialog";
import {
  FacturaRecibida, AlmacenFactura, TipoDocumentoFactura, CategoriaFactura, EstadoPagoFactura,
  ETIQUETA_TIPO_DOCUMENTO, ETIQUETA_CATEGORIA, euros,
} from "@/lib/facturas-recibidas";

interface Formulario {
  proveedorId: string;
  numeroFacturaProveedor: string;
  serieProveedor: string;
  fechaExpedicion: string;
  fechaOperacion: string;
  fechaRecepcion: string;
  tipoDocumento: TipoDocumentoFactura | "";
  descripcion: string;
  baseImponible: number;
  tipoIva: number;
  cuotaIvaSoportado: number;
  cuotaIvaDeducible: number;
  ivaNoDeducible: number;
  importeTotal: number;
  moneda: string;
  tipoCambio: number;
  importeConvertidoEur: number;
  retencionIrpf: number;
  operacionExenta: boolean;
  inversionSujetoPasivo: boolean;
  adquisicionIntracomunitaria: boolean;
  regimenCriterioCaja: boolean;
  formaPago: string;
  fechaVencimiento: string;
  estadoPago: EstadoPagoFactura;
  referenciaBancaria: string;
  categoria: CategoriaFactura | "";
  almacen: AlmacenFactura | "";
  pedidoId: string;
  stockPedidoId: string;
  centroCoste: string;
  observacionesInternas: string;
}

function vacio(): Formulario {
  return {
    proveedorId: "", numeroFacturaProveedor: "", serieProveedor: "", fechaExpedicion: new Date().toISOString().slice(0, 10), fechaOperacion: "",
    fechaRecepcion: new Date().toISOString().slice(0, 10), tipoDocumento: "", descripcion: "", baseImponible: 0, tipoIva: 21, cuotaIvaSoportado: 0,
    cuotaIvaDeducible: 0, ivaNoDeducible: 0, importeTotal: 0, moneda: "EUR", tipoCambio: 0, importeConvertidoEur: 0, retencionIrpf: 0,
    operacionExenta: false, inversionSujetoPasivo: false, adquisicionIntracomunitaria: false, regimenCriterioCaja: false,
    formaPago: "", fechaVencimiento: "", estadoPago: "pendiente", referenciaBancaria: "",
    categoria: "", almacen: "", pedidoId: "", stockPedidoId: "", centroCoste: "", observacionesInternas: "",
  };
}

function desdeExistente(f: FacturaRecibida): Formulario {
  return {
    proveedorId: f.proveedorId, numeroFacturaProveedor: f.numeroFacturaProveedor, serieProveedor: f.serieProveedor,
    fechaExpedicion: f.fechaExpedicion, fechaOperacion: f.fechaOperacion || "", fechaRecepcion: f.fechaRecepcion,
    tipoDocumento: f.tipoDocumento || "", descripcion: f.descripcion, baseImponible: f.baseImponible, tipoIva: f.tipoIva ?? 21,
    cuotaIvaSoportado: f.cuotaIvaSoportado ?? 0, cuotaIvaDeducible: f.cuotaIvaDeducible, ivaNoDeducible: f.ivaNoDeducible ?? 0,
    importeTotal: f.importeTotal, moneda: f.moneda, tipoCambio: f.tipoCambio ?? 0, importeConvertidoEur: f.importeConvertidoEur ?? 0,
    retencionIrpf: f.retencionIrpf ?? 0, operacionExenta: f.operacionExenta, inversionSujetoPasivo: f.inversionSujetoPasivo,
    adquisicionIntracomunitaria: f.adquisicionIntracomunitaria, regimenCriterioCaja: f.regimenCriterioCaja, formaPago: f.formaPago,
    fechaVencimiento: f.fechaVencimiento || "", estadoPago: f.estadoPago, referenciaBancaria: f.referenciaBancaria,
    categoria: f.categoria || "", almacen: f.almacen || "", pedidoId: f.pedidoId || "",
    stockPedidoId: f.stockPedidoId ? String(f.stockPedidoId) : "", centroCoste: f.centroCoste, observacionesInternas: f.observacionesInternas,
  };
}

function leerBase64(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error(`No se pudo leer "${archivo.name}"`));
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.readAsDataURL(archivo);
  });
}

/** Cada sección se ve como un panel propio (cabecera con icono + cuerpo con
    fondo de tarjeta) en vez de un simple título — con 20+ campos en un solo
    diálogo, la separación visual es lo que evita que se lea como una pared
    de inputs. La de Importes lleva además un acento verde: es el bloque que
    de verdad hay que revisar antes de registrar. */
function Seccion({
  titulo, icono: Icono, acento, className, children,
}: {
  titulo: string;
  icono: React.ElementType;
  acento?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border", acento && "border-emerald-200 dark:border-emerald-900", className)}>
      <div className={cn(
        "flex items-center gap-2 border-b px-4 py-2.5",
        acento ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40" : "border-border bg-muted/40"
      )}>
        <Icono className={cn("size-4", acento ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")} />
        <h3 className={cn("text-sm font-semibold", acento && "text-emerald-800 dark:text-emerald-300")}>{titulo}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

const CLASE_IMPORTE = "text-right tabular-nums";

/**
 * Formulario de Facturas Recibidas — todas las secciones de la hoja de
 * especificación del usuario visibles a la vez (sin plegar nada), en un
 * diálogo ancho para poder revisarlas de un vistazo antes de registrar.
 * Solo son obligatorios proveedor, nº de factura del proveedor, fecha de
 * expedición, base imponible e importe total (mismo criterio que pide la
 * hoja); el resto es condicional/opcional según la migración 113.
 */
export function FacturaRecibidaFormDialog({
  facturaExistente,
  open,
  onOpenChange,
  onGuardado,
}: {
  facturaExistente: FacturaRecibida | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuardado: () => void;
}) {
  const [datos, setDatos] = useState<Formulario>(() => (facturaExistente ? desdeExistente(facturaExistente) : vacio()));
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [nuevoProveedorAbierto, setNuevoProveedorAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  // Separado de `facturaExistente` (prop): tras subir un archivo, el padre
  // solo recarga la LISTA — este diálogo sigue abierto con la misma prop
  // vieja, así que sin este estado propio el enlace "Ver archivo adjunto"
  // nunca aparecería hasta cerrar y reabrir.
  const [driveFileId, setDriveFileId] = useState<string | null>(null);
  // Al crear una factura nueva todavía no hay id, así que el archivo no se
  // puede subir hasta que exista el registro — se queda "en espera" aquí y
  // se sube justo después de que guardar() cree la factura (ver más abajo).
  const [archivoPendiente, setArchivoPendiente] = useState<File | null>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);
  const esEdicion = facturaExistente !== null;

  useEffect(() => {
    if (open) {
      setDatos(facturaExistente ? desdeExistente(facturaExistente) : vacio());
      setDriveFileId(facturaExistente?.driveFileId ?? null);
      setArchivoPendiente(null);
    }
  }, [open, facturaExistente]);

  function cargarProveedores() {
    fetch("/api/proveedores")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setProveedores(d.proveedores); })
      .catch(() => {});
  }
  useEffect(() => {
    if (open) cargarProveedores();
  }, [open]);

  function set<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  async function guardar() {
    if (!datos.proveedorId) return toast.error("Selecciona el proveedor");
    if (!datos.numeroFacturaProveedor.trim()) return toast.error("El número de factura del proveedor es obligatorio");
    if (!datos.fechaExpedicion) return toast.error("La fecha de expedición es obligatoria");
    if (!datos.baseImponible) return toast.error("La base imponible es obligatoria");
    if (!datos.importeTotal) return toast.error("El importe total es obligatorio");

    setEnviando(true);
    try {
      const payload = {
        proveedorId: datos.proveedorId, numeroFacturaProveedor: datos.numeroFacturaProveedor.trim(), serieProveedor: datos.serieProveedor.trim(),
        fechaExpedicion: datos.fechaExpedicion, fechaOperacion: datos.fechaOperacion || undefined, fechaRecepcion: datos.fechaRecepcion || undefined,
        tipoDocumento: datos.tipoDocumento || undefined, descripcion: datos.descripcion.trim(), baseImponible: datos.baseImponible,
        tipoIva: datos.tipoIva || undefined, cuotaIvaSoportado: datos.cuotaIvaSoportado || undefined, cuotaIvaDeducible: datos.cuotaIvaDeducible,
        ivaNoDeducible: datos.ivaNoDeducible || undefined, importeTotal: datos.importeTotal, moneda: datos.moneda.trim() || "EUR",
        tipoCambio: datos.tipoCambio || undefined, importeConvertidoEur: datos.importeConvertidoEur || undefined,
        retencionIrpf: datos.retencionIrpf || undefined,
        operacionExenta: datos.operacionExenta, inversionSujetoPasivo: datos.inversionSujetoPasivo,
        adquisicionIntracomunitaria: datos.adquisicionIntracomunitaria, regimenCriterioCaja: datos.regimenCriterioCaja,
        formaPago: datos.formaPago.trim(), fechaVencimiento: datos.fechaVencimiento || undefined, estadoPago: datos.estadoPago,
        referenciaBancaria: datos.referenciaBancaria.trim(), categoria: datos.categoria || undefined, almacen: datos.almacen || undefined,
        pedidoId: datos.pedidoId.trim() || undefined, stockPedidoId: datos.stockPedidoId ? Number(datos.stockPedidoId) : undefined,
        centroCoste: datos.centroCoste.trim(), observacionesInternas: datos.observacionesInternas.trim(),
      };
      const url = esEdicion ? `/api/facturas-recibidas/${facturaExistente!.id}` : "/api/facturas-recibidas";
      const res = await fetch(url, {
        method: esEdicion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      if (data.factura.posibleDuplicado) toast.warning(`Aviso: ya existe otra factura del mismo proveedor con el número "${datos.numeroFacturaProveedor}"`);

      if (!esEdicion && archivoPendiente) {
        try {
          await subirArchivoA(data.factura.id, archivoPendiente);
          toast.success(`Factura registrada (${data.factura.numeroRecepcion}) con el archivo adjunto`);
        } catch (e) {
          toast.warning(`Factura registrada (${data.factura.numeroRecepcion}), pero el archivo no se pudo subir: ${e instanceof Error ? e.message : "error desconocido"}. Ábrela de nuevo para reintentarlo.`);
        }
      } else {
        toast.success(esEdicion ? "Factura actualizada" : `Factura registrada (${data.factura.numeroRecepcion})`);
      }
      onOpenChange(false);
      onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  async function subirArchivoA(id: number, archivo: File): Promise<string> {
    const base64 = await leerBase64(archivo);
    const res = await fetch(`/api/facturas-recibidas/${id}/archivo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64, mimeType: archivo.type || "application/octet-stream", nombre: archivo.name }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Error desconocido");
    return data.factura.driveFileId as string;
  }

  async function manejarArchivoSeleccionado(archivo: File | undefined) {
    if (!archivo) return;
    if (archivo.size > 8 * 1024 * 1024) {
      toast.error("El archivo no puede superar 8 MB");
      if (inputArchivo.current) inputArchivo.current.value = "";
      return;
    }
    // Sin id todavía (factura nueva) — se sube automáticamente al registrar.
    if (!esEdicion) {
      setArchivoPendiente(archivo);
      return;
    }
    setSubiendoArchivo(true);
    try {
      const nuevoId = await subirArchivoA(facturaExistente!.id, archivo);
      setDriveFileId(nuevoId);
      toast.success("Archivo adjuntado");
      onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSubiendoArchivo(false);
      if (inputArchivo.current) inputArchivo.current.value = "";
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !enviando && onOpenChange(o)}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto lg:max-w-5xl" showCloseButton={!enviando}>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3 pr-6">
              <span className="flex items-center gap-2">
                <Book1 className="size-5" /> {esEdicion ? `Factura ${facturaExistente!.numeroRecepcion}` : "Nueva factura recibida"}
              </span>
              {datos.importeTotal > 0 && (
                <span className="text-base font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{euros(datos.importeTotal)}</span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Seccion titulo="Proveedor y factura" icono={Truck}>
              <div className="space-y-1.5">
                <Label>Proveedor *</Label>
                <div className="flex gap-2">
                  <Select value={datos.proveedorId} onValueChange={(v) => set("proveedorId", v || "")}>
                    {/* Select.Value no resuelve la etiqueta de un valor precargado (p.ej. al
                        editar una factura existente) salvo que se le indique explícitamente. */}
                    <SelectTrigger className="w-full max-w-sm">
                      <SelectValue>{(v: string) => (v ? proveedores.find((p) => p.proveedorId === v)?.nombre || v : "— Selecciona —")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {proveedores.map((p) => (
                        <SelectItem key={p.proveedorId} value={p.proveedorId}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setNuevoProveedorAbierto(true)}>Nuevo proveedor</Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="frNumero">Nº de factura del proveedor *</Label>
                  <Input id="frNumero" value={datos.numeroFacturaProveedor} onChange={(e) => set("numeroFacturaProveedor", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="frSerie">Serie del proveedor</Label>
                  <Input id="frSerie" value={datos.serieProveedor} onChange={(e) => set("serieProveedor", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="frFecha">Fecha de expedición *</Label>
                  <Input id="frFecha" type="date" value={datos.fechaExpedicion} onChange={(e) => set("fechaExpedicion", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="frFechaOp">Fecha de operación</Label>
                  <Input id="frFechaOp" type="date" value={datos.fechaOperacion} onChange={(e) => set("fechaOperacion", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="frFechaRecepcion">Fecha de recepción</Label>
                  <Input id="frFechaRecepcion" type="date" value={datos.fechaRecepcion} onChange={(e) => set("fechaRecepcion", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de documento</Label>
                  <Select value={datos.tipoDocumento || "Ninguno"} onValueChange={(v) => set("tipoDocumento", (v && v in ETIQUETA_TIPO_DOCUMENTO ? v : "") as TipoDocumentoFactura | "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{(v: string) => (v in ETIQUETA_TIPO_DOCUMENTO ? ETIQUETA_TIPO_DOCUMENTO[v as TipoDocumentoFactura] : "Sin especificar")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ninguno">Sin especificar</SelectItem>
                      {(Object.keys(ETIQUETA_TIPO_DOCUMENTO) as TipoDocumentoFactura[]).map((t) => (
                        <SelectItem key={t} value={t}>{ETIQUETA_TIPO_DOCUMENTO[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                  <Label htmlFor="frDescripcion">Descripción de la compra</Label>
                  <Input id="frDescripcion" value={datos.descripcion} onChange={(e) => set("descripcion", e.target.value)} />
                </div>
              </div>
            </Seccion>

            <Seccion titulo="Importes e impuestos" icono={MoneyRecive} acento>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="frBase">Base imponible (€) *</Label>
                  <DecimalInput id="frBase" className={CLASE_IMPORTE} value={datos.baseImponible} onChange={(n) => set("baseImponible", n)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="frTipoIva">% IVA</Label>
                  <DecimalInput id="frTipoIva" className={CLASE_IMPORTE} value={datos.tipoIva} onChange={(n) => {
                    set("tipoIva", n);
                    const cuota = Math.round(datos.baseImponible * n) / 100;
                    set("cuotaIvaSoportado", cuota);
                    set("cuotaIvaDeducible", cuota);
                    set("importeTotal", Math.round((datos.baseImponible + cuota) * 100) / 100);
                  }} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="frCuotaSoportado">Cuota de IVA soportado (€)</Label>
                  <DecimalInput id="frCuotaSoportado" className={CLASE_IMPORTE} value={datos.cuotaIvaSoportado} onChange={(n) => set("cuotaIvaSoportado", n)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="frCuotaDeducible">Cuota de IVA deducible (€) *</Label>
                  <DecimalInput id="frCuotaDeducible" className={CLASE_IMPORTE} value={datos.cuotaIvaDeducible} onChange={(n) => set("cuotaIvaDeducible", n)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="frIvaNoDeducible">IVA no deducible (€)</Label>
                  <DecimalInput id="frIvaNoDeducible" className={CLASE_IMPORTE} value={datos.ivaNoDeducible} onChange={(n) => set("ivaNoDeducible", n)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="frTotal">Importe total (€) *</Label>
                  <DecimalInput id="frTotal" className={cn(CLASE_IMPORTE, "font-semibold")} value={datos.importeTotal} onChange={(n) => set("importeTotal", n)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="frIrpf">Retención de IRPF (€)</Label>
                  <DecimalInput id="frIrpf" className={CLASE_IMPORTE} value={datos.retencionIrpf} onChange={(n) => set("retencionIrpf", n)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="frMoneda">Moneda</Label>
                  <Input id="frMoneda" value={datos.moneda} onChange={(e) => set("moneda", e.target.value.toUpperCase())} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="frTipoCambio">Tipo de cambio</Label>
                  <DecimalInput id="frTipoCambio" className={CLASE_IMPORTE} value={datos.tipoCambio} onChange={(n) => set("tipoCambio", n)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="frConvertidoEur">Importe convertido a EUR (€)</Label>
                  <DecimalInput id="frConvertidoEur" className={CLASE_IMPORTE} value={datos.importeConvertidoEur} onChange={(n) => set("importeConvertidoEur", n)} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-950/40">
                <span className="text-emerald-800/80 dark:text-emerald-300/80">
                  Base {euros(datos.baseImponible)} + IVA {euros(datos.cuotaIvaSoportado)}
                </span>
                <span className="text-base font-semibold tabular-nums text-emerald-800 dark:text-emerald-300">= {euros(datos.importeTotal)}</span>
              </div>

              <div className="mt-4 rounded-md border border-dashed p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Indicadores fiscales — marcar solo si aplica</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox checked={datos.operacionExenta} onCheckedChange={(v) => set("operacionExenta", v === true)} /> Operación exenta o no sujeta
                  </label>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox checked={datos.inversionSujetoPasivo} onCheckedChange={(v) => set("inversionSujetoPasivo", v === true)} /> Inversión del sujeto pasivo
                  </label>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox checked={datos.adquisicionIntracomunitaria} onCheckedChange={(v) => set("adquisicionIntracomunitaria", v === true)} /> Adquisición intracomunitaria / importación
                  </label>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox checked={datos.regimenCriterioCaja} onCheckedChange={(v) => set("regimenCriterioCaja", v === true)} /> Régimen especial del criterio de caja
                  </label>
                </div>
              </div>
            </Seccion>

            <Seccion titulo="Pagos" icono={Wallet}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="frFormaPago">Forma de pago prevista</Label>
                  <Input id="frFormaPago" value={datos.formaPago} onChange={(e) => set("formaPago", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Estado de pago</Label>
                  <Select value={datos.estadoPago} onValueChange={(v) => set("estadoPago", (v || "pendiente") as EstadoPagoFactura)}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{(v: string) => (v === "parcial" ? "Parcial" : v === "pagada" ? "Pagada" : "Pendiente")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="parcial">Parcial</SelectItem>
                      <SelectItem value="pagada">Pagada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="frVencimiento">Fecha de vencimiento</Label>
                  <Input id="frVencimiento" type="date" value={datos.fechaVencimiento} onChange={(e) => set("fechaVencimiento", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="frRefBancaria">Referencia bancaria / justificante</Label>
                  <Input id="frRefBancaria" value={datos.referenciaBancaria} onChange={(e) => set("referenciaBancaria", e.target.value)} />
                </div>
              </div>
            </Seccion>

            <Seccion titulo="Clasificación y control interno" icono={Category}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>Almacén</Label>
                  <Select value={datos.almacen || "Ninguno"} onValueChange={(v) => set("almacen", v === "servicio" || v === "stock" ? v : "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(v: string) => (v === "servicio" ? "Servicio" : v === "stock" ? "Stock" : "Sin clasificar")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ninguno">Sin clasificar</SelectItem>
                      <SelectItem value="servicio">Servicio (pedido ligado a una reparación)</SelectItem>
                      <SelectItem value="stock">Stock (reposición de stock)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Categoría</Label>
                  <Select value={datos.categoria || "Ninguna"} onValueChange={(v) => set("categoria", (v && v in ETIQUETA_CATEGORIA ? v : "") as CategoriaFactura | "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{(v: string) => (v in ETIQUETA_CATEGORIA ? ETIQUETA_CATEGORIA[v as CategoriaFactura] : "Sin clasificar")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ninguna">Sin clasificar</SelectItem>
                      {(Object.keys(ETIQUETA_CATEGORIA) as CategoriaFactura[]).map((c) => (
                        <SelectItem key={c} value={c}>{ETIQUETA_CATEGORIA[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {datos.almacen === "servicio" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="frPedido">Resguardo / pedido de servicio</Label>
                    <Input id="frPedido" placeholder="p.ej. PED-0123" value={datos.pedidoId} onChange={(e) => set("pedidoId", e.target.value)} />
                  </div>
                )}
                {datos.almacen === "stock" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="frStockPedido">Id de pedido de stock</Label>
                    <Input id="frStockPedido" type="number" value={datos.stockPedidoId} onChange={(e) => set("stockPedidoId", e.target.value)} />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="frCentroCoste">Centro de coste / departamento</Label>
                  <Input id="frCentroCoste" value={datos.centroCoste} onChange={(e) => set("centroCoste", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
                  <Label htmlFor="frObservaciones">Observaciones internas</Label>
                  <Textarea id="frObservaciones" rows={2} value={datos.observacionesInternas} onChange={(e) => set("observacionesInternas", e.target.value)} />
                </div>
              </div>
            </Seccion>

            <Seccion titulo="Archivo" icono={DocumentUpload}>
              <div className="flex items-center gap-2">
                <input ref={inputArchivo} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => manejarArchivoSeleccionado(e.target.files?.[0])} />
                <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={subiendoArchivo} onClick={() => inputArchivo.current?.click()}>
                  <DocumentUpload className="size-4" /> {subiendoArchivo ? "Subiendo…" : esEdicion ? "Subir archivo" : archivoPendiente ? "Cambiar archivo" : "Adjuntar archivo"}
                </Button>
                {esEdicion && driveFileId && (
                  <a href={`/api/formulario-cliente/archivo/${driveFileId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <Paperclip2 className="size-3.5" /> Ver archivo adjunto
                  </a>
                )}
                {!esEdicion && archivoPendiente && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Paperclip2 className="size-3.5" /> {archivoPendiente.name}
                    <button type="button" className="text-destructive hover:underline" onClick={() => setArchivoPendiente(null)}>Quitar</button>
                  </span>
                )}
                {!esEdicion && !archivoPendiente && (
                  <span className="text-xs text-muted-foreground">Se subirá al registrar la factura</span>
                )}
              </div>
            </Seccion>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>Cancelar</Button>
            <Button onClick={guardar} disabled={enviando}>{enviando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Registrar factura"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProveedorFormDialog
        proveedorExistente={null}
        open={nuevoProveedorAbierto}
        onOpenChange={setNuevoProveedorAbierto}
        onGuardado={(p) => { cargarProveedores(); set("proveedorId", p.proveedorId); }}
      />
    </>
  );
}
