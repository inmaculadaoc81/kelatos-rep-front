"use client";

import { useEffect, useRef, useState } from "react";
import { Book1, DocumentUpload, Paperclip2, Truck, MoneyRecive, Wallet, Category, Warning2, Trash, MagicStar, Refresh2, ExportSquare, TickCircle, CloseCircle } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DecimalInput } from "@/components/ui/decimal-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Proveedor } from "@/lib/proveedores";
import { ProveedorFormDialog } from "../proveedores/proveedor-form-dialog";
import { BuscarPedidoServicioDialog } from "./buscar-pedido-servicio-dialog";
import { BuscarPedidoStockDialog } from "./buscar-pedido-stock-dialog";
import { BuscarFacturaRectificadaDialog } from "./buscar-factura-rectificada-dialog";
import { EliminarRegistroDialog } from "@/components/eliminar-registro-dialog";
import { useEsSuperadmin } from "@/hooks/use-es-superadmin";
import type { CompraFila } from "@/lib/compras";
import type { PedidoStockBusqueda } from "@/app/api/stock-piezas/pedidos/buscar/route";
import type { FacturaOcrExtraido } from "@/app/api/facturas-recibidas/ocr/route";
import {
  FacturaRecibida, EnlaceFactura, AlmacenFactura, TipoDocumentoFactura, CategoriaFactura, EstadoPagoFactura, EstadoRevisionFactura,
  ETIQUETA_TIPO_DOCUMENTO, ETIQUETA_CATEGORIA, euros,
} from "@/lib/facturas-recibidas";

/** Prefill desde el botón "Registrar factura" de la pantalla de Compras —
    solo llega cuando se crea una factura nueva. `costo` es un único número
    de tratamiento fiscal desconocido, así que NO se reparte automáticamente
    en base+IVA: se precarga igual en base y total y se avisa al usuario. */
export interface BorradorFactura {
  proveedorId: string;
  pedidoId: string;
  baseImponible: number;
  importeTotal: number;
}

interface Formulario {
  proveedorId: string;
  numeroFacturaProveedor: string;
  serieProveedor: string;
  fechaExpedicion: string;
  fechaOperacion: string;
  fechaRecepcion: string;
  tipoDocumento: TipoDocumentoFactura | "";
  facturaRectificadaId: number | null;
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
  estadoRevision: EstadoRevisionFactura;
  duplicadoConfirmado: boolean;
  observacionesInternas: string;
}

function vacio(borrador?: BorradorFactura): Formulario {
  return {
    proveedorId: borrador?.proveedorId || "", numeroFacturaProveedor: "", serieProveedor: "",
    fechaExpedicion: new Date().toISOString().slice(0, 10), fechaOperacion: "",
    fechaRecepcion: new Date().toISOString().slice(0, 10), tipoDocumento: "", facturaRectificadaId: null, descripcion: "",
    baseImponible: borrador?.baseImponible || 0, tipoIva: 21, cuotaIvaSoportado: 0,
    cuotaIvaDeducible: 0, ivaNoDeducible: 0, importeTotal: borrador?.importeTotal || 0, moneda: "EUR", tipoCambio: 0, importeConvertidoEur: 0, retencionIrpf: 0,
    operacionExenta: false, inversionSujetoPasivo: false, adquisicionIntracomunitaria: false, regimenCriterioCaja: false,
    formaPago: "", fechaVencimiento: "", estadoPago: "pendiente", referenciaBancaria: "",
    categoria: "", almacen: borrador ? "servicio" : "", pedidoId: borrador?.pedidoId || "", stockPedidoId: "",
    centroCoste: "", estadoRevision: "pendiente", duplicadoConfirmado: false, observacionesInternas: "",
  };
}

