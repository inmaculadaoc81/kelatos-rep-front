"use client";

import { useEffect, useRef, useState } from "react";
import { ReceiptItem, ArrowDown2, DocumentUpload, Paperclip2 } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { DecimalInput } from "@/components/ui/decimal-input";
import { toast } from "sonner";
import { Proveedor } from "@/lib/proveedores";
import { ProveedorFormDialog } from "../proveedores/proveedor-form-dialog";
import {
  FacturaRecibida, AlmacenFactura, TipoDocumentoFactura, CategoriaFactura, EstadoPagoFactura,
  ETIQUETA_TIPO_DOCUMENTO, ETIQUETA_CATEGORIA,
} from "@/lib/facturas-recibidas";

interface Formulario {
  proveedorId: string;
  numeroFacturaProveedor: string;
  serieProveedor: string;
  fechaExpedicion: string;
  fechaOperacion: string;
  tipoDocumento: TipoDocumentoFactura | "";
  descripcion: string;
  baseImponible: number;
  tipoIva: number;
  cuotaIvaSoportado: number;
  cuotaIvaDeducible: number;
  importeTotal: number;
  moneda: string;
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
    tipoDocumento: "", descripcion: "", baseImponible: 0, tipoIva: 21, cuotaIvaSoportado: 0, cuotaIvaDeducible: 0, importeTotal: 0, moneda: "EUR",
    retencionIrpf: 0, operacionExenta: false, inversionSujetoPasivo: false, adquisicionIntracomunitaria: false, regimenCriterioCaja: false,
    formaPago: "", fechaVencimiento: "", estadoPago: "pendiente", referenciaBancaria: "",
    categoria: "", almacen: "", pedidoId: "", stockPedidoId: "", centroCoste: "", observacionesInternas: "",
  };
}

