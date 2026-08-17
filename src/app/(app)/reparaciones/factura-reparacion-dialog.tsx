"use client";

import { useEffect, useMemo, useState } from "react";
import { Add, Trash, Receipt, Building, Profile, CloseCircle, SearchNormal1, Star, Send2, TickCircle, DocumentDownload, Box1 } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ReparacionDetalle, Presupuesto } from "@/lib/reparacion-detalle";
import { Cliente } from "@/lib/clientes";
import { esEmailValido } from "@/lib/validacion";
import { BuscarClienteDialog } from "@/components/buscar-cliente-dialog";
import { BuscarPiezaStockDialog } from "./buscar-pieza-stock-dialog";
import type { StockPieza } from "@/lib/stock-piezas";

const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta bancaria" },
  { value: "transferencia", label: "Transferencia bancaria" },
  { value: "bizum", label: "Bizum" },
];
const BANCOS = ["Santander", "Sabadell", "BBVA", "CaixaBank"];

interface LineaEditable {
  referencia: string;
  descripcion: string;
  cantidad: number;
  descuentoPct: number;
  precioUnitario: number;
}

function euros(n: number): string {
  return (n || 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function fechaHoyCorta(): string {
  return new Date().toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });
}

function lineaVacia(): LineaEditable {
  return { referencia: "", descripcion: "", cantidad: 1, descuentoPct: 0, precioUnitario: 0 };
}

/**
 * Basado en _vfRellenarLineas() del original: piezas + mano de obra de
 * los presupuestos aceptados (o el último si ninguno está aceptado),
 * aplicando el factor restante si ya se cobró un anticipo, la línea de
 * descuento de revisión pagada, y los portes de mensajería (solo mientras
 * no exista ya una factura, igual que el original).
 *
 * Decisión explícita del usuario sobre el descuento de revisión pagada: el
 * anticipo (ver anticipo-dialog.tsx) se calcula ahora sobre el bruto de los
 * presupuestos, SIN restar ni prorratear el descuento — el descuento de 20€
 * se aplica entero, una sola vez, aquí en la factura final. Por eso baseRem
 * ya no resta descuentoRevision: el "% restante" (remFactor) se calcula
 * sobre el mismo bruto que usó el anticipo para su 50%, así ambos siguen
 * siendo porcentajes limpios y complementarios (p.ej. 50%/50%) sin que el
 * descuento entre en esa proporción.
 *
 * Segunda diferencia deliberada: el original solo tomaba el PRIMER
 * presupuesto en estado "aceptado" (rep.presupuestos.find(...), Index.html
 * :12537) e ignoraba cualquier otro también aceptado — con el flujo
 * "hayMas" (aceptar más de un presupuesto sin rechazar los demás) eso
 * dejaba fuera de la factura mano de obra/piezas ya aceptadas por el
 * cliente. Aquí se suman TODOS los presupuestos "aceptado" existentes.
 */
