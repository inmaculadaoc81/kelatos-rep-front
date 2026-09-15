"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { Bank, TickCircle, Clock, CloseCircle, DocumentText } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ReparacionDetalle } from "@/lib/reparacion-detalle";

export interface MovimientoConciliado {
  id: number;
  estado: "Pendiente" | "Conciliada";
  monto: string | null;
  fecha_valor: string | null;
  banco: string | null;
  remitente: string | null;
  concepto: string | null;
  origen: "Cliente" | "Empresa" | string;
  link_foto: string | null;
  fecha_registro: string;
}

export interface ComprobanteTransferencia {
  id: number;
  estado: "Pendiente" | "Conciliada";
  monto: string | null;
  fecha_valor: string | null;
  banco: string | null;
  remitente: string | null;
  link_foto: string | null;
  fecha_registro: string;
  fecha_conciliacion: string | null;
  /** El otro lado del emparejamiento (el ingreso real subido por
      tesorería vía Telegram) — solo presente cuando estado es
      "Conciliada". Petición del usuario, 2026-09-15: ver los DOS lados
      de la conciliación, no solo el comprobante que subió el empleado. */
  par: MovimientoConciliado | null;
}

function leerComoBase64(file: File): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve({ base64: dataUrl.split(",")[1] || "", mime: file.type || "image/jpeg" });
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

