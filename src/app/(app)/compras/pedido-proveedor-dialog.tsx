"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DecimalInput } from "@/components/ui/decimal-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { DocumentUpload, MagicStar, Refresh2, SearchNormal1, TickCircle, Box1, Profile2User } from "@/lib/icons";
import { numeroPedidoEsEnlace, MENSAJE_NUMERO_PEDIDO_ENLACE } from "@/lib/numero-pedido";
import type { LineaPedidoProveedorLeida } from "@/app/api/compras/pedido-proveedor/ocr/route";
import type { Empleado } from "@/app/api/empleados/route";

const CATEGORIAS_SUGERIDAS = ["CARGADOR", "DYSON", "THERMOMIX", "OTRO"];

interface CandidatoResguardo {
  resguardo: string;
  clienteNombre: string;
  equipoModelo: string;
  estado: string;
}

interface LineaPedidoEditable {
  nombre: string;
  cantidad: number;
  textoPedido: string;
  aplicar: boolean;
  destino: "tienda" | "cliente";
  // tienda
  referencia: string;
  nombrePiezaSugerida: string | null;
  categoria: string;
  costeInterno: number;
  precioCliente: number;
  // cliente
  resguardo: string;
  clienteElegido: string;
  equipoElegido: string;
  enlace: string;
  numeroPedido: string;
  fechaEstimada: string;
  costo: number;
}

function lineaDesdeOcr(l: LineaPedidoProveedorLeida, numeroPedidoGlobal: string | null): LineaPedidoEditable {
  return {
    nombre: l.nombre,
    cantidad: l.cantidad,
    textoPedido: l.textoPedido,
    aplicar: true,
    destino: l.destino,
    referencia: l.referenciaSugerida || "",
    nombrePiezaSugerida: l.nombrePiezaSugerida,
    categoria: l.categoriaSugerida || "CARGADOR",
    costeInterno: 0,
    precioCliente: l.precioClienteSugerido ?? l.precioUnitario ?? 0,
    resguardo: "",
    clienteElegido: "",
    equipoElegido: "",
    enlace: "",
    numeroPedido: numeroPedidoGlobal || "No informado",
    fechaEstimada: "",
    costo: l.precioUnitario || 0,
  };
}

/** Buscador de resguardo por nombre de cliente — reusa /api/reparaciones?busqueda=
    (misma búsqueda que ya usa la barra de /compras y /reparaciones), con
    debounce igual que buscar-pedido-stock-dialog.tsx. Se precarga con el
    nombre que la IA detectó en "Texto del pedido". */
