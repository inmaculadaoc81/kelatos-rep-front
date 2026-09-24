"use client";

import { useEffect, useRef, useState } from "react";
import { Airplane, DocumentUpload, Paperclip2, MoneyRecive, Wallet, Category, Truck } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DecimalInput } from "@/components/ui/decimal-input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { euros } from "@/lib/facturas-recibidas";
import {
  Importacion, FormaLiquidacion, EstadoPagoImportacion, EstadoRevisionImportacion, ETIQUETA_LIQUIDACION,
} from "@/lib/importaciones";

interface Formulario {
  numeroDua: string;
  fechaAceptacion: string;
  fechaLevante: string;
  aduana: string;
  regimen: string;
  paisOrigen: string;
  incoterm: string;
  exportadorNombre: string;
  exportadorPais: string;
  facturaComercial: string;
  agenteAduanas: string;
  agenteNif: string;
  moneda: string;
  tipoCambio: number;
  valorOrigen: number;
  valorAduanaEur: number;
  derechosArancelarios: number;
  otrosGastos: number;
  tipoIva: number;
  cuotaIvaImportacion: number;
  formaLiquidacion: FormaLiquidacion;
  estadoPago: EstadoPagoImportacion;
  fechaPago: string;
  referenciaBancaria: string;
  estadoRevision: EstadoRevisionImportacion;
  observacionesInternas: string;
}

const hoyISO = () => new Date().toISOString().slice(0, 10);
const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const CLASE_IMPORTE = "text-right tabular-nums";

function vacio(): Formulario {
  return {
    numeroDua: "", fechaAceptacion: hoyISO(), fechaLevante: "", aduana: "", regimen: "Importación definitiva (libre práctica)",
    paisOrigen: "", incoterm: "", exportadorNombre: "", exportadorPais: "", facturaComercial: "", agenteAduanas: "", agenteNif: "",
    moneda: "EUR", tipoCambio: 0, valorOrigen: 0, valorAduanaEur: 0, derechosArancelarios: 0, otrosGastos: 0, tipoIva: 21,
    cuotaIvaImportacion: 0, formaLiquidacion: "pago_aduana", estadoPago: "pendiente", fechaPago: "", referenciaBancaria: "",
    estadoRevision: "pendiente", observacionesInternas: "",
  };
}

function desdeImportacion(i: Importacion): Formulario {
  return {
    numeroDua: i.numeroDua, fechaAceptacion: i.fechaAceptacion, fechaLevante: i.fechaLevante || "", aduana: i.aduana, regimen: i.regimen,
    paisOrigen: i.paisOrigen, incoterm: i.incoterm, exportadorNombre: i.exportadorNombre, exportadorPais: i.exportadorPais,
    facturaComercial: i.facturaComercial, agenteAduanas: i.agenteAduanas, agenteNif: i.agenteNif, moneda: i.moneda,
    tipoCambio: i.tipoCambio ?? 0, valorOrigen: i.valorOrigen ?? 0, valorAduanaEur: i.valorAduanaEur,
    derechosArancelarios: i.derechosArancelarios, otrosGastos: i.otrosGastos, tipoIva: i.tipoIva,
    cuotaIvaImportacion: i.cuotaIvaImportacion, formaLiquidacion: i.formaLiquidacion, estadoPago: i.estadoPago,
    fechaPago: i.fechaPago || "", referenciaBancaria: i.referenciaBancaria, estadoRevision: i.estadoRevision,
    observacionesInternas: i.observacionesInternas,
  };
}

function leerBase64(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = () => reject(new Error(`No se pudo leer "${archivo.name}"`));
    r.readAsDataURL(archivo);
  });
}