function desdeExistente(f: FacturaRecibida): Formulario {
  return {
    proveedorId: f.proveedorId, numeroFacturaProveedor: f.numeroFacturaProveedor, serieProveedor: f.serieProveedor,
    fechaExpedicion: f.fechaExpedicion, fechaOperacion: f.fechaOperacion || "", fechaRecepcion: f.fechaRecepcion,
    tipoDocumento: f.tipoDocumento || "", facturaRectificadaId: f.facturaRectificadaId, descripcion: f.descripcion,
    baseImponible: f.baseImponible, tipoIva: f.tipoIva ?? 21,
    cuotaIvaSoportado: f.cuotaIvaSoportado ?? 0, cuotaIvaDeducible: f.cuotaIvaDeducible, ivaNoDeducible: f.ivaNoDeducible ?? 0,
    importeTotal: f.importeTotal, moneda: f.moneda, tipoCambio: f.tipoCambio ?? 0, importeConvertidoEur: f.importeConvertidoEur ?? 0,
    retencionIrpf: f.retencionIrpf ?? 0, operacionExenta: f.operacionExenta, inversionSujetoPasivo: f.inversionSujetoPasivo,
    adquisicionIntracomunitaria: f.adquisicionIntracomunitaria, regimenCriterioCaja: f.regimenCriterioCaja, formaPago: f.formaPago,
    fechaVencimiento: f.fechaVencimiento || "", estadoPago: f.estadoPago, referenciaBancaria: f.referenciaBancaria,
    categoria: f.categoria || "", almacen: f.almacen || "", pedidoId: f.pedidoId || "",
    stockPedidoId: f.stockPedidoId ? String(f.stockPedidoId) : "", centroCoste: f.centroCoste,
    estadoRevision: f.estadoRevision, duplicadoConfirmado: f.duplicadoConfirmado, observacionesInternas: f.observacionesInternas,
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

/** Valor elegido vía un picker (proveedor real, pedido real, factura real)
    en vez de texto libre — muestra el valor de solo lectura + Buscar/Quitar. */
function CampoBuscable({
  etiqueta, valor, onBuscar, onQuitar, deshabilitado,
}: {
  etiqueta: string;
  valor: string | null;
  onBuscar: () => void;
  onQuitar?: () => void;
  deshabilitado?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{etiqueta}</Label>
      <div className="flex items-center gap-2">
        <div className={cn("flex h-9 flex-1 items-center truncate rounded-md border bg-muted/30 px-3 text-sm", valor ? "text-foreground" : "text-muted-foreground")}>
          {valor || "Sin vincular"}
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={deshabilitado} onClick={onBuscar}>Buscar</Button>
        {valor && onQuitar && (
          <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={onQuitar}>Quitar</Button>
        )}
      </div>
    </div>
  );
}

/** Fila del resumen de "Leer con IA" — check verde si se encontró el dato,
    aspa gris si no, para ver de un vistazo qué faltó rellenar a mano.
    `incierto` marca un campo que la propia IA (o la verificación de cuadre
    base+IVA=total del backend) no da por seguro — se pinta en ámbar con un
    aviso explícito en vez del check verde, para que no pase desapercibido. */
function CampoResumen({ etiqueta, valor, advertencia, incierto }: { etiqueta: string; valor: string | null; advertencia?: string; incierto?: boolean }) {
  const encontrado = !!valor;
  return (
    <div className="flex items-start gap-1.5">
      {incierto ? (
        <Warning2 className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
      ) : encontrado ? (
        <TickCircle className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <CloseCircle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/40" />
      )}
      <span>
        <span className="text-muted-foreground">{etiqueta}:</span>{" "}
        {encontrado ? <span className="font-medium text-foreground">{valor}</span> : <span className="text-muted-foreground/70">no encontrado</span>}
        {advertencia && <span className="block text-amber-600 dark:text-amber-400">{advertencia}</span>}
        {incierto && !advertencia && <span className="block text-amber-600 dark:text-amber-400">la IA no está segura — revísalo con el original</span>}
      </span>
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
  borrador,
}: {
  facturaExistente: FacturaRecibida | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuardado: () => void;
  /** Prefill desde Compras al registrar la factura de un pedido "Recibido". */
  borrador?: BorradorFactura;
}) {
  const [datos, setDatos] = useState<Formulario>(() => (facturaExistente ? desdeExistente(facturaExistente) : vacio(borrador)));
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [nuevoProveedorAbierto, setNuevoProveedorAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [descartandoDuplicado, setDescartandoDuplicado] = useState(false);
  const [buscarPedidoServicioAbierto, setBuscarPedidoServicioAbierto] = useState(false);
  const [buscarPedidoStockAbierto, setBuscarPedidoStockAbierto] = useState(false);
  const [buscarRectificadaAbierto, setBuscarRectificadaAbierto] = useState(false);
  const [eliminarAbierto, setEliminarAbierto] = useState(false);
  // Solo se conoce un label bonito ("REC-000012") justo después de elegir la
  // factura en el picker — si ya venía guardada de antes, solo se sabe el id
  // numérico, así que se muestra "Factura #N" como respaldo (ver más abajo).
  const [facturaRectificadaLabel, setFacturaRectificadaLabel] = useState<string | null>(null);
  const esSuperadmin = useEsSuperadmin();
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
  // Independiente del "Adjuntar archivo" (Drive) — leer con IA es solo una
  // lectura para precargar el formulario, no implica guardar ni subir nada.
  const [leyendoOcr, setLeyendoOcr] = useState(false);
  const [segundosLecturaOcr, setSegundosLecturaOcr] = useState(0);
  const [origenAutomatico, setOrigenAutomatico] = useState(false);
  // Recap de lo que la IA encontró en la última lectura — para verlo de un
  // vistazo sin tener que rastrear cada campo del formulario uno a uno.
  const [resumenOcr, setResumenOcr] = useState<{ extraido: FacturaOcrExtraido; proveedorEncontrado: boolean } | null>(null);
  // Si la IA marcó campos como inciertos, exige un vistazo explícito del
  // usuario antes de dejar registrar — así una lectura mal hecha no se
  // convierte en un registro real sin que nadie la haya comprobado.
  const [advertenciasVistas, setAdvertenciasVistas] = useState(false);
  const inputOcr = useRef<HTMLInputElement>(null);
  // Controlador de la petición de OCR en curso — sin esto, cerrar el
  // diálogo mientras "Leyendo con IA" seguía corriendo dejaba el fetch vivo
  // en segundo plano: al reabrir (misma factura u otra distinta) el estado
  // leyendoOcr no se reiniciaba (seguía mostrando "Leyendo…" de la lectura
  // vieja, sin archivo) y, si esa lectura huérfana terminaba de responder,
  // podía sobrescribir los campos del formulario que estuviera abierto en
  // ese momento. Bug real reportado, 2026-09-23: "cerré el modal y volví a
  // entrar, sigue cargando la IA pero mi archivo no está".
  const ocrAbortRef = useRef<AbortController | null>(null);
  const esEdicion = facturaExistente !== null;
  // Pedidos enlazados (una factura puede cubrir varios — migración 119): copia local para poder quitar enlaces sin cerrar el diálogo.
  const [enlaces, setEnlaces] = useState<EnlaceFactura[]>([]);
  const [quitandoEnlace, setQuitandoEnlace] = useState<number | null>(null);

  // Vista previa a la derecha: el archivo recién elegido (todavía sin subir,
  // factura nueva) o el ya guardado en Drive (edición) — object URL propio
  // para el primer caso, se revoca al cambiar para no acumular memoria.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (archivoPendiente) {
      const url = URL.createObjectURL(archivoPendiente);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    if (esEdicion && driveFileId) {
      setPreviewUrl(`/api/formulario-cliente/archivo/${driveFileId}`);
      return;
    }
    setPreviewUrl(null);
  }, [archivoPendiente, driveFileId, esEdicion]);

  // Un contador visible durante la lectura (puede tardar ~20-30s con IA
  // local) — sin esto, el botón deshabilitado varios segundos se ve como
  // si se hubiera quedado colgado.
  useEffect(() => {
    if (!leyendoOcr) { setSegundosLecturaOcr(0); return; }
    const inicio = Date.now();
    const id = setInterval(() => setSegundosLecturaOcr(Math.floor((Date.now() - inicio) / 1000)), 1000);
    return () => clearInterval(id);
  }, [leyendoOcr]);

  useEffect(() => {
    if (open) {
      setDatos(facturaExistente ? desdeExistente(facturaExistente) : vacio(borrador));
      setDriveFileId(facturaExistente?.driveFileId ?? null);
      setArchivoPendiente(null);
      setFacturaRectificadaLabel(null);
      setOrigenAutomatico(false);
      setResumenOcr(null);
      setAdvertenciasVistas(false);
      setEnlaces(facturaExistente?.enlaces ?? []);
    } else {
      // Cancela cualquier lectura de IA en curso — ver comentario de ocrAbortRef.
      ocrAbortRef.current?.abort();
      ocrAbortRef.current = null;
      setLeyendoOcr(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facturaExistente]);

  // Cancela también si el componente se desmonta de verdad (no solo se cierra el diálogo).
  useEffect(() => () => { ocrAbortRef.current?.abort(); }, []);

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
    if (resumenOcr && resumenOcr.extraido.advertencias.length > 0 && !advertenciasVistas) {
      return toast.error("La IA marcó datos que no está segura de haber leído bien — revísalos y marca la casilla del aviso antes de registrar");
    }

    setEnviando(true);
    try {
      const payload = {
        proveedorId: datos.proveedorId, numeroFacturaProveedor: datos.numeroFacturaProveedor.trim(), serieProveedor: datos.serieProveedor.trim(),
        fechaExpedicion: datos.fechaExpedicion, fechaOperacion: datos.fechaOperacion || undefined, fechaRecepcion: datos.fechaRecepcion || undefined,
        tipoDocumento: datos.tipoDocumento || undefined, facturaRectificadaId: datos.facturaRectificadaId,
        descripcion: datos.descripcion.trim(), baseImponible: datos.baseImponible,
        tipoIva: datos.tipoIva || undefined, cuotaIvaSoportado: datos.cuotaIvaSoportado || undefined, cuotaIvaDeducible: datos.cuotaIvaDeducible,
        ivaNoDeducible: datos.ivaNoDeducible || undefined, importeTotal: datos.importeTotal, moneda: datos.moneda.trim() || "EUR",
        tipoCambio: datos.tipoCambio || undefined, importeConvertidoEur: datos.importeConvertidoEur || undefined,
        retencionIrpf: datos.retencionIrpf || undefined,
        operacionExenta: datos.operacionExenta, inversionSujetoPasivo: datos.inversionSujetoPasivo,
        adquisicionIntracomunitaria: datos.adquisicionIntracomunitaria, regimenCriterioCaja: datos.regimenCriterioCaja,
        formaPago: datos.formaPago.trim(), fechaVencimiento: datos.fechaVencimiento || undefined, estadoPago: datos.estadoPago,
        referenciaBancaria: datos.referenciaBancaria.trim(), categoria: datos.categoria || undefined, almacen: datos.almacen || undefined,
        // Se envían siempre (incluso vacíos) en vez de "|| undefined": un
        // undefined se cae del JSON y el backend, al fusionar con la fila
        // actual, conservaría el valor viejo — así "Quitar" en el picker
        // nunca llegaría a desvincular de verdad el pedido.
        pedidoId: datos.pedidoId.trim(), stockPedidoId: datos.stockPedidoId ? Number(datos.stockPedidoId) : null,
        centroCoste: datos.centroCoste.trim(), estadoRevision: datos.estadoRevision, observacionesInternas: datos.observacionesInternas.trim(),
        origen: !esEdicion && origenAutomatico ? "automatico" : undefined,
      };
      const url = esEdicion ? `/api/facturas-recibidas/${facturaExistente!.id}` : "/api/facturas-recibidas";
      const res = await fetch(url, {
        method: esEdicion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      if (data.factura.posibleDuplicado && !data.factura.duplicadoConfirmado) toast.warning(`Aviso: ya existe otra factura del mismo proveedor con el número "${datos.numeroFacturaProveedor}"`);

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

  async function leerConIA(archivo: File | undefined) {
    if (!archivo) return;
    if (archivo.size > 8 * 1024 * 1024) {
      toast.error("El archivo no puede superar 8 MB");
      if (inputOcr.current) inputOcr.current.value = "";
      return;
    }

    // El mismo archivo que se lee queda también adjunto — no tiene sentido
    // pedirle al usuario que lo seleccione dos veces (una para leer, otra
    // para adjuntar). En alta se deja "en espera" como con "Adjuntar
    // archivo"; en edición se sube a Drive ya mismo.
    if (!esEdicion) {
      setArchivoPendiente(archivo);
    } else {
      try {
        const nuevoId = await subirArchivoA(facturaExistente!.id, archivo);
        setDriveFileId(nuevoId);
      } catch (e) {
        toast.error(`No se pudo adjuntar el archivo: ${e instanceof Error ? e.message : "error desconocido"}`);
      }
    }

    setLeyendoOcr(true);
    const controller = new AbortController();
    ocrAbortRef.current = controller;
    try {
      const base64 = await leerBase64(archivo);
      const res = await fetch("/api/facturas-recibidas/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mimeType: archivo.type || "application/octet-stream" }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      const e = data.extraido as FacturaOcrExtraido | null;
      if (!e) {
        toast.warning("No se pudo leer ningún dato de la factura — rellénala a mano");
        setResumenOcr(null);
        return;
      }
      setResumenOcr({ extraido: e, proveedorEncontrado: !!data.proveedorIdSugerido });
      setAdvertenciasVistas(false);
      // Solo se pisan campos que la IA de verdad leyó — un valor no
      // encontrado (null) no debe borrar algo que el usuario ya escribió.
      if (data.proveedorIdSugerido) set("proveedorId", data.proveedorIdSugerido);
      if (e.numeroFacturaProveedor) set("numeroFacturaProveedor", e.numeroFacturaProveedor);
      if (e.fechaExpedicion) set("fechaExpedicion", e.fechaExpedicion);
      if (e.baseImponible !== null) set("baseImponible", e.baseImponible);
      if (e.tipoIva !== null) set("tipoIva", e.tipoIva);
      if (e.cuotaIvaSoportado !== null) set("cuotaIvaSoportado", e.cuotaIvaSoportado);
      if (e.cuotaIvaSoportado !== null) set("cuotaIvaDeducible", e.cuotaIvaSoportado);
      if (e.importeTotal !== null) set("importeTotal", e.importeTotal);
      if (e.moneda) set("moneda", e.moneda);
      if (e.descripcion) set("descripcion", e.descripcion);
      setOrigenAutomatico(true);

      if (e.advertencias.length > 0) {
        toast.warning(`La IA no está segura de ${e.advertencias.length} dato(s) — revísalos en el resumen antes de registrar`);
      } else if (e.proveedorNombre && !data.proveedorIdSugerido) {
        toast.warning(`Datos rellenados — el proveedor leído ("${e.proveedorNombre}") no coincide con ninguno dado de alta. Búscalo o créalo.`);
      } else {
        toast.success("Datos rellenados con IA — revísalos antes de registrar");
      }
    } catch (e) {
      // Cancelada a propósito al cerrar el diálogo — nada que avisar, y como
      // el fetch rechaza antes de llegar a los set(...) de arriba, no llega a
      // tocar el formulario.
      if (e instanceof DOMException && e.name === "AbortError") return;
      toast.error(e instanceof Error ? e.message : "No se pudo leer la factura");
    } finally {
      if (ocrAbortRef.current === controller) {
        ocrAbortRef.current = null;
        setLeyendoOcr(false);
      }
      if (inputOcr.current) inputOcr.current.value = "";
    }
  }

  async function quitarEnlace(enlaceId: number) {
    if (!facturaExistente) return;
    setQuitandoEnlace(enlaceId);
    try {
      const res = await fetch(`/api/facturas-recibidas/${facturaExistente.id}/enlaces/${enlaceId}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setEnlaces(data.factura.enlaces);
      set("pedidoId", data.factura.pedidoId || "");
      set("stockPedidoId", data.factura.stockPedidoId ? String(data.factura.stockPedidoId) : "");
      toast.success("Enlace quitado");
      onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setQuitandoEnlace(null);
    }
  }

  async function descartarDuplicado() {
    if (!facturaExistente) return;
    setDescartandoDuplicado(true);
    try {
      const res = await fetch(`/api/facturas-recibidas/${facturaExistente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duplicadoConfirmado: true }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      set("duplicadoConfirmado", true);
      toast.success("Aviso descartado — ya no cuenta como posible duplicado");
      onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setDescartandoDuplicado(false);
    }
  }

  const mostrarAvisoDuplicado = esEdicion && facturaExistente!.posibleDuplicado && !datos.duplicadoConfirmado;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !enviando && onOpenChange(o)}>
        <DialogContent className="flex max-h-[92vh] w-full flex-col gap-0 p-0 sm:max-w-6xl lg:max-w-450" showCloseButton={!enviando}>
          <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5 pr-12">
            <DialogTitle className="flex items-center gap-2">
              <Book1 className="size-5" /> {esEdicion ? `Factura ${facturaExistente!.numeroRecepcion}` : "Nueva factura recibida"}
            </DialogTitle>
            {datos.importeTotal > 0 && (
              <span className="text-base font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{euros(datos.importeTotal)}</span>
            )}
          </div>

          <div className="flex min-h-0 flex-1">
          <ScrollArea className="min-h-0 min-w-0 flex-1">
          <div className="space-y-4 p-4">
            {mostrarAvisoDuplicado && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
                <span className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
                  <Warning2 className="mt-0.5 size-4 shrink-0" />
                  Ya existe otra factura del mismo proveedor con este número — puede ser un duplicado real o una rectificativa/nota de abono legítima.
                </span>
                <Button type="button" size="sm" variant="outline" className="shrink-0 border-amber-400 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300" disabled={descartandoDuplicado} onClick={descartarDuplicado}>
                  {descartandoDuplicado ? "Descartando…" : "No es un duplicado — descartar aviso"}
                </Button>
              </div>
            )}

            {esEdicion && facturaExistente!.revisionMotivo && datos.estadoRevision === "pendiente" && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <Warning2 className="mt-0.5 size-4 shrink-0" />
                <span><strong>Revisión manual:</strong> {facturaExistente!.revisionMotivo}. Compruébala contra el archivo, corrige lo necesario y márcala como «Validada» en el estado de revisión.</span>
              </div>
            )}

            <Seccion titulo="Archivo" icono={DocumentUpload}>
              <div className="flex flex-wrap items-center gap-2">
                <input ref={inputArchivo} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => manejarArchivoSeleccionado(e.target.files?.[0])} />
                <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={subiendoArchivo} onClick={() => inputArchivo.current?.click()}>
                  <DocumentUpload className="size-4" /> {subiendoArchivo ? "Subiendo…" : esEdicion ? "Subir archivo" : archivoPendiente ? "Cambiar archivo" : "Adjuntar archivo"}
                </Button>

                <input ref={inputOcr} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => leerConIA(e.target.files?.[0])} />
                <Button type="button" variant="outline" size="sm" className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/40" disabled={leyendoOcr} onClick={() => inputOcr.current?.click()}>
                  {leyendoOcr ? <Refresh2 className="size-4 animate-spin" /> : <MagicStar className="size-4" />}
                  {leyendoOcr ? `Leyendo… (${segundosLecturaOcr}s)` : "Leer con IA (beta)"}
                </Button>
                {leyendoOcr && (
                  <span className="text-xs text-muted-foreground">La IA local puede tardar 20-30s — no cierres el diálogo.</span>
                )}

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

              {resumenOcr && (
                <div className={cn(
                  "mt-3 rounded-md border p-3",
                  resumenOcr.extraido.advertencias.length > 0
                    ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                    : "border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/30"
                )}>
                  <p className={cn(
                    "mb-2 flex items-center gap-1.5 text-xs font-semibold",
                    resumenOcr.extraido.advertencias.length > 0 ? "text-amber-800 dark:text-amber-300" : "text-violet-800 dark:text-violet-300"
                  )}>
                    <MagicStar className="size-3.5" /> Resumen de lo que leyó la IA
                  </p>

                  {resumenOcr.extraido.advertencias.length > 0 && (
                    <div className="mb-2.5 rounded border border-amber-300 bg-amber-100/60 p-2 dark:border-amber-800 dark:bg-amber-900/30">
                      <p className="flex items-start gap-1.5 text-xs text-amber-900 dark:text-amber-200">
                        <Warning2 className="mt-0.5 size-3.5 shrink-0" />
                        La IA no está segura de {resumenOcr.extraido.advertencias.length === 1 ? "1 dato" : `${resumenOcr.extraido.advertencias.length} datos`} (marcados en ámbar abajo) — compáralos con el archivo original antes de registrar la factura.
                      </p>
                      <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-medium text-amber-900 dark:text-amber-200">
                        <Checkbox checked={advertenciasVistas} onCheckedChange={(v) => setAdvertenciasVistas(v === true)} />
                        He revisado esos datos contra el archivo original
                      </label>
                    </div>
                  )}

                  <div className="grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2 lg:grid-cols-3">
                    <CampoResumen
                      etiqueta="Proveedor"
                      valor={resumenOcr.extraido.proveedorNombre}
                      advertencia={resumenOcr.extraido.proveedorNombre && !resumenOcr.proveedorEncontrado ? "no coincide con ninguno dado de alta" : undefined}
                      incierto={resumenOcr.extraido.advertencias.includes("proveedorNombre")}
                    />
                    <CampoResumen etiqueta="NIF/CIF proveedor" valor={resumenOcr.extraido.proveedorDniCif} incierto={resumenOcr.extraido.advertencias.includes("proveedorDniCif")} />
                    <CampoResumen etiqueta="Nº de factura" valor={resumenOcr.extraido.numeroFacturaProveedor} incierto={resumenOcr.extraido.advertencias.includes("numeroFacturaProveedor")} />
                    <CampoResumen etiqueta="Serie" valor={resumenOcr.extraido.serieProveedor} incierto={resumenOcr.extraido.advertencias.includes("serieProveedor")} />
                    <CampoResumen etiqueta="Fecha de expedición" valor={resumenOcr.extraido.fechaExpedicion} incierto={resumenOcr.extraido.advertencias.includes("fechaExpedicion")} />
                    <CampoResumen etiqueta="Base imponible" valor={resumenOcr.extraido.baseImponible !== null ? euros(resumenOcr.extraido.baseImponible) : null} incierto={resumenOcr.extraido.advertencias.includes("baseImponible")} />
                    <CampoResumen etiqueta="% IVA" valor={resumenOcr.extraido.tipoIva !== null ? `${resumenOcr.extraido.tipoIva}%` : null} incierto={resumenOcr.extraido.advertencias.includes("tipoIva")} />
                    <CampoResumen etiqueta="Cuota de IVA" valor={resumenOcr.extraido.cuotaIvaSoportado !== null ? euros(resumenOcr.extraido.cuotaIvaSoportado) : null} incierto={resumenOcr.extraido.advertencias.includes("cuotaIvaSoportado")} />
                    <CampoResumen etiqueta="Importe total" valor={resumenOcr.extraido.importeTotal !== null ? euros(resumenOcr.extraido.importeTotal) : null} incierto={resumenOcr.extraido.advertencias.includes("importeTotal")} />
                    <CampoResumen etiqueta="Descripción" valor={resumenOcr.extraido.descripcion} incierto={resumenOcr.extraido.advertencias.includes("descripcion")} />
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">Revisa y corrige estos datos en el formulario antes de registrar — la lectura automática puede equivocarse.</p>
                </div>
              )}
            </Seccion>

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
                <CampoBuscable
                  etiqueta="Factura rectificada de (opcional)"
                  valor={datos.facturaRectificadaId ? (facturaRectificadaLabel || `Factura #${datos.facturaRectificadaId}`) : null}
                  deshabilitado={!datos.proveedorId}
                  onBuscar={() => setBuscarRectificadaAbierto(true)}
                  onQuitar={() => { set("facturaRectificadaId", null); setFacturaRectificadaLabel(null); }}
                />
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                  <Label htmlFor="frDescripcion">Descripción de la compra</Label>
                  <Input id="frDescripcion" value={datos.descripcion} onChange={(e) => set("descripcion", e.target.value)} />
                </div>
              </div>
            </Seccion>

            <Seccion titulo="Importes e impuestos" icono={MoneyRecive} acento>
              {borrador && !esEdicion && (
                <div className="mb-4 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
                  Precargado desde Compras (costo: {euros(borrador.importeTotal)}) — revisa y separa base imponible / IVA antes de registrar.
                </div>
              )}
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
                  <CampoBuscable
                    etiqueta="Resguardo / pedido de servicio"
                    valor={datos.pedidoId || null}
                    onBuscar={() => setBuscarPedidoServicioAbierto(true)}
                    onQuitar={() => set("pedidoId", "")}
                  />
                )}
                {datos.almacen === "stock" && (
                  <CampoBuscable
                    etiqueta="Id de pedido de stock"
                    valor={datos.stockPedidoId || null}
                    onBuscar={() => setBuscarPedidoStockAbierto(true)}
                    onQuitar={() => set("stockPedidoId", "")}
                  />
                )}
                {esEdicion && enlaces.length > 0 && (
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
                    <Label>Pedidos enlazados ({enlaces.length}) — una factura puede cubrir varios</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {enlaces.map((en) => (
                        <span key={en.id} className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs">
                          {en.pedidoId ? `Pedido ${en.pedidoId}` : `Pedido de stock #${en.stockPedidoId}`}
                          {en.metodo === "auto" && <span className="rounded bg-violet-500/10 px-1 text-[10px] text-violet-600 dark:text-violet-400">auto{en.puntuacion ? ` · ${Math.round(en.puntuacion)} pts` : ""}</span>}
                          <button type="button" className="text-muted-foreground hover:text-destructive disabled:opacity-50" title="Quitar este enlace" disabled={quitandoEnlace === en.id} onClick={() => quitarEnlace(en.id)}>
                            <CloseCircle className="size-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="frCentroCoste">Centro de coste / departamento</Label>
                  <Input id="frCentroCoste" value={datos.centroCoste} onChange={(e) => set("centroCoste", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Estado de revisión</Label>
                  <Select value={datos.estadoRevision} onValueChange={(v) => set("estadoRevision", (v === "validada" ? "validada" : "pendiente") as EstadoRevisionFactura)}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{(v: string) => (v === "validada" ? "Validada" : "Pendiente")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="validada">Validada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
                  <Label htmlFor="frObservaciones">Observaciones internas</Label>
                  <Textarea id="frObservaciones" rows={2} value={datos.observacionesInternas} onChange={(e) => set("observacionesInternas", e.target.value)} />
                </div>
              </div>
            </Seccion>
          </div>
          </ScrollArea>

          <div className="hidden min-h-0 w-140 shrink-0 flex-col border-l bg-muted/10 lg:flex">
            <div className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground">Vista previa del archivo</div>
            {previewUrl ? (
              <>
                <iframe src={previewUrl} className="min-h-0 w-full flex-1" title="Vista previa de la factura" />
                <div className="border-t p-2 text-center">
                  <a href={previewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <ExportSquare className="size-3.5" /> Abrir en pestaña nueva
                  </a>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-xs text-muted-foreground">
                <Paperclip2 className="size-6 opacity-40" />
                Sin archivo adjunto todavía
              </div>
            )}
          </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t bg-muted/50 px-5 py-3.5 sm:flex-row sm:justify-between">
            {esEdicion && esSuperadmin ? (
              <Button type="button" variant="ghost" className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={enviando} onClick={() => setEliminarAbierto(true)}>
                <Trash className="size-3.5" /> Eliminar
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>Cancelar</Button>
              <Button onClick={guardar} disabled={enviando}>{enviando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Registrar factura"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ProveedorFormDialog
        proveedorExistente={null}
        open={nuevoProveedorAbierto}
        onOpenChange={setNuevoProveedorAbierto}
        onGuardado={(p) => { cargarProveedores(); set("proveedorId", p.proveedorId); }}
      />

      <BuscarPedidoServicioDialog
        open={buscarPedidoServicioAbierto}
        onOpenChange={setBuscarPedidoServicioAbierto}
        onSeleccionar={(p: CompraFila) => set("pedidoId", p.pedidoId)}
      />
      <BuscarPedidoStockDialog
        open={buscarPedidoStockAbierto}
        onOpenChange={setBuscarPedidoStockAbierto}
        onSeleccionar={(p: PedidoStockBusqueda) => set("stockPedidoId", String(p.id))}
      />
      <BuscarFacturaRectificadaDialog
        open={buscarRectificadaAbierto}
        onOpenChange={setBuscarRectificadaAbierto}
        proveedorId={datos.proveedorId}
        excluirId={facturaExistente?.id}
        onSeleccionar={(f) => { set("facturaRectificadaId", f.id); setFacturaRectificadaLabel(f.numeroRecepcion); }}
      />

      {esEdicion && (
        <EliminarRegistroDialog
          tipo="factura"
          id={facturaExistente!.numeroRecepcion}
          apiUrl={`/api/facturas-recibidas/${facturaExistente!.id}`}
          open={eliminarAbierto}
          onOpenChange={setEliminarAbierto}
          onEliminado={() => { onOpenChange(false); onGuardado(); }}
        />
      )}
    </>
  );
}