function construirLineasIniciales(detalle: ReparacionDetalle): LineaEditable[] {
  const lineas: LineaEditable[] = [];
  const add = (descripcion: string, cantidad: number, precioUnitario: number) =>
    lineas.push({ referencia: "", descripcion, cantidad, descuentoPct: 0, precioUnitario });

  let datosCintas: { tipos?: Record<string, number>; precioUnitario?: number; precioPorCinta?: number; precioBobina?: number } | null = null;
  try {
    datosCintas = detalle.datosCintas ? JSON.parse(detalle.datosCintas) : null;
  } catch {
    datosCintas = null;
  }

  const NOMBRES_TIPO: Record<string, string> = {
    vhs: "VHS", vhsc: "VHS-C", beta: "Betamax", minidv: "MiniDV", "8mm": "8mm / Hi8", cassette: "Cassette audio", bobina: "Bobina",
  };

  if (datosCintas?.tipos) {
    // precioPorCinta/precioBobina: precio real de cada tipo (tarifa
    // escalonada normal / 20€ fijo de bobina) — precioUnitario es solo el
    // promedio usado internamente para el total (ver calcularTotalCintas),
    // nunca el precio real de ninguna línea. Con registros antiguos que no
    // tengan aún estos dos campos, cae al promedio como único dato disponible.
    for (const [tipo, qty] of Object.entries(datosCintas.tipos)) {
      if (!qty || qty <= 0) continue;
      const precioReal = tipo === "bobina"
        ? (datosCintas.precioBobina ?? datosCintas.precioUnitario ?? 0)
        : (datosCintas.precioPorCinta ?? datosCintas.precioUnitario ?? 0);
      add(`Conversión ${NOMBRES_TIPO[tipo] || tipo}`, qty, precioReal);
    }
  } else {
    // Decisión explícita del usuario (distinta del original, que solo
    // tomaba el primer presupuesto "aceptado" vía .find() e ignoraba el
    // resto): cuando el flujo "hayMas" deja más de un presupuesto en
    // estado "aceptado" para la misma reparación, la factura debe sumar
    // mano de obra y piezas de TODOS ellos, no solo del primero.
    const aceptados = detalle.presupuestos.filter((p) => p.estado === "aceptado");
    const pressBase = aceptados.length > 0
      ? aceptados
      : detalle.presupuestos.length > 0
        ? [detalle.presupuestos[detalle.presupuestos.length - 1]]
        : [];
    const hayPres = pressBase.length > 0;

    let sumItems = 0;
    for (const p of pressBase) {
      sumItems += p.manoObra || 0;
      if (p.piezas.length > 0) {
        sumItems += p.piezas.reduce((s, pz) => s + (pz.precio || pz.costo || 0), 0);
      } else {
        sumItems += p.precioPiezas || 0;
      }
    }

    // baseRem es el presupuesto BRUTO (sin restar el descuento de revisión
    // — ese descuento ya no se prorratea, se aplica entero más abajo) —
    // igual que anticipo-dialog.tsx calcula su 50% sobre ese mismo bruto,
    // así el anticipo y el remanente de esta factura son siempre
    // porcentajes limpios y complementarios (p.ej. 50%/50%).
    const anticipo = !detalle.urlFactura && hayPres ? detalle.anticipoImporte || 0 : 0;
    const totalPresBruto = pressBase.reduce((s, p) => s + (p.total || 0), 0);
    const baseBruta = sumItems > 0 ? sumItems : totalPresBruto;
    const baseRem = baseBruta;
    let remFactor = 1;
    if (anticipo > 0 && baseRem > 0) remFactor = Math.max(0, 1 - anticipo / baseRem);
    const sufijo = remFactor < 1 ? ` (${Math.round(remFactor * 100)}% restante)` : "";

    if (hayPres) {
      // Con más de un presupuesto aceptado, cada uno mantiene su propia
      // línea (etiquetada con su versión) en vez de fundirse en una sola
      // cifra — así la factura sigue mostrando de qué presupuesto viene
      // cada importe, igual que ya se ve en la lista de Presupuestos.
      const multiples = pressBase.length > 1;
      const etiqueta = (base: string, p: Presupuesto) => (multiples ? `${base} (v${p.version})` : base) + sufijo;

      let hayPiezas = false;
      for (const p of pressBase) {
        if (p.piezas.length > 0) {
          hayPiezas = true;
          for (const pieza of p.piezas) {
            const desc = (pieza.descripcion || "").toLowerCase();
            if (desc.includes("descuento") && desc.includes("revis")) continue;
            const precio = (pieza.precio || pieza.costo || 0) * remFactor;
            add(etiqueta(pieza.descripcion || "Pieza", p), 1, precio);
          }
        } else if ((p.precioPiezas || 0) > 0) {
          hayPiezas = true;
          add(etiqueta("Material / Piezas", p), 1, p.precioPiezas * remFactor);
        }
      }
      let hayManoObra = false;
      for (const p of pressBase) {
        const mo = (p.manoObra || 0) * remFactor;
        if (mo > 0) {
          hayManoObra = true;
          add(etiqueta("Mano de obra", p), 1, mo);
        }
      }
      if (!hayManoObra && !hayPiezas) add("Mano de obra", 1, 0);
    } else {
      add("Mano de obra", 1, 0);
    }
  }

  if (detalle.revisionPagada === "SI") add("Descuento revisión pagada", 1, -20);

  if (!detalle.urlFactura) {
    if ((detalle.tipoRecepcion || "LOCAL") === "ENVIO") add("Recogida por mensajería", 1, 12.4);
    if (detalle.entregaMensajeria === "SI") add("Envío por mensajería", 1, 12.4);
  }

  return lineas.length > 0 ? lineas : [lineaVacia()];
}