function BuscadorResguardoLinea({ textoInicial, onElegir }: { textoInicial: string; onElegir: (c: CandidatoResguardo) => void }) {
  const [q, setQ] = useState(textoInicial);
  const [candidatos, setCandidatos] = useState<CandidatoResguardo[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setCandidatos([]); return; }
    setBuscando(true);
    const t = setTimeout(() => {
      fetch(`/api/reparaciones?busqueda=${encodeURIComponent(q.trim())}&porPagina=20&pagina=1`)
        .then((r) => r.json())
        .then((d) => {
          if (d.ok) {
            setCandidatos((d.resultados || []).map((r: { resguardo: string; cliente: { nombre: string }; equipo: { modelo: string }; estado: string }) => ({
              resguardo: r.resguardo, clienteNombre: r.cliente.nombre, equipoModelo: r.equipo.modelo, estado: r.estado,
            })));
          }
        })
        .catch(() => {})
        .finally(() => setBuscando(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar resguardo por nombre de cliente…" className="h-8 pl-7" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {buscando && <p className="text-xs text-muted-foreground">Buscando…</p>}
      {!buscando && q.trim() && candidatos.length === 0 && (
        <p className="text-xs text-muted-foreground">Ninguna reparación abierta coincide — añade este pedido a mano desde Reparaciones.</p>
      )}
      {candidatos.length > 0 && (
        <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border bg-card p-1">
          {candidatos.map((c) => (
            <button
              key={c.resguardo}
              type="button"
              onClick={() => onElegir(c)}
              className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted/60"
            >
              <span className="min-w-0 truncate">
                <span className="font-medium">{c.clienteNombre || c.resguardo}</span>
                <span className="text-muted-foreground"> · {c.resguardo}{c.equipoModelo ? ` · ${c.equipoModelo}` : ""}</span>
              </span>
              <span className="shrink-0 text-muted-foreground">{c.estado}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Lee un pantallazo de pedido hecho en la plataforma de un proveedor (p. ej.
 * ASWO), clasifica cada línea por su "Texto del pedido" (tienda vs. nombre de
 * cliente) y, tras revisión humana obligatoria, registra pedidos PENDIENTES:
 * de stock (kelatos_app.stock_piezas_pedidos, vía /api/stock-piezas/.../pedidos
 * — el stock solo sube al marcar luego "Recibido") o de reparación
 * (kelatos_app.pedidos, vía la misma ruta que ya usa "Registrar Pedido de
 * Pieza"). Nunca toca el stock ni el presupuesto de un cliente solo por leer
 * el pantallazo. Petición del usuario, 2026-10-09/10.
 */
export function PedidoProveedorDialog({ open, onOpenChange, onRegistrado }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistrado: () => void;
}) {
  const [proveedorNombre, setProveedorNombre] = useState("ASWO");
  const [leyendoOcr, setLeyendoOcr] = useState(false);
  const [lineas, setLineas] = useState<LineaPedidoEditable[]>([]);
  const [proveedorIdSugerido, setProveedorIdSugerido] = useState<string | null>(null);
  const [proveedorCreado, setProveedorCreado] = useState(false);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [compradoPor, setCompradoPor] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const inputOcr = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/empleados").then((r) => r.json()).then((d) => { if (d.ok) setEmpleados(d.empleados); }).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) {
      setLineas([]);
      setProveedorIdSugerido(null);
      setProveedorCreado(false);
      setCompradoPor("");
      if (inputOcr.current) inputOcr.current.value = "";
    }
  }, [open]);

  function leerBase64(archivo: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error(`No se pudo leer "${archivo.name}"`));
      r.onload = () => resolve(String(r.result).split(",")[1] || "");
      r.readAsDataURL(archivo);
    });
  }

  async function leerConIA(archivo: File | undefined) {
    if (!archivo) return;
    if (archivo.size > 8 * 1024 * 1024) {
      toast.error("El archivo no puede superar 8 MB");
      if (inputOcr.current) inputOcr.current.value = "";
      return;
    }
    setLeyendoOcr(true);
    try {
      const base64 = await leerBase64(archivo);
      const res = await fetch("/api/compras/pedido-proveedor/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mimeType: archivo.type || "application/octet-stream", nombreProveedor: proveedorNombre }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      if (!data.lineas?.length) {
        toast.warning("No se leyó ninguna línea de pedido en la imagen");
        return;
      }
      setLineas((data.lineas as LineaPedidoProveedorLeida[]).map((l) => lineaDesdeOcr(l, data.numeroPedidoGlobal)));
      setProveedorIdSugerido(data.proveedorIdSugerido);
      setProveedorCreado(!!data.proveedorCreado);
      toast.success(`${data.lineas.length} línea(s) leída(s) — revísalas antes de registrar`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo leer el pantallazo");
    } finally {
      setLeyendoOcr(false);
      if (inputOcr.current) inputOcr.current.value = "";
    }
  }

  function actualizar(i: number, cambios: Partial<LineaPedidoEditable>) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...cambios } : l)));
  }

  function lineaListaParaRegistrar(l: LineaPedidoEditable): boolean {
    if (!l.aplicar) return true; // no bloquea el registro de las demás
    if (l.destino === "tienda") return true; // todo tiene valor por defecto
    if (!l.resguardo) return false;
    if (!l.enlace.trim() || !l.numeroPedido.trim() || !l.fechaEstimada || !(l.costo > 0)) return false;
    if (numeroPedidoEsEnlace(l.numeroPedido)) return false;
    return true;
  }

  const hayAlgoAplicado = lineas.some((l) => l.aplicar);
  const todoListo = lineas.every(lineaListaParaRegistrar) && (!lineas.some((l) => l.aplicar && l.destino === "cliente") || !!compradoPor.trim());

  async function registrar() {
    setRegistrando(true);
    let okStock = 0, okResguardo = 0, fallos = 0;
    try {
      // --- Líneas "tienda": crear pieza si hace falta, luego pedido pendiente ---
      for (const l of lineas) {
        if (!l.aplicar || l.destino !== "tienda") continue;
        try {
          let referencia = l.referencia.trim().toUpperCase();
          if (!referencia) {
            const resPieza = await fetch("/api/stock-piezas", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                referencia: `${l.nombre.slice(0, 20).replace(/[^a-zA-Z0-9]+/g, "-")}-${Math.random().toString(16).slice(2, 6)}`.toUpperCase(),
                nombre: l.nombre, descripcion: l.textoPedido ? `Detectado en pedido ${proveedorNombre} — ref. original: ${l.textoPedido}` : "",
                categoria: l.categoria, costeInterno: l.costeInterno, precioCliente: l.precioCliente, manoObra: 0,
                proveedor: proveedorNombre, stockDisponible: 0, stockMinimo: 0,
              }),
            });
            const dataPieza = await resPieza.json();
            if (!dataPieza.ok) throw new Error(dataPieza.error || "No se pudo crear la pieza");
            referencia = dataPieza.pieza?.referencia || referencia;
          }
          const resPedido = await fetch(`/api/stock-piezas/${encodeURIComponent(referencia)}/pedidos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cantidad: l.cantidad, fechaEstimadaLlegada: null }),
          });
          const dataPedido = await resPedido.json();
          if (!dataPedido.ok) throw new Error(dataPedido.error || "No se pudo crear el pedido de stock");
          okStock++;
        } catch (e) {
          fallos++;
          toast.error(`"${l.nombre}": ${e instanceof Error ? e.message : "error desconocido"}`);
        }
      }

      // --- Líneas "cliente": agrupadas por resguardo, una llamada por grupo ---
      const porResguardo = new Map<string, LineaPedidoEditable[]>();
      for (const l of lineas) {
        if (!l.aplicar || l.destino !== "cliente" || !l.resguardo) continue;
        const arr = porResguardo.get(l.resguardo) || [];
        arr.push(l);
        porResguardo.set(l.resguardo, arr);
      }
      for (const [resguardo, grupo] of porResguardo) {
        try {
          const piezas = grupo.flatMap((l) =>
            Array.from({ length: l.cantidad }, () => ({
              descripcion: l.nombre, proveedor: proveedorIdSugerido || "", enlace: l.enlace.trim(),
              numeroPedido: l.numeroPedido.trim(), fechaEstimada: l.fechaEstimada, costo: l.costo,
            }))
          );
          const res = await fetch(`/api/reparaciones/${encodeURIComponent(resguardo)}/pedidos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ compradoPor, fechaPedido: new Date().toISOString().slice(0, 10), piezas }),
          });
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || "No se pudo registrar el pedido");
          okResguardo += grupo.length;
        } catch (e) {
          fallos += grupo.length;
          toast.error(`Resguardo ${resguardo}: ${e instanceof Error ? e.message : "error desconocido"}`);
        }
      }

      toast.success(`${okStock} pedido(s) de stock, ${okResguardo} pedido(s) de resguardo registrados${fallos ? ` — ${fallos} con error` : ""}`);
      if (fallos === 0) {
        onRegistrado();
        onOpenChange(false);
      }
    } finally {
      setRegistrando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5"><DocumentUpload className="size-5" /> Pedido por pantallazo</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Proveedor</Label>
              <Input className="h-8 w-40" value={proveedorNombre} onChange={(e) => setProveedorNombre(e.target.value)} placeholder="ASWO" />
            </div>
            <input ref={inputOcr} type="file" accept="image/*" className="hidden" onChange={(e) => leerConIA(e.target.files?.[0])} />
            <Button
              type="button" variant="outline" size="sm"
              className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/40"
              disabled={leyendoOcr} onClick={() => inputOcr.current?.click()}
            >
              {leyendoOcr ? <Refresh2 className="size-4 animate-spin" /> : <MagicStar className="size-4" />}
              {leyendoOcr ? "Leyendo…" : "Subir pantallazo y leer con IA"}
            </Button>
            {proveedorIdSugerido && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <TickCircle className="size-3.5 text-emerald-600" />
                {proveedorCreado ? "Proveedor creado automáticamente" : "Proveedor encontrado"}
              </span>
            )}
          </div>

          {lineas.length > 0 && (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Comprado por (necesario para los pedidos de resguardo)</Label>
                <Select value={compradoPor} onValueChange={(v) => setCompradoPor(v || "")}>
                  <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Elige quién compró" /></SelectTrigger>
                  <SelectContent>
                    {empleados.map((e) => <SelectItem key={e.empleadoId} value={e.nombre}>{e.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="max-h-[50vh] pr-2">
                <div className="space-y-2.5">
                  {lineas.map((l, i) => (
                    <div key={i} className="space-y-2 rounded-md border bg-card p-2.5">
                      <div className="flex items-start gap-2">
                        <Checkbox checked={l.aplicar} onCheckedChange={(v) => actualizar(i, { aplicar: v === true })} className="mt-1" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">{l.nombre}</span>
                            <span className="text-xs text-muted-foreground">cant. {l.cantidad}{l.textoPedido ? ` · "${l.textoPedido}"` : ""}</span>
                            <Select value={l.destino} onValueChange={(v) => v && actualizar(i, { destino: v as "tienda" | "cliente" })}>
                              <SelectTrigger className="h-6 w-28 text-xs">
                                <SelectValue>{(v: string) => (v === "tienda" ? "Tienda" : "Cliente")}</SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="tienda">Tienda</SelectItem>
                                <SelectItem value="cliente">Cliente</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {l.destino === "tienda" ? (
                            <>
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Cantidad</Label>
                                  <Input type="number" min={1} className="h-8" value={l.cantidad}
                                    onChange={(e) => actualizar(i, { cantidad: Math.max(1, Number(e.target.value) || 1) })} />
                                </div>
                                <div className="col-span-2 space-y-1 sm:col-span-2">
                                  <Label className="text-xs text-muted-foreground">Referencia de Stock (vacío = pieza nueva)</Label>
                                  <Input className="h-8" placeholder="Vacío = crear pieza nueva" value={l.referencia}
                                    onChange={(e) => actualizar(i, { referencia: e.target.value, nombrePiezaSugerida: null })} />
                                </div>
                              </div>
                              {l.referencia && l.nombrePiezaSugerida && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                  <TickCircle className="size-3" /> {l.nombrePiezaSugerida}
                                </span>
                              )}
                              {!l.referencia && (
                                <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/50 p-2 sm:grid-cols-4">
                                  <div className="col-span-2 space-y-1 sm:col-span-1">
                                    <Label className="text-xs text-muted-foreground">Categoría</Label>
                                    <Select value={l.categoria} onValueChange={(v) => v && actualizar(i, { categoria: v })}>
                                      <SelectTrigger className="h-8"><SelectValue>{(v: string) => v}</SelectValue></SelectTrigger>
                                      <SelectContent>
                                        {CATEGORIAS_SUGERIDAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Coste interno (€)</Label>
                                    <DecimalInput className="h-8" value={l.costeInterno} onChange={(n) => actualizar(i, { costeInterno: n })} />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Precio cliente (€)</Label>
                                    <DecimalInput className="h-8" value={l.precioCliente} onChange={(n) => actualizar(i, { precioCliente: n })} />
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="space-y-2 rounded-md bg-muted/50 p-2">
                              {!l.resguardo ? (
                                <BuscadorResguardoLinea
                                  textoInicial={l.textoPedido}
                                  onElegir={(c) => actualizar(i, { resguardo: c.resguardo, clienteElegido: c.clienteNombre, equipoElegido: c.equipoModelo })}
                                />
                              ) : (
                                <>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                                      <Profile2User className="size-3.5" /> {l.clienteElegido || l.resguardo} · {l.resguardo}{l.equipoElegido ? ` · ${l.equipoElegido}` : ""}
                                    </span>
                                    <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => actualizar(i, { resguardo: "", clienteElegido: "", equipoElegido: "" })}>
                                      Cambiar
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    <div className="col-span-2 space-y-1 sm:col-span-2">
                                      <Label className="text-xs text-muted-foreground">Enlace (del pedido en {proveedorNombre || "el proveedor"})</Label>
                                      <Input className="h-8" placeholder="https://…" value={l.enlace} onChange={(e) => actualizar(i, { enlace: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Nº de pedido</Label>
                                      <Input className="h-8" value={l.numeroPedido} onChange={(e) => actualizar(i, { numeroPedido: e.target.value })} />
                                      {numeroPedidoEsEnlace(l.numeroPedido) && <p className="text-[11px] text-destructive">{MENSAJE_NUMERO_PEDIDO_ENLACE}</p>}
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Fecha estimada</Label>
                                      <Input type="date" className="h-8" value={l.fechaEstimada} onChange={(e) => actualizar(i, { fechaEstimada: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Precio de compra (€)</Label>
                                      <DecimalInput className="h-8" value={l.costo} onChange={(n) => actualizar(i, { costo: n })} />
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          {lineas.length === 0 && (
            <p className="flex items-center gap-1.5 py-6 text-center text-sm text-muted-foreground">
              <Box1 className="size-4" /> Sube un pantallazo del pedido para que la IA lo lea.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button type="button" disabled={!hayAlgoAplicado || !todoListo || registrando} onClick={registrar}>
            {registrando ? <Refresh2 className="size-4 animate-spin" /> : null}
            Registrar pedidos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