function desdeExistente(f: FacturaRecibida): Formulario {
  return {
    proveedorId: f.proveedorId, numeroFacturaProveedor: f.numeroFacturaProveedor, serieProveedor: f.serieProveedor,
    fechaExpedicion: f.fechaExpedicion, fechaOperacion: f.fechaOperacion || "", tipoDocumento: f.tipoDocumento || "",
    descripcion: f.descripcion, baseImponible: f.baseImponible, tipoIva: f.tipoIva ?? 21, cuotaIvaSoportado: f.cuotaIvaSoportado ?? 0,
    cuotaIvaDeducible: f.cuotaIvaDeducible, importeTotal: f.importeTotal, moneda: f.moneda, retencionIrpf: f.retencionIrpf ?? 0,
    operacionExenta: f.operacionExenta, inversionSujetoPasivo: f.inversionSujetoPasivo, adquisicionIntracomunitaria: f.adquisicionIntracomunitaria,
    regimenCriterioCaja: f.regimenCriterioCaja, formaPago: f.formaPago, fechaVencimiento: f.fechaVencimiento || "", estadoPago: f.estadoPago,
    referenciaBancaria: f.referenciaBancaria, categoria: f.categoria || "", almacen: f.almacen || "", pedidoId: f.pedidoId || "",
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

/**
 * Formulario de Facturas Recibidas — organizado en las mismas secciones de
 * la hoja de especificación del usuario. Solo son obligatorios los que esa
 * hoja marca como tal para Kelatos (proveedor, nº de factura del proveedor,
 * fecha de expedición, base imponible, importe total, cuota de IVA
 * deducible — puede ser 0 €); el resto va en "Más campos", plegado por
 * defecto para no abrumar el caso común (ver migración 113).
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
  const [masCampos, setMasCampos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const inputArchivo = useRef<HTMLInputElement>(null);
  const esEdicion = facturaExistente !== null;

  useEffect(() => {
    if (open) {
      setDatos(facturaExistente ? desdeExistente(facturaExistente) : vacio());
      setMasCampos(false);
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
        fechaExpedicion: datos.fechaExpedicion, fechaOperacion: datos.fechaOperacion || undefined, tipoDocumento: datos.tipoDocumento || undefined,
        descripcion: datos.descripcion.trim(), baseImponible: datos.baseImponible, tipoIva: datos.tipoIva || undefined,
        cuotaIvaSoportado: datos.cuotaIvaSoportado || undefined, cuotaIvaDeducible: datos.cuotaIvaDeducible, importeTotal: datos.importeTotal,
        moneda: datos.moneda.trim() || "EUR", retencionIrpf: datos.retencionIrpf || undefined,
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
      toast.success(esEdicion ? "Factura actualizada" : `Factura registrada (${data.factura.numeroRecepcion})`);
      onOpenChange(false);
      onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  async function subirArchivo(archivo: File | undefined) {
    if (!archivo || !facturaExistente) return;
    if (archivo.size > 8 * 1024 * 1024) return toast.error("El archivo no puede superar 8 MB");
    setSubiendoArchivo(true);
    try {
      const base64 = await leerBase64(archivo);
      const res = await fetch(`/api/facturas-recibidas/${facturaExistente.id}/archivo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mimeType: archivo.type || "application/octet-stream", nombre: archivo.name }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
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
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto sm:max-w-2xl" showCloseButton={!enviando}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptItem className="size-5" /> {esEdicion ? `Factura ${facturaExistente!.numeroRecepcion}` : "Nueva factura recibida"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Proveedor */}
            <div className="space-y-1.5">
              <Label>Proveedor *</Label>
              <div className="flex gap-2">
                <Select value={datos.proveedorId} onValueChange={(v) => set("proveedorId", v || "")}>
                  {/* Select.Value no resuelve la etiqueta de un valor precargado (p.ej. al
                      editar una factura existente) salvo que se le indique explícitamente. */}
                  <SelectTrigger className="w-full">
                    <SelectValue>{(v: string) => (v ? proveedores.find((p) => p.proveedorId === v)?.nombre || v : "— Selecciona —")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {proveedores.map((p) => (
                      <SelectItem key={p.proveedorId} value={p.proveedorId}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setNuevoProveedorAbierto(true)}>Nuevo</Button>
              </div>
            </div>

            {/* Identificación */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="frNumero">Nº de factura del proveedor *</Label>
                <Input id="frNumero" value={datos.numeroFacturaProveedor} onChange={(e) => set("numeroFacturaProveedor", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="frFecha">Fecha de expedición *</Label>
                <Input id="frFecha" type="date" value={datos.fechaExpedicion} onChange={(e) => set("fechaExpedicion", e.target.value)} />
              </div>
            </div>

            {/* Importes */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="frBase">Base imponible (€) *</Label>
                <DecimalInput id="frBase" value={datos.baseImponible} onChange={(n) => set("baseImponible", n)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="frTipoIva">% IVA</Label>
                <DecimalInput id="frTipoIva" value={datos.tipoIva} onChange={(n) => {
                  set("tipoIva", n);
                  const cuota = Math.round(datos.baseImponible * n) / 100;
                  set("cuotaIvaSoportado", cuota);
                  set("cuotaIvaDeducible", cuota);
                  set("importeTotal", Math.round((datos.baseImponible + cuota) * 100) / 100);
                }} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="frTotal">Importe total (€) *</Label>
                <DecimalInput id="frTotal" value={datos.importeTotal} onChange={(n) => set("importeTotal", n)} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Almacén</Label>
                <Select value={datos.almacen || "Ninguno"} onValueChange={(v) => set("almacen", v === "servicio" || v === "stock" ? v : "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(v: string) => (v === "servicio" ? "Servicio (pedido ligado a una reparación)" : v === "stock" ? "Stock (reposición de stock)" : "Sin clasificar")}
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

            {/* Pagos (estado siempre visible — es lo que más se consulta) */}
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

            {/* Archivo — solo tiene sentido una vez creada la factura (necesita su id) */}
            {esEdicion && (
              <div className="space-y-1.5 rounded-md border p-3">
                <Label className="text-xs text-muted-foreground">Imagen o PDF de la factura</Label>
                <div className="flex items-center gap-2">
                  <input ref={inputArchivo} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => subirArchivo(e.target.files?.[0])} />
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={subiendoArchivo} onClick={() => inputArchivo.current?.click()}>
                    <DocumentUpload className="size-4" /> {subiendoArchivo ? "Subiendo…" : "Subir archivo"}
                  </Button>
                  {facturaExistente?.driveFileId && (
                    <a href={`/api/formulario-cliente/archivo/${facturaExistente.driveFileId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <Paperclip2 className="size-3.5" /> Ver archivo adjunto
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Resto de campos, condicionales/opcionales según la hoja */}
            <Collapsible open={masCampos} onOpenChange={setMasCampos}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
                Más campos (serie, IRPF, moneda extranjera, criterio de caja, clasificación interna...)
                <ArrowDown2 className={`size-4 transition-transform ${masCampos ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-4 pt-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="frSerie">Serie del proveedor</Label>
                      <Input id="frSerie" value={datos.serieProveedor} onChange={(e) => set("serieProveedor", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="frFechaOp">Fecha de operación</Label>
                      <Input id="frFechaOp" type="date" value={datos.fechaOperacion} onChange={(e) => set("fechaOperacion", e.target.value)} />
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
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="frDescripcion">Descripción de la compra</Label>
                    <Textarea id="frDescripcion" rows={2} value={datos.descripcion} onChange={(e) => set("descripcion", e.target.value)} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="frCuotaSoportado">Cuota de IVA soportado (€)</Label>
                      <DecimalInput id="frCuotaSoportado" value={datos.cuotaIvaSoportado} onChange={(n) => set("cuotaIvaSoportado", n)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="frCuotaDeducible">Cuota de IVA deducible (€)</Label>
                      <DecimalInput id="frCuotaDeducible" value={datos.cuotaIvaDeducible} onChange={(n) => set("cuotaIvaDeducible", n)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="frIrpf">Retención de IRPF (€)</Label>
                      <DecimalInput id="frIrpf" value={datos.retencionIrpf} onChange={(n) => set("retencionIrpf", n)} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="frMoneda">Moneda</Label>
                    <Input id="frMoneda" className="w-24" value={datos.moneda} onChange={(e) => set("moneda", e.target.value.toUpperCase())} />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={datos.operacionExenta} onCheckedChange={(v) => set("operacionExenta", v === true)} /> Operación exenta o no sujeta
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={datos.inversionSujetoPasivo} onCheckedChange={(v) => set("inversionSujetoPasivo", v === true)} /> Inversión del sujeto pasivo
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={datos.adquisicionIntracomunitaria} onCheckedChange={(v) => set("adquisicionIntracomunitaria", v === true)} /> Adquisición intracomunitaria / importación
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={datos.regimenCriterioCaja} onCheckedChange={(v) => set("regimenCriterioCaja", v === true)} /> Régimen especial del criterio de caja
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="frFormaPago">Forma de pago prevista</Label>
                      <Input id="frFormaPago" value={datos.formaPago} onChange={(e) => set("formaPago", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="frVencimiento">Fecha de vencimiento</Label>
                      <Input id="frVencimiento" type="date" value={datos.fechaVencimiento} onChange={(e) => set("fechaVencimiento", e.target.value)} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="frRefBancaria">Referencia bancaria / justificante de pago</Label>
                      <Input id="frRefBancaria" value={datos.referenciaBancaria} onChange={(e) => set("referenciaBancaria", e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="frCentroCoste">Centro de coste / departamento</Label>
                    <Input id="frCentroCoste" value={datos.centroCoste} onChange={(e) => set("centroCoste", e.target.value)} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="frObservaciones">Observaciones internas</Label>
                    <Textarea id="frObservaciones" rows={2} value={datos.observacionesInternas} onChange={(e) => set("observacionesInternas", e.target.value)} />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
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