/**
 * Reproduce el modal #modalVistaFactura (abrirVistaFactura/
 * generarYEnviarFactura) para reparaciones — el saga de facturación real
 * (preparar→iniciar→generar-pdf→confirmar) ya existía en el backend y en
 * /api/reparaciones/[resguardo]/facturas sin ningún llamador en el
 * frontend: este diálogo es ese llamador que faltaba.
 *
 * El % de descuento global solo afecta la vista previa en pantalla — igual
 * que en el original, ni el PDF ni el total persistido lo aplican, porque
 * _calcularTotalesFacturaTx (backend) suma únicamente qty*pu*(1-dto/100)
 * por línea. Se replica ese comportamiento real, no el que parece sugerir
 * la UI.
 */
export function FacturaReparacionDialog({
  detalle,
  open,
  onOpenChange,
  onGenerada,
}: {
  detalle: ReparacionDetalle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerada: () => void;
}) {
  const yaGenerada = !!(detalle.numeroFactura || detalle.urlFactura);

  if (yaGenerada) return <VistaGenerada detalle={detalle} open={open} onOpenChange={onOpenChange} onActualizado={onGenerada} />;
  return <VistaGenerar detalle={detalle} open={open} onOpenChange={onOpenChange} onGenerada={onGenerada} />;
}

function CabeceraAzul({ titulo, onClose }: { titulo: string; onClose: () => void }) {
  return (
    <header className="flex items-center gap-2 rounded-t-xl bg-primary px-4 py-3 text-primary-foreground">
      <Receipt className="size-4.5 shrink-0" />
      <DialogTitle className="text-sm font-semibold text-primary-foreground">{titulo}</DialogTitle>
      <Button variant="ghost" size="icon-sm" className="ml-auto text-primary-foreground hover:bg-white/15 hover:text-primary-foreground" onClick={onClose}>
        <CloseCircle className="size-4" />
      </Button>
    </header>
  );
}

function CampoLectura({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={valor} disabled className="bg-muted/50" />
    </div>
  );
}

const ETIQUETA_METODO_PAGO: Record<string, string> = Object.fromEntries(METODOS_PAGO.map((m) => [m.value, m.label]));

/**
 * Reproduce #modalVistaFactura en modo "ya generada" (todos los campos
 * bloqueados salvo Reseña, tal como quedan tras generarPdfFactura()) — NO
 * el modal #modalFcAcciones (ese es el que usa FacturaModalShell/
 * FacturaAccionesTabs, reservado para "Facturas de Clientes" y para la
 * factura de revisión). Aquí solo hay que ver los datos ya emitidos, el
 * enlace al PDF y, si aplica, enviarla al cliente — nunca generar
 * devoluciones/rectificativas desde la ficha de la reparación, igual que
 * el original (esas viven en la página de Facturas de Clientes).
 */
/**
 * Reproduce el bloque "Reseña" de #modalVistaFactura (_vfInitResena/
 * _vfResenaChange/_vfProgramarResena/_vfCancelarResena, Index.html) — tres
 * estados: NO (botón para programar el envío real por WhatsApp a 7 días, o
 * marcar que ya se pidió en persona), SI (ya se pidió, se puede deshacer) y
 * PROGRAMADA (envío ya agendado, con opción de cancelarlo).
 */