function Seccion({ titulo, icono: Icono, acento, children }: { titulo: string; icono: React.ElementType; acento?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("overflow-hidden rounded-lg border", acento && "border-emerald-200 dark:border-emerald-900")}>
      <div className={cn("flex items-center gap-2 border-b px-4 py-2.5", acento ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40" : "border-border bg-muted/40")}>
        <Icono className={cn("size-4", acento ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")} />
        <h3 className={cn("text-sm font-semibold", acento && "text-emerald-800 dark:text-emerald-300")}>{titulo}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Campo({ etiqueta, children, className }: { etiqueta: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{etiqueta}</Label>
      {children}
    </div>
  );
}

export function ImportacionFormDialog({
  importacionExistente,
  open,
  onOpenChange,
  onGuardado,
}: {
  importacionExistente: Importacion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuardado: () => void;
}) {
  const esEdicion = !!importacionExistente;
  const [datos, setDatos] = useState<Formulario>(vacio);
  const [cuotaManual, setCuotaManual] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [archivoPendiente, setArchivoPendiente] = useState<File | null>(null);
  const [driveFileId, setDriveFileId] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const inputArchivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDatos(importacionExistente ? desdeImportacion(importacionExistente) : vacio());
    setCuotaManual(!!importacionExistente);
    setArchivoPendiente(null);
    setDriveFileId(importacionExistente?.driveFileId ?? null);
  }, [open, importacionExistente]);

  function set<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setDatos((d) => ({ ...d, [campo]: valor }));
  }

  const baseIva = redondear(datos.valorAduanaEur + datos.derechosArancelarios + datos.otrosGastos);
  const cuotaCalculada = redondear((baseIva * datos.tipoIva) / 100);
  const cuotaEfectiva = cuotaManual ? datos.cuotaIvaImportacion : cuotaCalculada;
  const totalTributos = redondear(datos.derechosArancelarios + cuotaEfectiva);

  async function subirArchivoA(id: number, archivo: File) {
    const base64 = await leerBase64(archivo);
    const res = await fetch(`/api/importaciones/${id}/archivo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64, mimeType: archivo.type || "application/octet-stream", nombre: archivo.name }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "No se pudo subir el archivo");
    return data.importacion.driveFileId as string | null;
  }

  async function manejarArchivo(archivo: File | undefined) {
    if (!archivo) return;
    if (archivo.size > 8 * 1024 * 1024) return toast.error("El archivo no puede superar 8 MB");
    if (!esEdicion) return setArchivoPendiente(archivo);
    setSubiendo(true);
    try {
      setDriveFileId(await subirArchivoA(importacionExistente!.id, archivo));
      toast.success("Archivo adjuntado");
      onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo subir el archivo");
    } finally {
      setSubiendo(false);
    }
  }

  async function guardar() {
    if (!datos.numeroDua.trim()) return toast.error("El nº de DUA / MRN es obligatorio");
    if (!datos.fechaAceptacion) return toast.error("La fecha de aceptación es obligatoria");
    if (!datos.exportadorNombre.trim()) return toast.error("El exportador (proveedor extranjero) es obligatorio");
    if (!(datos.valorAduanaEur > 0)) return toast.error("El valor en aduana (€) es obligatorio");
    setGuardando(true);
    try {
      const cuerpo = {
        ...datos,
        tipoCambio: datos.tipoCambio || null,
        valorOrigen: datos.valorOrigen || null,
        cuotaIvaImportacion: cuotaEfectiva,
      };
      const res = await fetch(esEdicion ? `/api/importaciones/${importacionExistente!.id}` : "/api/importaciones", {
        method: esEdicion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      if (!esEdicion && archivoPendiente) {
        try {
          await subirArchivoA(data.importacion.id, archivoPendiente);
          toast.success(`Importación registrada (${data.importacion.numeroRegistro}) con el archivo adjunto`);
        } catch (e) {
          toast.warning(`Importación registrada (${data.importacion.numeroRegistro}), pero el archivo no se pudo subir: ${e instanceof Error ? e.message : "error"}. Ábrela para reintentarlo.`);
        }
      } else {
        toast.success(esEdicion ? "Importación actualizada" : `Importación registrada (${data.importacion.numeroRegistro})`);
      }
      onOpenChange(false);
      onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !guardando && onOpenChange(o)}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 p-0 sm:max-w-4xl" showCloseButton={!guardando}>
        <div className="flex items-center gap-2 border-b px-5 py-3">
          <Airplane className="size-5 text-emerald-600 dark:text-emerald-400" />
          <DialogTitle className="text-base">
            {esEdicion ? `Importación ${importacionExistente!.numeroRegistro}` : "Nueva importación (DUA)"}
          </DialogTitle>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 p-5">
            <Seccion titulo="Documento aduanero" icono={Category}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Campo etiqueta="Nº de DUA / MRN *" className="sm:col-span-2">
                  <Input value={datos.numeroDua} onChange={(e) => set("numeroDua", e.target.value)} placeholder="26ES00…" />
                </Campo>
                <Campo etiqueta="Fecha de aceptación *">
                  <Input type="date" value={datos.fechaAceptacion} onChange={(e) => set("fechaAceptacion", e.target.value)} />
                </Campo>
                <Campo etiqueta="Fecha de levante">
                  <Input type="date" value={datos.fechaLevante} onChange={(e) => set("fechaLevante", e.target.value)} />
                </Campo>
                <Campo etiqueta="Aduana">
                  <Input value={datos.aduana} onChange={(e) => set("aduana", e.target.value)} placeholder="Madrid Barajas…" />
                </Campo>
                <Campo etiqueta="Régimen" className="sm:col-span-2">
                  <Input value={datos.regimen} onChange={(e) => set("regimen", e.target.value)} />
                </Campo>
                <Campo etiqueta="País de origen">
                  <Input value={datos.paisOrigen} onChange={(e) => set("paisOrigen", e.target.value)} placeholder="China" />
                </Campo>
                <Campo etiqueta="Incoterm">
                  <Input value={datos.incoterm} onChange={(e) => set("incoterm", e.target.value)} placeholder="EXW, FOB, CIF, DAP…" />
                </Campo>
              </div>
            </Seccion>

            <Seccion titulo="Exportador y agente de aduanas" icono={Truck}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Campo etiqueta="Exportador (proveedor extranjero) *" className="sm:col-span-2">
                  <Input value={datos.exportadorNombre} onChange={(e) => set("exportadorNombre", e.target.value)} />
                </Campo>
                <Campo etiqueta="País del exportador">
                  <Input value={datos.exportadorPais} onChange={(e) => set("exportadorPais", e.target.value)} />
                </Campo>
                <Campo etiqueta="Nº de factura comercial">
                  <Input value={datos.facturaComercial} onChange={(e) => set("facturaComercial", e.target.value)} />
                </Campo>
                <Campo etiqueta="Agente de aduanas" className="sm:col-span-2">
                  <Input value={datos.agenteAduanas} onChange={(e) => set("agenteAduanas", e.target.value)} />
                </Campo>
                <Campo etiqueta="NIF del agente">
                  <Input value={datos.agenteNif} onChange={(e) => set("agenteNif", e.target.value)} />
                </Campo>
              </div>
            </Seccion>

            <Seccion titulo="Importes y tributos" icono={MoneyRecive} acento>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Campo etiqueta="Moneda de la factura">
                  <Input value={datos.moneda} onChange={(e) => set("moneda", e.target.value.toUpperCase())} maxLength={5} />
                </Campo>
                <Campo etiqueta="Tipo de cambio">
                  <DecimalInput className={CLASE_IMPORTE} value={datos.tipoCambio} onChange={(n) => set("tipoCambio", n)} />
                </Campo>
                <Campo etiqueta="Valor en origen">
                  <DecimalInput className={CLASE_IMPORTE} value={datos.valorOrigen} onChange={(n) => set("valorOrigen", n)} />
                </Campo>
                <Campo etiqueta="Valor en aduana (€) *">
                  <DecimalInput className={CLASE_IMPORTE} value={datos.valorAduanaEur} onChange={(n) => set("valorAduanaEur", n)} />
                </Campo>
                <Campo etiqueta="Derechos arancelarios (€)">
                  <DecimalInput className={CLASE_IMPORTE} value={datos.derechosArancelarios} onChange={(n) => set("derechosArancelarios", n)} />
                </Campo>
                <Campo etiqueta="Otros gastos en la base (€)">
                  <DecimalInput className={CLASE_IMPORTE} value={datos.otrosGastos} onChange={(n) => set("otrosGastos", n)} />
                </Campo>
                <Campo etiqueta="% IVA">
                  <DecimalInput className={CLASE_IMPORTE} value={datos.tipoIva} onChange={(n) => set("tipoIva", n)} />
                </Campo>
                <Campo etiqueta={cuotaManual ? "IVA importación (manual)" : "IVA importación (calculado)"}>
                  <DecimalInput
                    className={CLASE_IMPORTE}
                    value={cuotaEfectiva}
                    onChange={(n) => { setCuotaManual(true); set("cuotaIvaImportacion", n); }}
                  />
                </Campo>
              </div>
              {cuotaManual && (
                <button type="button" className="mt-1 text-xs text-primary hover:underline" onClick={() => setCuotaManual(false)}>
                  Volver al cálculo automático
                </button>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-950/40">
                <span className="text-emerald-800/80 dark:text-emerald-300/80">
                  Base IVA {euros(baseIva)} · IVA {euros(cuotaEfectiva)} · Derechos {euros(datos.derechosArancelarios)}
                </span>
                <span className="text-base font-semibold tabular-nums text-emerald-800 dark:text-emerald-300">Total tributos {euros(totalTributos)}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                La base del IVA a la importación es el valor en aduana más los derechos y los gastos hasta el primer destino. Si la aduana liquidó una cuota distinta por redondeo, escríbela a mano.
              </p>
            </Seccion>

            <Seccion titulo="Liquidación y pago" icono={Wallet}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Campo etiqueta="Forma de liquidación del IVA" className="sm:col-span-2">
                  <Select value={datos.formaLiquidacion} onValueChange={(v) => v && set("formaLiquidacion", v as FormaLiquidacion)}>
                    <SelectTrigger className="w-full"><SelectValue>{(v: string) => ETIQUETA_LIQUIDACION[v as FormaLiquidacion] ?? v}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ETIQUETA_LIQUIDACION) as FormaLiquidacion[]).map((k) => (
                        <SelectItem key={k} value={k}>{ETIQUETA_LIQUIDACION[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Campo>
                <Campo etiqueta="Estado de pago">
                  <Select value={datos.estadoPago} onValueChange={(v) => v && set("estadoPago", v as EstadoPagoImportacion)}>
                    <SelectTrigger className="w-full"><SelectValue>{(v: string) => (v === "pagada" ? "Pagada" : "Pendiente")}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="pagada">Pagada</SelectItem>
                    </SelectContent>
                  </Select>
                </Campo>
                <Campo etiqueta="Fecha de pago">
                  <Input type="date" value={datos.fechaPago} onChange={(e) => set("fechaPago", e.target.value)} />
                </Campo>
                <Campo etiqueta="Referencia bancaria / justificante" className="sm:col-span-2 lg:col-span-4">
                  <Input value={datos.referenciaBancaria} onChange={(e) => set("referenciaBancaria", e.target.value)} />
                </Campo>
              </div>
            </Seccion>

            <Seccion titulo="Control interno y archivo" icono={DocumentUpload}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo etiqueta="Estado de revisión">
                  <Select value={datos.estadoRevision} onValueChange={(v) => v && set("estadoRevision", v as EstadoRevisionImportacion)}>
                    <SelectTrigger className="w-full"><SelectValue>{(v: string) => (v === "validada" ? "Validada" : "Pendiente de revisión")}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente de revisión</SelectItem>
                      <SelectItem value="validada">Validada</SelectItem>
                    </SelectContent>
                  </Select>
                </Campo>
                <Campo etiqueta="Documento aduanero (PDF o imagen)">
                  <div className="flex flex-wrap items-center gap-2">
                    <input ref={inputArchivo} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => manejarArchivo(e.target.files?.[0])} />
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={subiendo} onClick={() => inputArchivo.current?.click()}>
                      <DocumentUpload className="size-4" /> {subiendo ? "Subiendo…" : archivoPendiente || driveFileId ? "Cambiar archivo" : "Adjuntar archivo"}
                    </Button>
                    {esEdicion && driveFileId && (
                      <a href={`/api/formulario-cliente/archivo/${driveFileId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <Paperclip2 className="size-3.5" /> Ver archivo
                      </a>
                    )}
                    {!esEdicion && archivoPendiente && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Paperclip2 className="size-3.5" /> {archivoPendiente.name}
                        <button type="button" className="text-destructive hover:underline" onClick={() => setArchivoPendiente(null)}>Quitar</button>
                      </span>
                    )}
                  </div>
                </Campo>
                <Campo etiqueta="Observaciones internas" className="sm:col-span-2">
                  <Textarea rows={2} value={datos.observacionesInternas} onChange={(e) => set("observacionesInternas", e.target.value)} />
                </Campo>
              </div>
            </Seccion>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <Button variant="outline" disabled={guardando} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={guardando} onClick={guardar}>{guardando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Registrar importación"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
