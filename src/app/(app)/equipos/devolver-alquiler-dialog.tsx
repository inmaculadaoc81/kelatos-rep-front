"use client";

import { useEffect, useState } from "react";
import { BoxTick, TickCircle, CloseCircle, DocumentText, Calendar, Warning2 } from "@/lib/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Equipo, EstadoDevolucionEquipo } from "@/lib/equipos";
import {
  calcularLiquidacionPuntual,
  calcularDuracionDesdeFechas,
  calcularLiquidacionAjuste,
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

type Paso = "pregunta" | "puntual" | "ajuste" | "resumen";

/**
 * Reproduce el modal #modalDevolverEquipo del original
 * (abrirModalDevolver/devResponderTiempo/recalcularDevolucion/
 * devRecalcularAjuste/devGenerarDocumentosAjuste/devGenerarAjusteCompleto):
 * primero pregunta si la devolución fue puntual. Si sí, solo hay que
 * liquidar la fianza (menos retraso/daños) — se genera una rectificativa
 * de fianza si hay algo que devolver. Si no, hay que recalcular la
 * factura completa con la duración real: rectificativa que anula la
 * factura original + nueva factura con el importe correcto.
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
      setRequestId(null);
      setResumen(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, alq?.alquilerId]);

  if (!alq || !equipo) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sin alquiler activo</DialogTitle>
          </DialogHeader>
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
  // Se extraen a variables propias (en vez de leer `alq.x` dentro de los
  // closures async de más abajo) porque TypeScript no propaga el
  // estrechamiento de `alq` (de AlquilerResumen|null a AlquilerResumen) a
  // funciones anidadas definidas después del return anticipado.
  const alquilerId = alq.alquilerId;
  const fianzaCobrada = alq.fianzaCobrada;

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
    if (!metodo) { toast.error("Selecciona el método de pago"); return false; }
    if (metodo === "tarjeta" && !banco) { toast.error("Selecciona el banco para el pago con tarjeta"); return false; }
    return true;
  }

  async function confirmarPuntual() {
    // Sin fianza no hay nada que rectificar — el original deja este caso
    // sin ningún botón funcional; aquí se registra la devolución directamente.
    if (hayFianza && !validarFacturacion()) return;

    setEnviando(true);
    const rid = requestId || crypto.randomUUID();
    setRequestId(rid);
    try {
      let doc: ResultadoFacturaAlquiler = {};
      if (hayFianza) {
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
      <DialogContent className="max-w-lg sm:max-w-lg" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BoxTick className="size-5" /> Devolver — {equipoNombre}
          </DialogTitle>
        </DialogHeader>

        {paso === "pregunta" && (
          <div className="space-y-4 py-2 text-center">
            <p className="font-medium">¿El cliente devolvió el equipo en el tiempo pactado?</p>
            <div className="flex justify-center gap-3">
              <Button className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setPaso("puntual")}>
                <TickCircle className="size-4" /> Sí
              </Button>
              <Button variant="outline" className="gap-1.5 border-amber-500 text-amber-600 hover:bg-amber-50" onClick={() => setPaso("ajuste")}>
                <CloseCircle className="size-4" /> No
              </Button>
            </div>
          </div>
        )}

        {paso === "puntual" && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Fecha devolución real</Label>
                <Input value={fechaPuntual} disabled className="bg-muted/50" />
              </div>
              <div className="space-y-1.5">
                <Label>Estado del equipo al devolver</Label>
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
              </div>
            )}

            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="mb-2 flex items-center gap-1.5 font-semibold"><DocumentText className="size-4" /> Liquidación</p>
              <div className="space-y-1">
                <div className="flex justify-between"><span>Fianza cobrada inicialmente</span><span>{euros(alq.fianzaCobrada)}</span></div>
                {descuentoDanos > 0 && (
                  <div className="flex justify-between text-destructive"><span>Descuento por daños</span><span>−{euros(descuentoDanos)}</span></div>
                )}
                <hr className="my-1" />
                {liquidacion.cobrarExtra > 0 ? (
                  <div className="flex justify-between font-semibold text-destructive"><span>Cobrar extra al cliente</span><span>{euros(liquidacion.cobrarExtra)}</span></div>
                ) : (
                  <div className="flex justify-between font-semibold text-emerald-700 dark:text-emerald-400"><span>Fianza a devolver al cliente</span><span>{euros(liquidacion.fianzaDevolver)}</span></div>
                )}
              </div>
            </div>

            {hayFianza && (
              <>
                <p className="text-xs text-muted-foreground">
                  Se generará una factura rectificativa por la devolución de la fianza. Indica los datos de facturación:
                </p>
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
              </>
            )}
          </div>
        )}

        {paso === "ajuste" && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
              <Warning2 className="mt-0.5 size-4 shrink-0" />
              Indica la duración real del alquiler. Se generará una factura rectificativa de la original y una nueva factura con el importe correcto.
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fechaAjuste">Fecha devolución real</Label>
              <Input id="fechaAjuste" type="date" value={fechaAjuste} min={alq.fechaInicio?.slice(0, 10)} onChange={(e) => setFechaAjuste(e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3 text-center text-sm">
              <div><p className="text-xs text-muted-foreground">Meses</p><p className="font-semibold">{duracionReal.meses}</p></div>
              <div><p className="text-xs text-muted-foreground">Semanas</p><p className="font-semibold">{duracionReal.semanas}</p></div>
              <div><p className="text-xs text-muted-foreground">Días</p><p className="font-semibold">{duracionReal.dias}</p></div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3 text-center text-sm">
              <div><p className="text-xs text-muted-foreground">Subtotal</p><p className="font-semibold">{euros(liquidacionAjuste.subtotal)}</p></div>
              <div><p className="text-xs text-muted-foreground">IVA (21%)</p><p className="font-semibold">{euros(liquidacionAjuste.iva)}</p></div>
              <div><p className="text-xs text-muted-foreground">Total a cobrar</p><p className="font-semibold text-emerald-700 dark:text-emerald-400">{euros(liquidacionAjuste.total)}</p></div>
            </div>

            <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="size-3.5 shrink-0" /> Factura original {alq.numeroFactura ? `#${alq.numeroFactura}` : "—"} ({euros(alq.totalPrevisto)}) quedará anulada por la rectificativa.
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

        <DialogFooter>
          {paso === "resumen" ? (
            <Button onClick={() => cerrar(false)}>Cerrar</Button>
          ) : paso === "pregunta" ? (
            <Button variant="outline" onClick={() => cerrar(false)}>Cancelar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setPaso("pregunta")} disabled={enviando}>Volver</Button>
              <Button
                className={paso === "ajuste" ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-emerald-600 text-white hover:bg-emerald-700"}
                onClick={paso === "ajuste" ? confirmarAjuste : confirmarPuntual}
                disabled={enviando}
              >
                {enviando ? "Procesando…" : paso === "ajuste" ? "Registrar devolución y generar facturas" : "Generar y registrar devolución"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