export function TarjetaResena({
  resguardo,
  resena,
  onActualizado,
}: {
  resguardo: string;
  resena: string;
  onActualizado: () => void;
}) {
  const [enviando, setEnviando] = useState(false);

  async function ejecutar(accion: "programar" | "cancelar" | "marcar_si") {
    setEnviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${resguardo}/resena`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(
        accion === "programar" ? "Reseña programada — se enviará por WhatsApp en 1 semana"
          : accion === "cancelar" ? "Reseña cancelada"
          : "Reseña marcada como enviada"
      );
      onActualizado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="flex items-center gap-1.5 rounded-t-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white">
        <Star className="size-3.5" /> Reseña
      </div>
      <div className="space-y-2 p-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold">¿Se envió reseña?</span>
          <div className="flex overflow-hidden rounded-md border">
            <button
              type="button"
              disabled={enviando || resena === "SI"}
              onClick={() => ejecutar("marcar_si")}
              className={`px-2.5 py-1 font-medium transition-colors ${resena === "SI" ? "bg-emerald-600 text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}
            >
              Sí
            </button>
            <button
              type="button"
              disabled={enviando || resena === "NO" || resena === ""}
              onClick={() => ejecutar("cancelar")}
              className={`border-l px-2.5 py-1 font-medium transition-colors ${resena === "SI" || resena === "PROGRAMADA" ? "bg-card text-muted-foreground hover:bg-muted" : "bg-muted text-foreground"}`}
            >
              No
            </button>
          </div>
        </div>
        {resena === "PROGRAMADA" ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
              <TickCircle className="size-3.5" /> Programada para 1 semana
            </span>
            <button type="button" className="text-destructive underline disabled:opacity-50" disabled={enviando} onClick={() => ejecutar("cancelar")}>
              Cancelar
            </button>
          </div>
        ) : resena !== "SI" ? (
          <Button size="sm" variant="outline" className="h-7 gap-1.5 border-amber-500 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400" disabled={enviando} onClick={() => ejecutar("programar")}>
            <Send2 className="size-3.5" /> {enviando ? "Enviando…" : "Enviar reseña (en 1 semana)"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function VistaGenerada({
  detalle,
  open,
  onOpenChange,
  onActualizado,
}: {
  detalle: ReparacionDetalle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActualizado: () => void;
}) {
  const [emailDestino, setEmailDestino] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cliente = detalle.clienteFactura;
  const lineas = detalle.lineasFactura.length > 0
    ? detalle.lineasFactura
    : [{ descripcion: "Factura", cantidad: 1, precio: detalle.totalFactura }];
  const base = lineas.reduce((s, l) => s + l.cantidad * l.precio * (1 - (l.descuento || 0) / 100), 0);
  const iva = base * 0.21;
  const formaPagoTexto = detalle.formaPago
    ? (ETIQUETA_METODO_PAGO[detalle.formaPago] || detalle.formaPago) + (detalle.banco ? ` (${detalle.banco})` : "")
    : "—";

  async function enviarAlCliente() {
    if (!esEmailValido(emailDestino)) return toast.error("El email no tiene un formato válido");
    setEnviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${detalle.resguardo}/facturas/enviar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "normal", emailDestino: emailDestino.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      if (!data.enviado) throw new Error(data.motivo === "facturas_deshabilitado" ? "El envío de facturas por correo está deshabilitado por ahora." : (data.motivo || "No se pudo enviar"));
      toast.success(`Factura enviada a ${emailDestino.trim() || cliente?.email || detalle.cliente.email}`);
      onActualizado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl gap-0 p-0 sm:max-w-6xl" showCloseButton={false}>
        <CabeceraAzul titulo={`Factura — Ref. ${detalle.resguardo}`} onClose={() => onOpenChange(false)} />

        <ScrollArea className="max-h-[75vh]">
          <div className="space-y-4 bg-muted/30 p-4">
            <div className="grid gap-3 sm:grid-cols-5">
              <CampoLectura label="Tipo de factura" valor="Serie 1 — Cobros" />
              <CampoLectura label="N.º Factura" valor={detalle.numeroFactura || "—"} />
              <CampoLectura label="Fecha de factura" valor={detalle.fechaFactura ? new Date(detalle.fechaFactura).toLocaleDateString("es-ES") : "—"} />
              <CampoLectura label="Forma de pago" valor={formaPagoTexto} />
              <CampoLectura label="Estado" valor={detalle.estadoFactura || "—"} />
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
                  <div className="flex items-center gap-1.5 rounded-t-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">
                    <Profile className="size-3.5" /> Cliente <span className="font-normal opacity-75">(factura emitida)</span>
                  </div>
                  <div className="space-y-1 p-3 text-xs">
                    <FilaLectura etiqueta="Nombre" valor={cliente?.nombre || detalle.cliente.nombre} />
                    <FilaLectura etiqueta="DNI/CIF" valor={cliente?.dni || detalle.dniCif} />
                    <FilaLectura etiqueta="Teléfono" valor={cliente?.telefono || detalle.cliente.telefono} />
                    <FilaLectura etiqueta="Email" valor={cliente?.email || detalle.cliente.email} />
                    <FilaLectura etiqueta="Dirección" valor={cliente?.direccion || detalle.cliente.direccion} />
                  </div>
                </div>

                <TarjetaResena resguardo={detalle.resguardo} resena={detalle.resena} onActualizado={onActualizado} />
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border bg-card shadow-sm">
                  <div className="flex items-center gap-1.5 rounded-t-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-white">
                    Equipo / Servicio
                  </div>
                  <div className="space-y-1 p-3 text-xs">
                    <p><span className="text-muted-foreground">Referencia:</span> <strong>{detalle.resguardo}</strong></p>
                    <p><span className="text-muted-foreground">Modelo:</span> {detalle.equipo.modelo || "-"}</p>
                    <p><span className="text-muted-foreground">Descripción:</span> {detalle.equipo.sintoma || "-"}</p>
                  </div>
                </div>

                <div className="rounded-lg border bg-card shadow-sm">
                  <div className="flex items-center gap-1.5 rounded-t-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
                    Conceptos
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs text-muted-foreground">
                        <tr>
                          <th className="w-20 p-2 text-left">Ref.</th>
                          <th className="p-2 text-left">Descripción</th>
                          <th className="w-14 p-2 text-center">Cant.</th>
                          <th className="w-16 p-2 text-center">Dto. %</th>
                          <th className="w-24 p-2 text-right">P. unit.</th>
                          <th className="w-24 p-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineas.map((l, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2 font-mono text-xs text-muted-foreground">{l.referencia || "—"}</td>
                            <td className="p-2">{l.descripcion}</td>
                            <td className="p-2 text-center">{l.cantidad}</td>
                            <td className="p-2 text-center">{l.descuento || 0}</td>
                            <td className="p-2 text-right">{euros(l.precio)}</td>
                            <td className="p-2 text-right whitespace-nowrap">{euros(l.cantidad * l.precio * (1 - (l.descuento || 0) / 100))}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/30 text-sm">
                        <tr>
                          <td colSpan={5} className="p-1.5 text-right text-xs text-muted-foreground">Base imponible</td>
                          <td className="p-1.5 text-right font-semibold">{euros(base)}</td>
                        </tr>
                        <tr>
                          <td colSpan={5} className="p-1.5 text-right text-xs text-muted-foreground">IVA (21%)</td>
                          <td className="p-1.5 text-right">{euros(iva)}</td>
                        </tr>
                        <tr className="bg-primary/10">
                          <td colSpan={5} className="p-1.5 text-right font-bold">TOTAL</td>
                          <td className="p-1.5 text-right text-base font-bold">{euros(base + iva)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {detalle.urlFactura ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-800 dark:text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <TickCircle className="size-4 shrink-0" />
                      PDF generado:{" "}
                      <a href={detalle.urlFactura} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold underline">
                        <DocumentDownload className="size-3.5" /> Ver factura en Drive
                      </a>
                    </span>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder={cliente?.email || detalle.cliente.email || "correo@ejemplo.com"}
                        value={emailDestino}
                        onChange={(e) => setEmailDestino(e.target.value)}
                        className="h-8 w-48 bg-card text-xs"
                      />
                      <Button size="sm" className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={enviarAlCliente} disabled={enviando}>
                        <Send2 className="size-3.5" /> {enviando ? "Enviando…" : "Enviar al cliente"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-400">
                    Factura guardada como borrador — todavía sin fecha ni PDF definitivos.
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <footer className="flex justify-end border-t bg-muted/50 px-4 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function FilaLectura({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="grid grid-cols-[5rem_1fr] gap-2">
      <span className="text-muted-foreground">{etiqueta}</span>
      <span className="font-medium">{valor || "-"}</span>
    </div>
  );
}

function VistaGenerar({
  detalle,
  open,
  onOpenChange,
  onGenerada,
}: {
  detalle: ReparacionDetalle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerada: () => void;
}) {
  const [numeroPreview, setNumeroPreview] = useState("");
  const [lineas, setLineas] = useState<LineaEditable[]>(() => construirLineasIniciales(detalle));
  const [descuentoGlobalPct, setDescuentoGlobalPct] = useState(0);
  const [nombre, setNombre] = useState(detalle.cliente.nombre || "");
  const [dni, setDni] = useState(detalle.dniCif || "");
  const [codigo, setCodigo] = useState(detalle.codigoCliente || "");
  const [telefono, setTelefono] = useState(detalle.cliente.telefono || "");
  const [email, setEmail] = useState(detalle.cliente.email || "");
  const [direccion, setDireccion] = useState(detalle.cliente.direccion || "");
  const [metodo, setMetodo] = useState("");
  const [banco, setBanco] = useState("");
  const [estadoFactura, setEstadoFactura] = useState("Cobrada");
  const [enviando, setEnviando] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [buscarClienteAbierto, setBuscarClienteAbierto] = useState(false);
  const [buscarStockAbierto, setBuscarStockAbierto] = useState(false);

  function seleccionarCliente(c: Cliente) {
    setCodigo(c.codigo || "");
    setNombre(c.nombre || "");
    setDni(c.dniCif || "");
    setTelefono(c.telefono || "");
    setEmail(c.email || "");
    setDireccion(c.direccion || "");
    toast.success("Cliente cargado");
  }

  useEffect(() => {
    if (!open) return;
    setLineas(construirLineasIniciales(detalle));
    setNumeroPreview("");
    fetch(`/api/reparaciones/${detalle.resguardo}/facturas/peek`)
      .then((r) => r.json())
      .then((data) => { if (data.ok) setNumeroPreview(data.numero); })
      .catch(() => {});

    // Reproduce el bloque "Código y dirección de cliente (lookup si alguno
    // falta)" de abrirVistaFactura() — mismo disparador exacto: solo si
    // código o dirección vienen vacíos Y hay DNI o teléfono con qué buscar,
    // y solo rellena el campo que efectivamente faltaba (nunca pisa uno ya
    // presente).
    if ((!codigo.trim() || !direccion.trim()) && (dni.trim() || telefono.trim())) {
      fetch(`/api/clientes/buscar-exacto?dni=${encodeURIComponent(dni.trim())}&telefono=${encodeURIComponent(telefono.trim())}`)
        .then((r) => r.json())
        .then((data) => {
          if (!data.ok || !data.cliente) return;
          if (!codigo.trim() && data.cliente.codigo) setCodigo(data.cliente.codigo);
          if (!direccion.trim() && data.cliente.direccion) setDireccion(data.cliente.direccion);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function actualizarLinea(i: number, campo: keyof LineaEditable, valor: string | number) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }

  /** Reproduce _vfSeleccionarArticulo() (Index.html): añade una línea nueva
      precargada con los datos del artículo elegido en el catálogo de Stock
      de Piezas, en vez de tener que escribirlos a mano. */
  function agregarLineaDesdeStock(p: StockPieza) {
    setLineas((prev) => [
      ...prev,
      { referencia: p.referencia, descripcion: p.descripcion || p.nombre, cantidad: 1, descuentoPct: 0, precioUnitario: p.precioCliente },
    ]);
    setBuscarStockAbierto(false);
  }

  const { base, descuentoAmt, iva, total } = useMemo(() => {
    const subtotal = lineas.reduce((s, l) => s + l.cantidad * l.precioUnitario * (1 - l.descuentoPct / 100), 0);
    const pct = Math.min(100, Math.max(0, descuentoGlobalPct || 0));
    const descAmt = (subtotal * pct) / 100;
    const baseDesc = subtotal - descAmt;
    const ivaCalc = baseDesc * 0.21;
    return { base: subtotal, descuentoAmt: descAmt, iva: ivaCalc, total: baseDesc + ivaCalc };
  }, [lineas, descuentoGlobalPct]);

  function cerrar(o: boolean) {
    if (enviando) return;
    if (!o) setRequestId(null);
    onOpenChange(o);
  }

  async function confirmar() {
    const lineasValidas = lineas.filter((l) => l.descripcion.trim() || l.precioUnitario);
    if (lineasValidas.length === 0) return toast.error("Añade al menos un concepto");
    if (!metodo) return toast.error("Selecciona el método de pago");
    if (metodo === "tarjeta" && !banco) return toast.error("Selecciona el banco para el pago con tarjeta");
    if (!esEmailValido(email)) return toast.error("El email del cliente no tiene un formato válido");

    setEnviando(true);
    const rid = requestId || crypto.randomUUID();
    setRequestId(rid);
    try {
      const res = await fetch(`/api/reparaciones/${detalle.resguardo}/facturas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: rid,
          tipo: "normal",
          datos: {
            cliente: { nombre: nombre.trim(), direccion: direccion.trim(), dni: dni.trim(), telefono: telefono.trim(), email: email.trim(), codigo: codigo.trim() },
            formaPago: metodo,
            banco: metodo === "tarjeta" ? banco : "",
            // El descuento global solo afectaba a la vista previa en pantalla
            // y nunca llegaba a la factura real (bug detectado: el importe
            // final facturado no coincidía con el mostrado). Se envía ahora
            // como una línea propia negativa —igual que ya se hace con
            // "Descuento revisión pagada"— para que quede reflejado y
            // visible en el PDF, en vez de perderse silenciosamente.
            lineas: (() => {
              const base = lineasValidas.map((l) => ({
                referencia: l.referencia.trim(),
                descripcion: l.descripcion.trim(),
                cantidad: l.cantidad,
                precio: l.precioUnitario,
                descuento: l.descuentoPct,
              }));
              const pctGlobal = Math.min(100, Math.max(0, descuentoGlobalPct || 0));
              const importeGlobal = Math.round(descuentoAmt * 100) / 100;
              if (pctGlobal > 0 && importeGlobal > 0) {
                base.push({
                  referencia: "",
                  descripcion: `Descuento global (${pctGlobal}%)`,
                  cantidad: 1,
                  precio: -importeGlobal,
                  descuento: 0,
                });
              }
              return base;
            })(),
            estadoFactura,
            esBorrador: false,
          },
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Factura ${data.numeroFactura} generada correctamente`);
      if (data.url) window.open(data.url, "_blank");
      setRequestId(null);
      onOpenChange(false);
      onGenerada();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="max-w-6xl gap-0 p-0 sm:max-w-6xl" showCloseButton={false}>
        <CabeceraAzul titulo={`Factura — Ref. ${detalle.resguardo}`} onClose={() => cerrar(false)} />

        <ScrollArea className="max-h-[75vh]">
          <div className="space-y-4 bg-muted/30 p-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <CampoLectura label="Nº Factura" valor={numeroPreview || "…"} />
              <CampoLectura label="Fecha de factura" valor={fechaHoyCorta()} />
              <div className="space-y-1.5">
                <Label>Forma de pago *</Label>
                <Select value={metodo} onValueChange={(v) => { setMetodo(v || ""); if (v !== "tarjeta") setBanco(""); }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona —" /></SelectTrigger>
                  <SelectContent>
                    {METODOS_PAGO.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {metodo === "tarjeta" && (
                  <Select value={banco} onValueChange={(v) => setBanco(v || "")}>
                    <SelectTrigger className="mt-2 w-full"><SelectValue placeholder="— Selecciona banco —" /></SelectTrigger>
                    <SelectContent>
                      {BANCOS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select value={estadoFactura} onValueChange={(v) => setEstadoFactura(v || "Cobrada")}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cobrada">Cobrada</SelectItem>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
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
                      <Label htmlFor="vfDni" className="text-xs text-muted-foreground">DNI / CIF</Label>
                      <Input id="vfDni" className="h-8 text-sm" value={dni} onChange={(e) => setDni(e.target.value)} />
                      <Label htmlFor="vfCodigo" className="text-xs text-muted-foreground">Código</Label>
                      <Input id="vfCodigo" className="h-8 bg-muted/50 font-mono text-sm" maxLength={5} value={codigo} readOnly disabled />
                      <Label htmlFor="vfNombre" className="text-xs text-muted-foreground">Nombre</Label>
                      <Input id="vfNombre" className="h-8 text-sm" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                      <Label htmlFor="vfTel" className="text-xs text-muted-foreground">Teléfono</Label>
                      <Input id="vfTel" className="h-8 text-sm" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                      <Label htmlFor="vfEmail" className="text-xs text-muted-foreground">Email</Label>
                      <Input id="vfEmail" className="h-8 text-sm" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                      <Label htmlFor="vfDir" className="text-xs text-muted-foreground">Dirección</Label>
                      <Input id="vfDir" className="h-8 text-sm" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card shadow-sm">
                  <div className="flex items-center gap-1.5 rounded-t-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white">
                    Equipo / Servicio
                  </div>
                  <div className="space-y-1 p-3 text-xs">
                    <p><span className="text-muted-foreground">Modelo:</span> {detalle.equipo.modelo || "-"}</p>
                    <p><span className="text-muted-foreground">Síntoma:</span> {detalle.equipo.sintoma || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border bg-card shadow-sm">
                  <div className="flex items-center justify-between rounded-t-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
                    <span>Conceptos</span>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="secondary" className="h-6 gap-1 px-2 text-xs" onClick={() => setBuscarStockAbierto(true)}>
                        <Box1 className="size-3" /> Stock
                      </Button>
                      <Button size="sm" variant="secondary" className="h-6 gap-1 px-2 text-xs" onClick={() => setLineas((prev) => [...prev, lineaVacia()])}>
                        <Add className="size-3" /> Añadir línea
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs text-muted-foreground">
                        <tr>
                          <th className="w-20 p-2 text-left">Ref.</th>
                          <th className="p-2 text-left">Descripción</th>
                          <th className="w-14 p-2 text-center">Cant.</th>
                          <th className="w-16 p-2 text-center">Dto. %</th>
                          <th className="w-24 p-2 text-right">P. unit.</th>
                          <th className="w-24 p-2 text-right">Total</th>
                          <th className="w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {lineas.map((l, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-1">
                              <Input className="h-8 border-0 font-mono text-xs" value={l.referencia} onChange={(e) => actualizarLinea(i, "referencia", e.target.value)} />
                            </td>
                            <td className="p-1">
                              <Input className="h-8 border-0 text-sm" value={l.descripcion} onChange={(e) => actualizarLinea(i, "descripcion", e.target.value)} />
                            </td>
                            <td className="p-1">
                              <Input type="number" min={0} step={1} className="h-8 border-0 text-center text-sm" value={l.cantidad} onChange={(e) => actualizarLinea(i, "cantidad", parseFloat(e.target.value) || 0)} />
                            </td>
                            <td className="p-1">
                              <Input type="number" min={0} max={100} step={1} className="h-8 border-0 text-center text-sm" value={l.descuentoPct || ""} placeholder="0" onChange={(e) => actualizarLinea(i, "descuentoPct", Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} />
                            </td>
                            <td className="p-1">
                              <Input type="number" step={0.01} className="h-8 border-0 text-right text-sm" value={l.precioUnitario} onChange={(e) => actualizarLinea(i, "precioUnitario", parseFloat(e.target.value) || 0)} />
                            </td>
                            <td className="p-2 text-right whitespace-nowrap">{euros(l.cantidad * l.precioUnitario * (1 - l.descuentoPct / 100))}</td>
                            <td className="p-1 text-center">
                              <Button size="icon-sm" variant="ghost" className="text-destructive" onClick={() => setLineas((prev) => prev.filter((_, idx) => idx !== i))}>
                                <Trash className="size-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/30 text-sm">
                        <tr>
                          <td colSpan={4} className="p-1.5 text-right text-xs text-muted-foreground">Base imponible</td>
                          <td className="p-1.5 text-right font-semibold" colSpan={3}>{euros(base)}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="p-1.5 text-right text-xs text-muted-foreground">Descuento global</td>
                          <td className="p-1.5">
                            <div className="flex items-center justify-end gap-1">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.5}
                                className="h-7 w-14 border-0 bg-transparent text-right text-xs"
                                value={descuentoGlobalPct}
                                onChange={(e) => setDescuentoGlobalPct(parseFloat(e.target.value) || 0)}
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                            </div>
                          </td>
                          <td className="p-1.5 text-right text-xs text-muted-foreground" colSpan={2}>{euros(descuentoAmt)}</td>
                        </tr>
                        <tr>
                          <td colSpan={4} className="p-1.5 text-right text-xs text-muted-foreground">IVA (21%)</td>
                          <td className="p-1.5 text-right" colSpan={3}>{euros(iva)}</td>
                        </tr>
                        <tr className="bg-primary/10">
                          <td colSpan={4} className="p-1.5 text-right font-bold">TOTAL</td>
                          <td className="p-1.5 text-right text-base font-bold" colSpan={3}>{euros(total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {lineas.length > 8 && (
                  <p className="rounded-md bg-sky-500/10 px-3 py-2 text-xs text-sky-800 dark:text-sky-400">
                    Más de 8 conceptos: el PDF se generará en 2 páginas.
                  </p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <footer className="flex justify-end gap-2 border-t bg-muted/50 px-4 py-3">
          <Button variant="outline" onClick={() => cerrar(false)} disabled={enviando}>Cancelar</Button>
          <Button onClick={confirmar} disabled={enviando}>
            {enviando ? "Generando…" : "Generar Factura"}
          </Button>
        </footer>
      </DialogContent>

      <BuscarClienteDialog open={buscarClienteAbierto} onOpenChange={setBuscarClienteAbierto} onSeleccionar={seleccionarCliente} />
      <BuscarPiezaStockDialog open={buscarStockAbierto} onOpenChange={setBuscarStockAbierto} onSeleccionar={agregarLineaDesdeStock} />
    </Dialog>
  );
}