function formatearFechaHora(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Píldora de solo lectura para la columna "Pago" de la tabla principal —
    sin fetch propio, recibe el estado ya cargado en bloque para toda la
    página (ver comprobantesEstado en page.tsx). Sin comprobante para ese
    resguardo (pago en efectivo/tarjeta, o transferencia aún sin subir)
    muestra un guion, igual que el resto de columnas opcionales de la tabla. */
export function PagoTransferenciaPill({ estado }: { estado?: "Pendiente" | "Conciliada" }) {
  if (!estado) return <span className="text-sm text-muted-foreground">-</span>;
  const conciliado = estado === "Conciliada";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${
        conciliado
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
      }`}
    >
      {conciliado ? <TickCircle className="size-3" /> : <Clock className="size-3" />}
      {conciliado ? "Pago realizado" : "No comprobado"}
    </span>
  );
}

/**
 * Botón "Transferencia" de la fila "Estado Actual" — sube el comprobante
 * de pago del cliente y reutiliza el mismo motor de conciliación que ya
 * usa el bot de Telegram de Transferencias (OCR + búsqueda de coincidencia
 * contra el ingreso real en el banco). Sin comprobante sube uno nuevo; con
 * comprobante muestra una píldora de estado ("No se ha comprobado" /
 * "Pago realizado"). Petición del usuario, 2026-09-15: "para llevar un
 * mejor control" de qué reparaciones ya cobraron de verdad por transferencia.
 */
export function ComprobanteTransferenciaBoton({ detalle, onActualizado }: { detalle: ReparacionDetalle; onActualizado?: () => void }) {
  const [comprobante, setComprobante] = useState<ComprobanteTransferencia | null | undefined>(undefined);
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  function cargar() {
    fetch(`/api/reparaciones/${detalle.resguardo}/comprobante-transferencia`)
      .then((r) => r.json())
      .then((data) => setComprobante(data.ok ? data.comprobante : null))
      .catch(() => setComprobante(null));
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detalle.resguardo]);

  async function onSeleccionarArchivo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSubiendo(true);
    try {
      const { base64, mime } = await leerComoBase64(file);
      const res = await fetch(`/api/reparaciones/${detalle.resguardo}/comprobante-transferencia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mime }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      if (data.duplicado) {
        toast.info("Este comprobante ya se había subido");
      } else if (data.estado === "Conciliada") {
        toast.success("Comprobante subido — el pago ya está conciliado con el banco");
      } else if (data.ambiguo) {
        toast.warning("Comprobante subido — hay varias coincidencias posibles, concílialo a mano desde Transferencias");
      } else {
        toast.success("Comprobante subido — pendiente de conciliar con el banco");
      }
      // Mismo aviso que ya manda el bot de Telegram cuando la IA no estaba
      // muy segura de la lectura ("⚠️ Confianza baja. Verifica los datos
      // manualmente.") — antes se perdía sin más en el camino del dashboard.
      if (data.confianzaBaja && !data.duplicado) {
        toast.warning("Confianza baja en la lectura del comprobante — verifica los datos manualmente");
      }
      cargar();
      // El evento nuevo queda en el Historial de la reparación (kelatos_app.historial,
      // mismo dato que ya trae detalle.historialEventos) — sin esto la pestaña
      // "Historial" seguiría mostrando la lista antigua hasta un refresco manual.
      onActualizado?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSubiendo(false);
    }
  }

  if (comprobante === undefined) return null;

  if (!comprobante) {
    return (
      <Button size="sm" variant="outline" className="gap-1.5" disabled={subiendo} render={<label />}>
        <Bank className="size-3.5" /> {subiendo ? "Subiendo..." : "Transferencia"}
        <input type="file" accept="image/*,.pdf" className="hidden" onChange={onSeleccionarArchivo} disabled={subiendo} />
      </Button>
    );
  }

  const conciliado = comprobante.estado === "Conciliada";

  return (
    <>
      <button
        type="button"
        onClick={() => setDetalleAbierto(true)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[0.8rem] font-medium transition-colors ${
          conciliado
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400"
            : "border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-400"
        }`}
      >
        {conciliado ? <TickCircle className="size-3.5" /> : <Clock className="size-3.5" />}
        {conciliado ? "Pago realizado" : "No se ha comprobado"}
      </button>

      <Dialog open={detalleAbierto} onOpenChange={setDetalleAbierto}>
        <DialogContent className="max-w-sm gap-0 p-0 sm:max-w-sm" showCloseButton={false}>
          <header className={`flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-white ${conciliado ? "bg-emerald-600" : "bg-amber-600"}`}>
            <Bank className="size-4.5 shrink-0" />
            <DialogTitle className="text-sm font-semibold text-white">Comprobante de transferencia</DialogTitle>
            <Button variant="ghost" size="icon-sm" className="ml-auto text-white hover:bg-white/15 hover:text-white" onClick={() => setDetalleAbierto(false)}>
              <CloseCircle className="size-4" />
            </Button>
          </header>

          <div className="space-y-2 px-4 py-4 text-sm">
            <p className="flex items-center gap-1.5 font-medium">
              {conciliado ? (
                <>
                  <TickCircle className="size-4 text-emerald-600" /> Pago realizado — conciliado con el banco
                </>
              ) : (
                <>
                  <Clock className="size-4 text-amber-600" /> Aún no se ha comprobado el pago
                </>
              )}
            </p>
            <div>
              {conciliado && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subido desde la reparación</p>}
              <div className="space-y-1 rounded-md bg-muted/50 px-3 py-2 text-muted-foreground">
                <p>Monto: <span className="text-foreground">{comprobante.monto ? `${Number(comprobante.monto).toFixed(2)} €` : "-"}</span></p>
                <p>Fecha del comprobante: <span className="text-foreground">{comprobante.fecha_valor || "-"}</span></p>
                <p>Banco: <span className="text-foreground">{comprobante.banco || "-"}</span></p>
                <p>Remitente: <span className="text-foreground">{comprobante.remitente || "-"}</span></p>
                <p>Subido: <span className="text-foreground">{formatearFechaHora(comprobante.fecha_registro)}</span></p>
                {conciliado && <p>Conciliado: <span className="text-foreground">{formatearFechaHora(comprobante.fecha_conciliacion)}</span></p>}
              </div>
              {comprobante.link_foto && (
                <a
                  href={`https://drive.google.com/file/d/${comprobante.link_foto}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 flex items-center gap-1.5 text-primary hover:underline"
                >
                  <DocumentText className="size-3.5" /> Ver comprobante subido
                </a>
              )}
            </div>

            {/* El otro lado del emparejamiento — el ingreso real que llegó
                al banco (subido por tesorería vía Telegram), con el que
                este comprobante coincidió. Petición del usuario,
                2026-09-15: "cuando se concilia debe salir ambas". */}
            {conciliado && comprobante.par && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ingreso conciliado en el banco</p>
                <div className="space-y-1 rounded-md bg-emerald-500/10 px-3 py-2 text-muted-foreground">
                  <p>Monto: <span className="text-foreground">{comprobante.par.monto ? `${Number(comprobante.par.monto).toFixed(2)} €` : "-"}</span></p>
                  <p>Fecha: <span className="text-foreground">{comprobante.par.fecha_valor || "-"}</span></p>
                  <p>Banco: <span className="text-foreground">{comprobante.par.banco || "-"}</span></p>
                  <p>Remitente: <span className="text-foreground">{comprobante.par.remitente || "-"}</span></p>
                  <p>Concepto: <span className="text-foreground">{comprobante.par.concepto || "-"}</span></p>
                </div>
                {comprobante.par.link_foto && (
                  <a
                    href={`https://drive.google.com/file/d/${comprobante.par.link_foto}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <DocumentText className="size-3.5" /> Ver comprobante del banco
                  </a>
                )}
              </div>
            )}
          </div>

          <footer className="flex justify-center gap-2 rounded-b-xl border-t bg-muted/50 px-4 py-2.5">
            <Button size="sm" variant="outline" className="gap-1.5" disabled={subiendo} render={<label />}>
              <Bank className="size-3.5" /> {subiendo ? "Subiendo..." : "Subir otro comprobante"}
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={onSeleccionarArchivo} disabled={subiendo} />
            </Button>
          </footer>
        </DialogContent>
      </Dialog>
    </>
  );
}
