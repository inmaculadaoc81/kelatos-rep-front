"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ESTADOS_PROPUESTA, LEGAL_VACIO, eur, imprimirPropuesta, type DatosLegales, type Propuesta, type EstadoPropuesta, type PrecioPropuesta, type SeccionesPropuesta } from "@/lib/propuestas";

const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm";
const aLineas = (l?: string[]) => (l ?? []).join("\n");
const deLineas = (t: string) => t.split("\n").map((x) => x.trim()).filter(Boolean);

type Borrador = { titulo: string; cliente: string; contacto: string; email: string; resumen: string; diagnostico: string; solucion: string; alcance: string; plazos: string; pasos: string; precios: PrecioPropuesta[]; estado: EstadoPropuesta; legal: DatosLegales };

function aBorrador(p: Propuesta): Borrador {
  const s = p.secciones;
  return {
    titulo: p.titulo ?? "", cliente: p.cliente, contacto: p.contacto ?? "", email: p.email ?? "", resumen: s.resumen ?? "", diagnostico: s.diagnostico ?? "",
    solucion: aLineas(s.solucion), alcance: aLineas(s.alcance), plazos: s.plazos ?? "", pasos: aLineas(s.siguientes_pasos), precios: p.precios, estado: p.estado, legal: { ...LEGAL_VACIO, ...p.legal },
  };
}

