"use client";

import { useEffect, useState } from "react";
import { Refresh2, TickCircle, CloseCircle, DocumentText, Calendar, Clock, Warning2, InfoCircle, Send2 } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatearFecha } from "@/lib/dias-entrega";
import { Equipo, EstadoDevolucionEquipo } from "@/lib/equipos";
import { esEmailValido } from "@/lib/validacion";
import {
  calcularLiquidacionPuntual,
  calcularDuracionDesdeFechas,
  calcularLiquidacionAjuste,
  calcularAjustePorDias,
  type ResultadoFacturaAlquiler,
} from "@/lib/alquiler-factura";

const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta bancaria" },
  { value: "transferencia", label: "Transferencia" },
  { value: "bizum", label: "Bizum" },
];
const BANCOS = ["Santander", "Sabadell", "BBVA", "CaixaBank"];

function euros(n: number): string {
  return (n || 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function Badge({ tono, children }: { tono: "gris" | "rojo" | "verde"; children: React.ReactNode }) {
  const clases = tono === "rojo" ? "bg-destructive text-white" : tono === "verde" ? "bg-emerald-600 text-white" : "bg-muted-foreground/70 text-white";
  return <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${clases}`}>{children}</span>;
}

function FilaTabla({ etiqueta, valor, clase, fuerte }: { etiqueta: React.ReactNode; valor: React.ReactNode; clase?: string; fuerte?: boolean }) {
  return (
    <tr className={fuerte ? "border-t" : ""}>
      <td className={`py-0.5 pr-2 ${fuerte ? "font-semibold" : "text-muted-foreground"} ${clase || ""}`}>{etiqueta}</td>
      <td className={`py-0.5 text-right ${fuerte ? "font-semibold" : ""} ${clase || ""}`}>{valor}</td>
    </tr>
  );
}

/**
 * Reproduce la tarjeta "Ajuste de días" de recalcularDevolucion()/
 * devRecalcularAjuste() (vistas_equipos.html.html) — misma tabla en los dos
 * paneles (puntual y ajuste), solo cambia si es informativa (puntual: la
 * diferencia de días siempre es 0 porque la fecha va bloqueada a la fecha
 * fin prevista) o si además hace falta el checkbox (no aplica en ninguno
 * de los dos casos reales: en "puntual" es puramente informativa, y en
 * "ajuste" siempre se genera, sin opción de desmarcarla — igual que el
 * original, que no le pone checkbox en el panel de ajuste).
 */
function TarjetaAjusteDias({
  numeroFactura,
  totalOriginal,
  totalNuevo,
  diasDiferencia,
}: {
  numeroFactura: string;
  totalOriginal: number;
  totalNuevo: number;
  diasDiferencia: number;
}) {
  if (!numeroFactura && !totalOriginal) return null;
  const absD = Math.abs(diasDiferencia);
  const diffTxt = diasDiferencia === 0 ? "Sin diferencia de días" : diasDiferencia > 0 ? `${absD} día${absD > 1 ? "s" : ""} de retraso` : `${absD} día${absD > 1 ? "s" : ""} de adelanto`;
  const diferencia = parseFloat((totalOriginal - totalNuevo).toFixed(2));
  const difColor = diferencia > 0.01 ? "text-emerald-700 dark:text-emerald-400" : diferencia < -0.01 ? "text-destructive" : "text-muted-foreground";
  const difLabel = diferencia > 0.01 ? "A devolver al cliente" : diferencia < -0.01 ? "A cobrar al cliente" : "Sin diferencia";

  return (
    <div className="rounded-md border bg-card p-2">
      <div className="mb-1 flex flex-wrap items-center text-xs font-semibold">
        <Calendar className="mr-1 size-3.5 text-muted-foreground" />Ajuste de días
        <Badge tono="gris">{diffTxt}</Badge>
        <Badge tono="rojo">Rectificativa + nueva factura</Badge>
      </div>
      <table className="ml-4 w-full max-w-sm text-xs">
        <tbody>
          <FilaTabla etiqueta={<>Factura original <code>{numeroFactura ? `#${numeroFactura}` : "—"}</code></>} valor={totalOriginal ? euros(totalOriginal) : "—"} />
          <FilaTabla etiqueta={<span className="text-destructive"><CloseCircle className="mr-1 inline size-3" />Rectificativa (anula)</span>} valor={<span className="text-destructive">−{totalOriginal ? euros(totalOriginal) : "—"}</span>} />
          <FilaTabla etiqueta={<span className="text-emerald-700 dark:text-emerald-400"><DocumentText className="mr-1 inline size-3" />Nueva factura</span>} valor={<span className="text-emerald-700 dark:text-emerald-400">{euros(totalNuevo)}</span>} />
          <FilaTabla etiqueta={difLabel} valor={diferencia !== 0 ? euros(Math.abs(diferencia)) : "0,00 €"} clase={difColor} fuerte />
        </tbody>
      </table>
    </div>
  );
}

/**
 * Reproduce la tarjeta "Devolución de fianza" — con checkbox solo en el
 * panel puntual (ahí SÍ es opcional: si no hay ajuste de días, es la única
 * forma de generar algo); en el panel de ajuste va siempre incluida en la
 * rectificativa principal, sin checkbox, igual que el original.
 */
function TarjetaDevolucionFianza({
  fianzaCobrada,
  descuentoDanos,
  ajusteImporte,
  fianzaDevolver,
  incluidaEnRectificativa,
  checkbox,
}: {
  fianzaCobrada: number;
  descuentoDanos: number;
  ajusteImporte: number;
  fianzaDevolver: number;
  incluidaEnRectificativa: boolean;
  checkbox?: { checked: boolean; onCheckedChange: (v: boolean) => void };
}) {
  if (fianzaCobrada <= 0) return null;
  const IVA_M = 1.21;
  const fianzaGross = Math.round(fianzaCobrada * IVA_M * 100) / 100;
  const ajusteGross = Math.round(Math.abs(ajusteImporte) * IVA_M * 100) / 100;
  const danosGross = Math.round(descuentoDanos * IVA_M * 100) / 100;
  const devolverGross = Math.round(Math.max(0, fianzaDevolver) * IVA_M * 100) / 100;

  return (
    <div className={`rounded-md border bg-card p-2 ${incluidaEnRectificativa ? "opacity-75" : ""}`}>
      <div className="mb-1 flex flex-wrap items-center text-xs font-semibold text-muted-foreground">
        {checkbox ? (
          <label className="flex items-center gap-1.5">
            <Checkbox checked={checkbox.checked} onCheckedChange={(v) => checkbox.onCheckedChange(!!v)} />
            <span>Devolución de fianza</span>
          </label>
        ) : (
          <><InfoCircle className="mr-1 size-3.5 text-primary" />Devolución de fianza</>
        )}
        {incluidaEnRectificativa ? <Badge tono="gris">incluida en la rectificativa</Badge> : <Badge tono="verde">Rectificativa de fianza</Badge>}
      </div>
      <table className="ml-4 w-full max-w-sm text-xs">
        <tbody>
          <FilaTabla etiqueta="Fianza cobrada (IVA incl.)" valor={euros(fianzaGross)} />
          {descuentoDanos > 0 && <FilaTabla etiqueta="Descuento por daños" valor={<span className="text-destructive">−{euros(danosGross)}</span>} clase="text-destructive" />}
          {ajusteImporte !== 0 && (
            <FilaTabla
              etiqueta={ajusteImporte > 0 ? "Cargo por retraso" : "Abono por adelanto"}
              valor={`${ajusteImporte > 0 ? "−" : "+"} ${euros(ajusteGross)}`}
              clase={ajusteImporte > 0 ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}
            />
          )}
          <FilaTabla etiqueta="A devolver al cliente" valor={euros(devolverGross)} clase="text-emerald-700 dark:text-emerald-400" fuerte />
        </tbody>
      </table>
    </div>
  );
}

function NotaLogistica({ icono, titulo, detalle }: { icono: React.ReactNode; titulo: string; detalle: string }) {
  return (
    <div className="flex items-start gap-1.5 rounded-md bg-primary/5 px-2.5 py-1.5 text-xs text-muted-foreground">
      {icono}
      <span><strong className="text-foreground">{titulo}:</strong> {detalle}</span>
    </div>
  );
}

type Paso = "pregunta" | "puntual" | "ajuste" | "resumen";

/**
 * Reproduce el modal #modalDevolverEquipo del original
 * (abrirModalDevolver/devResponderTiempo/recalcularDevolucion/
 * devRecalcularAjuste/devGenerarDocumentosAjuste/devGenerarAjusteCompleto)
 * — cabecera, caja de info del equipo, pregunta inicial, y las dos rutas
 * (puntual / ajuste) con sus tarjetas de Facturación tal cual el original,
 * incluido el checkbox opcional de "Devolución de fianza" en el caso
 * puntual (si no hay fianza que devolver, se registra la devolución sin
 * generar ningún documento — igual que el original).
 */
export function DevolverAlquilerDialog({
  equipo,
  open,
  onOpenChange,
  onDevuelto,
}: {
  equipo: Equipo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDevuelto: () => void;
}) {
  const [paso, setPaso] = useState<Paso>("pregunta");
  const [estadoDevolucion, setEstadoDevolucion] = useState<EstadoDevolucionEquipo>("BUENO");
  const [descuentoDanos, setDescuentoDanos] = useState(0);
  const [fechaAjuste, setFechaAjuste] = useState(new Date().toISOString().slice(0, 10));
  const [email, setEmail] = useState("");
  const [metodo, setMetodo] = useState("");
  const [banco, setBanco] = useState("");
  const [chkFianza, setChkFianza] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResultadoFacturaAlquiler | null>(null);

  const alq = equipo?.alquilerActivo ?? null;

  useEffect(() => {
    if (open && alq) {
      setPaso("pregunta");
      setEstadoDevolucion("BUENO");
      setDescuentoDanos(0);
      setFechaAjuste(new Date().toISOString().slice(0, 10));
      setEmail(alq.clienteEmail || "");
      setMetodo("");
      setBanco("");
      setChkFianza(true);
      setRequestId(null);
      setResumen(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, alq?.alquilerId]);

  if (!alq || !equipo) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gap-0 p-0 sm:max-w-md" showCloseButton={false}>
          <header className="flex items-center gap-2 rounded-t-xl bg-emerald-600 px-4 py-3 text-white">
            <Refresh2 className="size-4.5 shrink-0" />
            <DialogTitle className="text-sm font-semibold text-white">Devolver equipo</DialogTitle>
            <Button variant="ghost" size="icon-sm" className="ml-auto text-white hover:bg-white/15 hover:text-white" onClick={() => onOpenChange(false)}>
              <CloseCircle className="size-4" />
            </Button>
          </header>
          <p className="p-4 text-sm text-muted-foreground">Sin alquiler activo para este equipo.</p>
        </DialogContent>
      </Dialog>
    );
  }

  const tarifas = { precioDia: alq.precioDia, precioSemana: alq.precioSemana, precioMes: alq.precioMes };
  const fechaPuntual = alq.fechaFinPrevista ? alq.fechaFinPrevista.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const liquidacion = calcularLiquidacionPuntual(fechaPuntual, alq.fechaFinPrevista, alq.fianzaCobrada, descuentoDanos, tarifas);
  const duracionReal = alq.fechaInicio ? calcularDuracionDesdeFechas(alq.fechaInicio.slice(0, 10), fechaAjuste) : { meses: 0, semanas: 0, dias: 0 };
  const liquidacionAjuste = calcularLiquidacionAjuste(duracionReal, tarifas);
  const hayFianza = alq.fianzaCobrada > 0;
  const equipoNombre = `${equipo.marca} ${equipo.modelo}`.trim();
  const clienteFactura = { nombre: alq.clienteNombre, direccion: alq.clienteDireccion, dni: alq.clienteDNI, telefono: alq.clienteTelefono };
  const alquilerId = alq.alquilerId;
  const fianzaCobrada = alq.fianzaCobrada;

  // Panel "ajuste": diferencia respecto a la fecha prevista, para la
  // tarjeta de Ajuste de días y para saber si hay que cargar/abonar en la
  // fianza — misma fórmula que devRecalcularAjuste() (_calcTarifario sobre
  // el nº de días absoluto, con signo según retraso/adelanto), reutilizando
  // calcularAjustePorDias() ya usado más arriba para la liquidación puntual.
  const { diasDiferencia: diasDiffAjuste, ajusteImporte: ajusteImporteAjuste } = calcularAjustePorDias(fechaAjuste, alq.fechaFinPrevista, tarifas);
  const fianzaDevolverAjuste = Math.max(0, fianzaCobrada - ajusteImporteAjuste);

  function cerrar(o: boolean) {
    if (enviando) return;
    onOpenChange(o);
  }

  async function registrarDevolucion(extra: {
    fechaDevolucion: string;
    estadoDevolucion: EstadoDevolucionEquipo;
    descuentoDanos: number;
    fianzaDevuelta: number;
    totalCobrado: number;
    diasDiferencia: number;
  }) {
    const res = await fetch(`/api/alquileres/${alquilerId}/devolver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipoId: equipo!.id, datos: extra }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Error desconocido al registrar la devolución");
  }

  function validarFacturacion(): boolean {
    if (!email.trim()) { toast.error("Indica el email del cliente"); return false; }
    if (!esEmailValido(email)) { toast.error("El email no tiene un formato válido"); return false; }
    if (!metodo) { toast.error("Selecciona el método de pago"); return false; }
    if (metodo === "tarjeta" && !banco) { toast.error("Selecciona el banco para el pago con tarjeta"); return false; }
    return true;
  }

  async function confirmarPuntual() {
    // Reproduce devGenerarDocumentosAjuste(): con fianza a liquidar, hace
    // falta el checkbox marcado (es el único documento posible aquí, ya
    // que el ajuste de días siempre es "0" con la fecha bloqueada) — sin
    // fianza no hay nada que elegir y se registra la devolución directa.
    if (hayFianza) {
      if (!chkFianza) return toast.error("Selecciona al menos un documento a generar");
      if (!validarFacturacion()) return;
    }

    setEnviando(true);
    const rid = requestId || crypto.randomUUID();
    setRequestId(rid);
    try {
      let doc: ResultadoFacturaAlquiler = {};
      if (hayFianza && chkFianza) {
        const res = await fetch(`/api/alquileres/${alquilerId}/facturas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: "rectificativa_fianza",
            requestId: rid,
            cliente: clienteFactura,
            formaPago: metodo,
            banco: metodo === "tarjeta" ? banco : "",
            fianza: fianzaCobrada,
            equipoNombre,
          }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Error desconocido");
        doc = data;
      }

      await registrarDevolucion({
        fechaDevolucion: fechaPuntual,
        estadoDevolucion,
        descuentoDanos,
        fianzaDevuelta: liquidacion.fianzaDevolver,
        totalCobrado: liquidacion.cobrarExtra,
        diasDiferencia: 0,
      });

      toast.success(doc.numeroFactura ? `Devolución registrada — rectificativa ${doc.numeroFactura}` : "Devolución registrada");
      setResumen(doc);
      setPaso("resumen");
      onDevuelto();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  async function confirmarAjuste() {
    if (duracionReal.meses + duracionReal.semanas + duracionReal.dias <= 0) {
      toast.error("La fecha de devolución debe ser posterior al inicio del alquiler");
      return;
    }
    if (!validarFacturacion()) return;

    setEnviando(true);
    const rid = requestId || crypto.randomUUID();
    setRequestId(rid);
    try {
      const res = await fetch(`/api/alquileres/${alquilerId}/facturas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "ajuste_duracion",
          requestId: rid,
          cliente: clienteFactura,
          formaPago: metodo,
          banco: metodo === "tarjeta" ? banco : "",
          equipoNombre,
          duracionReal,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");

      await registrarDevolucion({
        fechaDevolucion: fechaAjuste,
        estadoDevolucion: "BUENO",
        descuentoDanos: 0,
        fianzaDevuelta: data.fianzaDevuelta || 0,
        totalCobrado: 0,
        diasDiferencia: 0,
      });

      toast.success(`Devolución registrada — rectificativa ${data.rectificativa?.numero} + nueva factura ${data.nueva?.numero}`);
      setResumen(data);
      setPaso("resumen");
      onDevuelto();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="gap-0 max-w-lg p-0 sm:max-w-lg" showCloseButton={false}>
        <header className="flex items-center gap-2 rounded-t-xl bg-emerald-600 px-4 py-3 text-white">
          <Refresh2 className="size-4.5 shrink-0" />
          <DialogTitle className="text-sm font-semibold text-white">Devolver equipo</DialogTitle>
          <Button variant="ghost" size="icon-sm" className="ml-auto text-white hover:bg-white/15 hover:text-white" onClick={() => cerrar(false)} disabled={enviando}>
            <CloseCircle className="size-4" />
          </Button>
        </header>

        <div className="max-h-[75vh] space-y-3 overflow-y-auto p-4">
          <div className="rounded-md bg-sky-50 px-3 py-2 text-sm dark:bg-sky-500/10">
            <p className="font-bold">{equipoNombre}</p>
            <p className="text-xs text-muted-foreground">
              Cliente: {alq.clienteNombre || "—"} · Desde: {formatearFecha(alq.fechaInicio)} · Hasta (prevista): {formatearFecha(alq.fechaFinPrevista)} · Tarifa/día: {euros(alq.precioDia)}
            </p>
          </div>

          {paso === "pregunta" && (
            <div className="space-y-4 py-3 text-center">
              <p className="font-semibold">¿El cliente devolvió el equipo en el tiempo pactado?</p>
              <div className="flex justify-center gap-3">
                <Button className="gap-1.5 bg-emerald-600 px-4 text-white hover:bg-emerald-700" onClick={() => setPaso("puntual")}>
                  <TickCircle className="size-4" /> Sí
                </Button>
                <Button className="gap-1.5 bg-amber-500 px-4 text-white hover:bg-amber-600" onClick={() => setPaso("ajuste")}>
                  <CloseCircle className="size-4" /> No
                </Button>
              </div>
            </div>
          )}

          {paso === "puntual" && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Fecha devolución real *</Label>
                  <Input value={fechaPuntual} disabled className="bg-muted/50" />
                </div>
                <div className="space-y-1.5">
                  <Label>Estado del equipo al devolver *</Label>
                  <Select value={estadoDevolucion} onValueChange={(v) => setEstadoDevolucion((v as EstadoDevolucionEquipo) || "BUENO")}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUENO">✅ Bien</SelectItem>
                      <SelectItem value="DAÑOS_MENORES">⚠️ Con daños menores</SelectItem>
                      <SelectItem value="ROTO">❌ Roto o dañado grave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {estadoDevolucion !== "BUENO" && (
                <div className="space-y-1.5">
                  <Label htmlFor="descuentoDanos">Importe por daños (€) — se descontará de la fianza</Label>
                  <Input id="descuentoDanos" type="number" min={0} step="0.01" value={descuentoDanos} onChange={(e) => setDescuentoDanos(parseFloat(e.target.value) || 0)} />
                  <p className="text-xs text-muted-foreground">Ejemplo: si se rompió la pantalla y el coste es 80€, pon 80</p>
                </div>
              )}

              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><DocumentText className="size-4" /> Liquidación</p>
                <table className="w-full text-sm">
                  <tbody>
                    <FilaTabla etiqueta="Fianza cobrada inicialmente" valor={euros(alq.fianzaCobrada)} />
                    {liquidacion.diasDiferencia === 0 ? (
                      <FilaTabla etiqueta="Sin retraso ni adelanto" valor="0,00 €" />
                    ) : liquidacion.diasDiferencia > 0 ? (
                      <FilaTabla
                        etiqueta={<span className="text-destructive">Retraso ({liquidacion.diasDiferencia} día{liquidacion.diasDiferencia > 1 ? "s" : ""})</span>}
                        valor={<span className="text-destructive">−{euros(liquidacion.ajusteImporte)}</span>}
                      />
                    ) : (
                      <FilaTabla
                        etiqueta={<span className="text-emerald-700 dark:text-emerald-400">Adelanto ({Math.abs(liquidacion.diasDiferencia)} día{Math.abs(liquidacion.diasDiferencia) > 1 ? "s" : ""})</span>}
                        valor={<span className="text-emerald-700 dark:text-emerald-400">+{euros(Math.abs(liquidacion.ajusteImporte))}</span>}
                      />
                    )}
                    {descuentoDanos > 0 && <FilaTabla etiqueta="Descuento por daños" valor={<span className="text-destructive">−{euros(descuentoDanos)}</span>} />}
                    {liquidacion.cobrarExtra > 0 ? (
                      <FilaTabla etiqueta="Cobrar extra al cliente" valor={<span className="text-lg text-destructive">{euros(liquidacion.cobrarExtra)}</span>} fuerte clase="bg-red-50 dark:bg-red-500/10" />
                    ) : (
                      <FilaTabla etiqueta="Fianza a devolver al cliente" valor={<span className="text-lg">{euros(liquidacion.fianzaDevolver)}</span>} fuerte clase="bg-emerald-50 dark:bg-emerald-500/10" />
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-start gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
                <Warning2 className="mt-0.5 size-3.5 shrink-0" />
                Si el equipo necesita <strong>mantenimiento</strong> o está <strong>fuera de servicio</strong>, lo puedes cambiar después desde la ficha del equipo con el botón &quot;Cambiar estado&quot;.
              </div>

              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-sm font-semibold"><DocumentText className="size-4 text-primary" /> Facturación</p>
                <p className="text-xs text-muted-foreground">Elige qué documentos generar:</p>
                <div className="space-y-2">
                  <TarjetaAjusteDias numeroFactura={alq.numeroFactura} totalOriginal={alq.totalPrevisto} totalNuevo={alq.totalPrevisto} diasDiferencia={0} />
                  <TarjetaDevolucionFianza
                    fianzaCobrada={alq.fianzaCobrada}
                    descuentoDanos={descuentoDanos}
                    ajusteImporte={0}
                    fianzaDevolver={liquidacion.fianzaDevolver}
                    incluidaEnRectificativa={false}
                    checkbox={{ checked: chkFianza, onCheckedChange: setChkFianza }}
                  />
                  {!alq.numeroFactura && !alq.totalPrevisto && !hayFianza && (
                    <p className="text-xs text-muted-foreground"><InfoCircle className="mr-1 inline size-3.5" />Sin factura original registrada — no se generará rectificativa.</p>
                  )}
                </div>
                {alq.recogidaActivada && (
                  <NotaLogistica icono={<Send2 className="mt-0.5 size-3.5 shrink-0 text-primary" />} titulo="Recogida a domicilio (15,00 € con IVA)" detalle="ya facturada al inicio del alquiler." />
                )}
              </div>

              {hayFianza && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="emailPuntual">Email del cliente</Label>
                    <Input id="emailPuntual" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Método de pago</Label>
                    <Select value={metodo} onValueChange={(v) => { setMetodo(v || ""); if (v !== "tarjeta") setBanco(""); }}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona —" /></SelectTrigger>
                      <SelectContent>
                        {METODOS_PAGO.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {metodo === "tarjeta" && (
                    <div className="space-y-1.5">
                      <Label>Banco</Label>
                      <Select value={banco} onValueChange={(v) => setBanco(v || "")}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona banco —" /></SelectTrigger>
                        <SelectContent>
                          {BANCOS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {paso === "ajuste" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
                <Warning2 className="mt-0.5 size-4 shrink-0" />
                Indica la duración real del alquiler. Se generará una rectificativa de la factura original y una nueva factura con los importes correctos.
              </div>

              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Clock className="size-4 text-primary" /> Duración real</p>
                <div className="space-y-1.5">
                  <Label htmlFor="fechaAjuste">Fecha devolución real *</Label>
                  <Input id="fechaAjuste" type="date" value={fechaAjuste} min={alq.fechaInicio?.slice(0, 10)} onChange={(e) => setFechaAjuste(e.target.value)} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                  <div><p>Meses</p><p className="font-semibold text-foreground">{duracionReal.meses}</p></div>
                  <div><p>Semanas</p><p className="font-semibold text-foreground">{duracionReal.semanas}</p></div>
                  <div><p>Días</p><p className="font-semibold text-foreground">{duracionReal.dias}</p></div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 border-t pt-2 text-center text-xs text-muted-foreground">
                  <div><p>Subtotal</p><p className="font-semibold text-foreground">{euros(liquidacionAjuste.subtotal)}</p></div>
                  <div><p>IVA (21%)</p><p className="font-semibold text-foreground">{euros(liquidacionAjuste.iva)}</p></div>
                  <div><p>Total a cobrar</p><p className="font-semibold text-emerald-700 dark:text-emerald-400">{euros(liquidacionAjuste.total)}</p></div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-sm font-semibold"><DocumentText className="size-4 text-primary" /> Facturación</p>
                <div className="space-y-2">
                  <TarjetaAjusteDias numeroFactura={alq.numeroFactura} totalOriginal={alq.totalPrevisto} totalNuevo={liquidacionAjuste.total} diasDiferencia={diasDiffAjuste} />
                  <TarjetaDevolucionFianza
                    fianzaCobrada={alq.fianzaCobrada}
                    descuentoDanos={0}
                    ajusteImporte={ajusteImporteAjuste}
                    fianzaDevolver={fianzaDevolverAjuste}
                    incluidaEnRectificativa
                  />
                </div>
                {alq.envioActivado && (
                  <NotaLogistica icono={<Send2 className="mt-0.5 size-3.5 shrink-0 text-primary" />} titulo="Envío a domicilio (15,00 € con IVA)" detalle="ya facturado y prestado — no se incluye en la rectificativa ni en la nueva factura." />
                )}
                {alq.recogidaActivada && (
                  <NotaLogistica icono={<Send2 className="mt-0.5 size-3.5 shrink-0 text-primary" />} titulo="Recogida a domicilio (15,00 € con IVA)" detalle="ya facturada al inicio del alquiler — no se incluye en la rectificativa ni en la nueva factura." />
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="emailAjuste">Email del cliente *</Label>
                  <Input id="emailAjuste" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Método de pago *</Label>
                  <Select value={metodo} onValueChange={(v) => { setMetodo(v || ""); if (v !== "tarjeta") setBanco(""); }}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona —" /></SelectTrigger>
                    <SelectContent>
                      {METODOS_PAGO.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {metodo === "tarjeta" && (
                  <div className="space-y-1.5">
                    <Label>Banco *</Label>
                    <Select value={banco} onValueChange={(v) => setBanco(v || "")}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona banco —" /></SelectTrigger>
                      <SelectContent>
                        {BANCOS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          {paso === "resumen" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
                <TickCircle className="size-4 shrink-0" /> Devolución registrada correctamente
              </div>
              <div className="space-y-1.5 text-sm">
                {resumen?.numeroFactura && (
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>Rectificativa de fianza</span>
                    <span className="flex items-center gap-2 font-semibold">
                      {resumen.numeroFactura}
                      {resumen.url && <a href={resumen.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver PDF</a>}
                    </span>
                  </div>
                )}
                {resumen?.rectificativa && (
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>Factura rectificativa</span>
                    <span className="flex items-center gap-2 font-semibold">
                      {resumen.rectificativa.numero}
                      {resumen.rectificativa.url && <a href={resumen.rectificativa.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver PDF</a>}
                    </span>
                  </div>
                )}
                {resumen?.nueva && (
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>Nueva factura</span>
                    <span className="flex items-center gap-2 font-semibold">
                      {resumen.nueva.numero}
                      {resumen.nueva.url && <a href={resumen.nueva.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver PDF</a>}
                    </span>
                  </div>
                )}
                {resumen?.totalNuevo != null && (
                  <div className="flex justify-between rounded-md bg-amber-50 px-3 py-2 dark:bg-amber-500/10"><span>Total a cobrar (nueva factura)</span><span className="font-semibold">{euros(resumen.totalNuevo)}</span></div>
                )}
                {resumen?.fianzaDevuelta != null && (
                  <div className="flex justify-between rounded-md bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10"><span>Fianza devuelta al cliente</span><span className="font-semibold">{euros(resumen.fianzaDevuelta)}</span></div>
                )}
                {!resumen?.numeroFactura && !resumen?.rectificativa && (
                  <p className="text-muted-foreground">No hizo falta generar ningún documento — la fianza cobrada era 0 €.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t bg-muted/50 px-4 py-3">
          {paso === "resumen" ? (
            <Button onClick={() => cerrar(false)}>Cerrar</Button>
          ) : paso === "pregunta" ? (
            <Button variant="outline" onClick={() => cerrar(false)}>Cancelar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setPaso("pregunta")} disabled={enviando}>Volver</Button>
              <Button
                className={paso === "ajuste" ? "gap-1.5 bg-amber-500 text-white hover:bg-amber-600" : "gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"}
                onClick={paso === "ajuste" ? confirmarAjuste : confirmarPuntual}
                disabled={enviando}
              >
                <TickCircle className="size-4" />
                {enviando ? "Generando…" : paso === "ajuste" ? "Registrar devolución y generar facturas" : "Generar, enviar y registrar devolución"}
              </Button>
              {paso === "ajuste" && (
                <Button variant="secondary" disabled title="Envío desactivado temporalmente" className="gap-1.5">
                  <Send2 className="size-4" /> Enviar al cliente
                </Button>
              )}
            </>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  );
}