/** Propuesta: se ve mientras la IA la redacta (~1 min), se edita todo y se exporta a PDF. */
export function PropuestaDialog({ id, onCerrar, onCambio }: { id: number; onCerrar: () => void; onCambio: () => void }) {
  const [p, setP] = useState<Propuesta | null>(null);
  const [b, setB] = useState<Borrador | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [tick, setTick] = useState(0);

  // Carga y, mientras la IA escribe, vuelve a preguntar cada 4 s. El formulario se rellena una sola vez cuando termina.
  useEffect(() => {
    let vigente = true;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      try {
        const d = await fetch(`/api/crm/propuestas/${id}`, { cache: "no-store" }).then((r) => r.json());
        if (!d.ok) throw new Error(d.error || "Error desconocido");
        if (!vigente) return;
        const nueva = d.propuesta as Propuesta;
        setP(nueva);
        setB((actual) => (nueva.estado === "generando" ? null : actual ?? aBorrador(nueva)));
        if (nueva.estado === "generando") temporizador = setTimeout(() => setTick((n) => n + 1), 4000);
      } catch (e) {
        if (vigente) setError(e instanceof Error ? e.message : "Error desconocido");
      }
    })();
    return () => { vigente = false; if (temporizador) clearTimeout(temporizador); };
  }, [id, tick]);

  const poner = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setB((x) => (x ? { ...x, [k]: v } : x));
  const ponerLegal = <K extends keyof DatosLegales>(k: K, v: DatosLegales[K]) => setB((x) => (x ? { ...x, legal: { ...x.legal, [k]: v } } : x));
  const cambiarPrecio = (i: number, parche: Partial<PrecioPropuesta>) => b && poner("precios", b.precios.map((x, j) => (j === i ? { ...x, ...parche } : x)));

  const totales = useCallback(() => {
    const base = Math.round((b?.precios ?? []).reduce((s, x) => s + (x.cantidad || 0) * (x.precio || 0), 0) * 100) / 100;
    const iva = Math.round(base * 0.21 * 100) / 100;
    return { base, iva, total: Math.round((base + iva) * 100) / 100 };
  }, [b?.precios])();

  async function guardar(silencioso = false): Promise<Propuesta | null> {
    if (!b) return null;
    setGuardando(true);
    try {
      const secciones: SeccionesPropuesta = { resumen: b.resumen, diagnostico: b.diagnostico, solucion: deLineas(b.solucion), alcance: deLineas(b.alcance), plazos: b.plazos, siguientes_pasos: deLineas(b.pasos) };
      const res = await fetch(`/api/crm/propuestas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: b.titulo, cliente: b.cliente, contacto: b.contacto, email: b.email, secciones, precios: b.precios, legal: b.legal, estado: b.estado === "error" ? "borrador" : b.estado }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "Error desconocido");
      setP(d.propuesta);
      onCambio();
      if (!silencioso) toast.success("Propuesta guardada");
      return d.propuesta as Propuesta;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
      return null;
    } finally {
      setGuardando(false);
    }
  }

  async function regenerar() {
    if (!window.confirm("¿Volver a redactar el texto con la IA? Se sustituye el texto actual (los precios se conservan).")) return;
    try {
      const d = await fetch(`/api/crm/propuestas/${id}/regenerar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then((r) => r.json());
      if (!d.ok) throw new Error(d.error || "Error desconocido");
      setB(null);
      setTick((n) => n + 1);
      onCambio();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  async function pdf() {
    const g = await guardar(true);
    if (g && !imprimirPropuesta(g)) toast.error("El navegador bloqueó la ventana: permite las ventanas emergentes para este sitio");
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !guardando) onCerrar(); }}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="pr-8 text-base">{p?.titulo || (p ? `Propuesta para ${p.cliente}` : "Propuesta")}</DialogTitle>
          <DialogDescription>{p ? `${p.cliente} · creada por ${p.creado_por}` : "Cargando…"}</DialogDescription>
        </DialogHeader>

        {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {!p && !error && <Skeleton className="h-40 w-full" />}

        {p?.estado === "generando" && (
          <div className="rounded-lg border bg-sky-50 px-4 py-6 text-center text-sm text-sky-900">
            <p className="font-medium">La IA está redactando la propuesta…</p>
            <p className="mt-1 text-xs">Suele tardar alrededor de un minuto. Puedes cerrar esta ventana: seguirá generándose y aparecerá en la lista.</p>
          </div>
        )}

        {p?.estado === "error" && !b && (
          <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-4 text-sm text-destructive">
            <p>No se pudo redactar: {p.error || "error desconocido"}.</p>
            <Button size="sm" variant="outline" onClick={regenerar}>Reintentar</Button>
          </div>
        )}

        {b && p && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="space-y-4">
              {p.avisos && p.avisos.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                  <p className="font-medium">Revisión antes de enviar <span className="font-normal text-amber-800">(se actualiza al guardar)</span></p>
                  <ul className="mt-1.5 space-y-1">
                    {p.avisos.map((a, i) => (
                      <li key={i} className="flex gap-2">
                        <span className={`mt-0.5 h-fit shrink-0 rounded px-1.5 text-[10px] font-semibold uppercase ${a.nivel === "falta" ? "bg-red-600 text-white" : "bg-amber-200 text-amber-900"}`}>{a.nivel === "falta" ? "Falta" : "Revisar"}</span>
                        <span>{a.texto}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="space-y-1.5"><Label htmlFor="pTit">Título</Label><Input id="pTit" value={b.titulo} maxLength={160} onChange={(e) => poner("titulo", e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="pRes">Resumen</Label><Textarea id="pRes" rows={3} value={b.resumen} onChange={(e) => poner("resumen", e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="pDia">Situación y necesidad</Label><Textarea id="pDia" rows={5} value={b.diagnostico} onChange={(e) => poner("diagnostico", e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="pSol">Nuestra propuesta <span className="font-normal text-muted-foreground">(un punto por línea)</span></Label><Textarea id="pSol" rows={6} value={b.solucion} onChange={(e) => poner("solucion", e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="pAlc">Alcance <span className="font-normal text-muted-foreground">(un punto por línea)</span></Label><Textarea id="pAlc" rows={5} value={b.alcance} onChange={(e) => poner("alcance", e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="pPla">Plazos y organización</Label><Textarea id="pPla" rows={3} value={b.plazos} onChange={(e) => poner("plazos", e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="pPas">Siguientes pasos <span className="font-normal text-muted-foreground">(uno por línea)</span></Label><Textarea id="pPas" rows={3} value={b.pasos} onChange={(e) => poner("pasos", e.target.value)} /></div>
              <details className="rounded-lg border p-3 text-sm">
                <summary className="cursor-pointer font-medium">Condiciones legales (modelo tipo) · {p.clausulas?.length ?? 0} cláusulas</summary>
                <p className="mt-2 text-xs text-muted-foreground">Se generan según los servicios y los datos legales de la derecha, y salen en el PDF con las firmas. Revísalas con un abogado.</p>
                <ol className="mt-2 list-decimal space-y-2 pl-5">
                  {(p.clausulas ?? []).map((c, i) => <li key={i}><strong>{c.titulo}.</strong> {c.texto}</li>)}
                </ol>
              </details>
              <div className="space-y-1.5"><Label htmlFor="pExt">Condiciones adicionales <span className="font-normal text-muted-foreground">(opcional)</span></Label><Textarea id="pExt" rows={3} value={b.legal.condiciones_extra} onChange={(e) => ponerLegal("condiciones_extra", e.target.value)} /></div>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-0 lg:self-start">
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                <div className="space-y-1.5"><Label htmlFor="pCon">Contacto</Label><Input id="pCon" value={b.contacto} maxLength={120} onChange={(e) => poner("contacto", e.target.value)} /></div>
                <div className="space-y-1.5">
                  <Label htmlFor="pEst">Estado</Label>
                  <select id="pEst" className={SELECT} value={b.estado === "error" ? "borrador" : b.estado} onChange={(e) => poner("estado", e.target.value as EstadoPropuesta)}>
                    {ESTADOS_PROPUESTA.filter((e) => e.id !== "generando" && e.id !== "error").map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-3">
                <Label>Datos legales</Label>
                <div className="grid grid-cols-[1fr_7rem] gap-2">
                  <Input value={b.legal.prestador_nombre} placeholder="Prestador: razón social" maxLength={160} onChange={(e) => ponerLegal("prestador_nombre", e.target.value)} />
                  <Input value={b.legal.prestador_nif} placeholder="NIF/CIF" maxLength={20} onChange={(e) => ponerLegal("prestador_nif", e.target.value)} />
                </div>
                <div className="grid grid-cols-[1fr_7rem] gap-2">
                  <Input value={b.cliente} placeholder="Cliente" maxLength={160} onChange={(e) => poner("cliente", e.target.value)} />
                  <Input value={b.legal.cliente_nif} placeholder="NIF/CIF" maxLength={20} onChange={(e) => ponerLegal("cliente_nif", e.target.value)} />
                </div>
                <Input value={b.legal.cliente_direccion} placeholder="Dirección fiscal del cliente" maxLength={240} onChange={(e) => ponerLegal("cliente_direccion", e.target.value)} />
                <div className="grid grid-cols-[6rem_1fr] items-center gap-2">
                  <Input type="number" min={1} max={365} value={b.legal.validez_dias} placeholder="Validez" onChange={(e) => ponerLegal("validez_dias", e.target.value)} title="Validez de la oferta en días" />
                  <span className="text-xs text-muted-foreground">días de validez</span>
                </div>
                <Textarea rows={2} value={b.legal.forma_pago} placeholder="Forma de pago (ej.: 50 % al inicio, 50 % a la entrega; transferencia)" maxLength={600} onChange={(e) => ponerLegal("forma_pago", e.target.value)} />
                <Textarea rows={2} value={b.legal.duracion} placeholder="Duración y baja (ej.: 12 meses, baja con 30 días de aviso)" maxLength={600} onChange={(e) => ponerLegal("duracion", e.target.value)} />
                <label className="flex items-start gap-2 text-xs">
                  <input type="checkbox" className="mt-0.5" checked={b.legal.dpa_acordado} onChange={(e) => ponerLegal("dpa_acordado", e.target.checked)} />
                  <span>Contrato de encargo de tratamiento de datos (art. 28 RGPD) acordado</span>
                </label>
              </div>

              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <Label>Precios <span className="font-normal text-muted-foreground">(sin IVA)</span></Label>
                  <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => poner("precios", [...b.precios, { concepto: "", cantidad: 1, precio: 0 }])}>+ Línea</Button>
                </div>
                {b.precios.length === 0 && <p className="text-xs text-muted-foreground">Sin precios todavía: añade las líneas que quieras ver en la propuesta.</p>}
                {b.precios.map((x, i) => (
                  <div key={i} className="space-y-1.5 rounded-md bg-muted/40 p-2">
                    <Input value={x.concepto} placeholder="Concepto" onChange={(e) => cambiarPrecio(i, { concepto: e.target.value })} />
                    <div className="grid grid-cols-[1fr_1fr_2rem] items-center gap-2">
                      <Input type="number" min={0} step="any" value={x.cantidad} onChange={(e) => cambiarPrecio(i, { cantidad: Number(e.target.value) })} aria-label="Cantidad" title="Cantidad" />
                      <Input type="number" min={0} step="any" value={x.precio} onChange={(e) => cambiarPrecio(i, { precio: Number(e.target.value) })} aria-label="Precio unitario" title="Precio unitario (€)" />
                      <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => poner("precios", b.precios.filter((_, j) => j !== i))} aria-label="Quitar línea">×</Button>
                    </div>
                  </div>
                ))}
                {b.precios.length > 0 && (
                  <dl className="space-y-0.5 border-t pt-2 text-sm tabular-nums">
                    <div className="flex justify-between text-muted-foreground"><dt>Base</dt><dd>{eur(totales.base)}</dd></div>
                    <div className="flex justify-between text-muted-foreground"><dt>IVA 21 %</dt><dd>{eur(totales.iva)}</dd></div>
                    <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{eur(totales.total)}</dd></div>
                  </dl>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={() => guardar()} disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</Button>
                <Button variant="outline" onClick={pdf} disabled={guardando}>Descargar PDF</Button>
                <Button variant="ghost" onClick={regenerar} disabled={guardando}>Redactar de nuevo con IA</Button>
              </div>
            </aside>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
