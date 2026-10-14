"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DecimalInput } from "@/components/ui/decimal-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { DocumentUpload, MagicStar, Refresh2, SearchNormal1, TickCircle, Box1, Profile2User, Add, CloseCircle, DocumentText, Gallery } from "@/lib/icons";
import { numeroPedidoEsEnlace, MENSAJE_NUMERO_PEDIDO_ENLACE } from "@/lib/numero-pedido";
import type { LineaPedidoProveedorLeida } from "@/app/api/compras/pedido-proveedor/ocr/route";
import type { Empleado } from "@/app/api/empleados/route";
import type { LineaRegistroPedidoProveedor } from "@/app/api/compras/pedido-proveedor/registro/route";

const CATEGORIAS_SUGERIDAS = ["CARGADOR", "DYSON", "THERMOMIX", "OTRO"];

/** Hasta 4 archivos (pantallazos y/o PDF) por análisis. */
const MAX_ARCHIVOS = 4;
/** Las imágenes grandes se reducen a este lado máximo antes de enviarse. */
const LADO_MAX_IMAGEN = 2200;
/** Tope del conjunto en base64 (el servidor admite 20 MB por petición). */
const MAX_TOTAL_BASE64 = 15 * 1024 * 1024;

interface ArchivoPedido {
  id: string;
  nombre: string;
  esPdf: boolean;
  base64: string;
  mimeType: string;
}

/** Una coincidencia al buscar al cliente de una línea: una reparación abierta o una venta de piezas con alguna
    pieza todavía sin pedir (kelatos_app.ventas / items_venta). */
interface CandidatoCliente {
  tipo: "reparacion" | "venta";
  clave: string;
  resguardo: string;
  ventaId: string;
  clienteNombre: string;
  /** Equipo (reparación) o resumen de las piezas por pedir (venta). */
  detalle: string;
  estado: string;
  /** Solo ventas: las piezas aún sin pedir. */
  items: { itemId: string; descripcion: string }[];
}

interface ItemVentaPendiente {
  itemId: string;
  descripcion: string;
}

interface LineaPedidoEditable {
  nombre: string;
  codigoProveedor: string;
  idPedidoProveedor: string;
  cantidad: number;
  textoPedido: string;
  aplicar: boolean;
  destino: "tienda" | "cliente";
  // tienda
  referencia: string;
  nombrePiezaSugerida: string | null;
  /** Solo para pieza nueva (referencia vacía): nombre EXACTO del proveedor
      (obligatorio, lo usará luego la IA para reconocerla) y nombre
      comercial (opcional, lo pone alguien a mano más tarde si se deja en
      blanco). Petición del usuario, 2026-10-12. */
  nombreInternoProveedor: string;
  nombreComercial: string;
  categoria: string;
  costeInterno: number;
  precioCliente: number;
  // cliente: el pedido va a una reparación (resguardo) o a una venta de piezas (ventaId + sus piezas pendientes)
  origenCliente: "reparacion" | "venta";
  resguardo: string;
  ventaId: string;
  ventaItems: ItemVentaPendiente[];
  itemIds: string[];
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
    codigoProveedor: l.codigoProveedor || "",
    idPedidoProveedor: l.idPedidoProveedor || "",
    cantidad: l.cantidad,
    textoPedido: l.textoPedido,
    aplicar: true,
    destino: l.destino,
    referencia: l.referenciaSugerida || "",
    nombrePiezaSugerida: l.nombrePiezaSugerida,
    nombreInternoProveedor: l.nombre,
    nombreComercial: "",
    categoria: l.categoriaSugerida || "CARGADOR",
    costeInterno: 0,
    precioCliente: l.precioClienteSugerido ?? l.precioUnitario ?? 0,
    origenCliente: "reparacion",
    resguardo: "",
    ventaId: "",
    ventaItems: [],
    itemIds: [],
    clienteElegido: "",
    equipoElegido: "",
    enlace: "",
    numeroPedido: numeroPedidoGlobal || "No informado",
    fechaEstimada: "",
    costo: l.precioUnitario || 0,
  };
}

/** Normaliza para comparar nombres de pieza (sin acentos ni mayúsculas). */
function palabrasDe(t: string): Set<string> {
  return new Set(t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter((w) => w.length > 2));
}

/** Piezas de una venta que mejor encajan con la línea leída (por palabras en común). Si ninguna encaja, no se
    elige ninguna y el empleado las marca a mano. Se eligen tantas como indique la cantidad. */
function itemsQueEncajan(nombreLinea: string, items: ItemVentaPendiente[], cantidad: number): string[] {
  const buscadas = palabrasDe(nombreLinea);
  const puntuadas = items
    .map((it) => ({ it, puntos: [...palabrasDe(it.descripcion)].filter((w) => buscadas.has(w)).length }))
    .filter((x) => x.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos);
  if (puntuadas.length > 0) return puntuadas.slice(0, Math.max(1, cantidad)).map((x) => x.it.itemId);
  return items.length === 1 ? [items[0].itemId] : [];
}

/** Buscador del cliente de una línea por su nombre: busca a la vez en las reparaciones abiertas
    (/api/reparaciones?busqueda=) y en las ventas de piezas con alguna pieza todavía sin pedir (/api/ventas?busqueda=),
    con debounce. Se precarga con el nombre que la IA detectó en "Texto del pedido". */
function BuscadorClienteLinea({ textoInicial, onElegir }: { textoInicial: string; onElegir: (c: CandidatoCliente) => void }) {
  const [q, setQ] = useState(textoInicial);
  const [candidatos, setCandidatos] = useState<CandidatoCliente[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setCandidatos([]); return; }
    setBuscando(true);
    const t = setTimeout(async () => {
      try {
        const [rReps, rVentas] = await Promise.all([
          fetch(`/api/reparaciones?busqueda=${encodeURIComponent(q.trim())}&porPagina=20&pagina=1`).then((r) => r.json()).catch(() => null),
          fetch(`/api/ventas?busqueda=${encodeURIComponent(q.trim())}`).then((r) => r.json()).catch(() => null),
        ]);
        const reparaciones: CandidatoCliente[] = rReps?.ok
          ? (rReps.resultados || []).map((r: { resguardo: string; cliente: { nombre: string }; equipo: { modelo: string }; estado: string }) => ({
              tipo: "reparacion" as const, clave: `R-${r.resguardo}`, resguardo: r.resguardo, ventaId: "", clienteNombre: r.cliente.nombre,
              detalle: r.equipo.modelo, estado: r.estado, items: [],
            }))
          : [];
        const ventas: CandidatoCliente[] = rVentas?.ok
          ? (rVentas.ventas || [])
              .map((v: { ventaId: string; clienteNombre: string; estado: string; items: { itemId: string; descripcion: string; estadoPedido: string }[] }) => {
                const pendientes = (v.items || []).filter((it) => it.estadoPedido === "Pieza Pendiente").map((it) => ({ itemId: it.itemId, descripcion: it.descripcion }));
                return { v, pendientes };
              })
              .filter(({ v, pendientes }: { v: { estado: string }; pendientes: ItemVentaPendiente[] }) => pendientes.length > 0 && v.estado !== "Cancelado" && v.estado !== "Entregado")
              .map(({ v, pendientes }: { v: { ventaId: string; clienteNombre: string; estado: string }; pendientes: ItemVentaPendiente[] }) => ({
                tipo: "venta" as const, clave: `V-${v.ventaId}`, resguardo: "", ventaId: v.ventaId, clienteNombre: v.clienteNombre,
                detalle: pendientes.map((p) => p.descripcion).join(", "), estado: v.estado, items: pendientes,
              }))
          : [];
        setCandidatos([...reparaciones, ...ventas]);
      } finally {
        setBuscando(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const reps = candidatos.filter((c) => c.tipo === "reparacion");
  const ventas = candidatos.filter((c) => c.tipo === "venta");
  const fila = (c: CandidatoCliente) => (
    <button
      key={c.clave}
      type="button"
      onClick={() => onElegir(c)}
      className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted/60"
    >
      <span className="min-w-0 truncate">
        <span className="font-medium">{c.clienteNombre || c.resguardo || c.ventaId}</span>
        <span className="text-muted-foreground"> · {c.tipo === "venta" ? `Venta ${c.ventaId}` : c.resguardo}{c.detalle ? ` · ${c.detalle}` : ""}</span>
      </span>
      <span className="shrink-0 text-muted-foreground">{c.estado}</span>
    </button>
  );

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar al cliente (reparación o venta de piezas)…" className="h-8 pl-7" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {buscando && <p className="text-xs text-muted-foreground">Buscando…</p>}
      {!buscando && q.trim() && candidatos.length === 0 && (
        <p className="text-xs text-muted-foreground">Ninguna reparación abierta ni venta de piezas pendiente de pedir coincide — añade este pedido a mano desde Reparaciones o Ventas.</p>
      )}
      {candidatos.length > 0 && (
        <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border bg-card p-1">
          {reps.length > 0 && <p className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Reparaciones abiertas</p>}
          {reps.map(fila)}
          {ventas.length > 0 && <p className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Ventas de piezas (pieza sin pedir)</p>}
          {ventas.map(fila)}
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
  const [numeroPedidoGlobal, setNumeroPedidoGlobal] = useState<string | null>(null);
  const [proveedorCreado, setProveedorCreado] = useState(false);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [compradoPor, setCompradoPor] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const inputOcr = useRef<HTMLInputElement>(null);
  const [archivos, setArchivos] = useState<ArchivoPedido[]>([]);
  const [preparando, setPreparando] = useState(false);
  const [segundosAnalisis, setSegundosAnalisis] = useState(0);
  /** true cuando se cierra el diálogo: corta la consulta periódica del análisis. */
  const cancelarAnalisis = useRef(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/empleados").then((r) => r.json()).then((d) => { if (d.ok) setEmpleados(d.empleados); }).catch(() => {});
  }, [open]);

  useEffect(() => {
    cancelarAnalisis.current = !open;
    if (!open) {
      setLineas([]);
      setProveedorIdSugerido(null);
      setNumeroPedidoGlobal(null);
      setProveedorCreado(false);
      setCompradoPor("");
      setArchivos([]);
      if (inputOcr.current) inputOcr.current.value = "";
    }
  }, [open]);

  function leerBase64(archivo: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error("No se pudo leer el archivo"));
      r.onload = () => resolve(String(r.result).split(",")[1] || "");
      r.readAsDataURL(archivo);
    });
  }

  /** Reduce una imagen grande a un JPEG de como máximo LADO_MAX_IMAGEN px: el
      OCR del servidor tarda mucho menos y el envío pesa menos. Si la imagen
      ya es pequeña se manda tal cual. */
  async function prepararImagen(archivo: File): Promise<{ base64: string; mimeType: string }> {
    const original = { base64: await leerBase64(archivo), mimeType: archivo.type || "image/jpeg" };
    if (archivo.size <= 1_500_000) return original;
    try {
      const url = URL.createObjectURL(archivo);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("imagen no válida"));
        i.src = url;
      });
      URL.revokeObjectURL(url);
      const escala = Math.min(1, LADO_MAX_IMAGEN / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
      const ctx = canvas.getContext("2d");
      if (!ctx) return original;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const base64 = dataUrl.split(",")[1] || "";
      return base64 && base64.length < original.base64.length ? { base64, mimeType: "image/jpeg" } : original;
    } catch {
      return original;
    }
  }

  async function anadirArchivos(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    const nuevos = Array.from(lista);
    if (inputOcr.current) inputOcr.current.value = "";
    if (archivos.length + nuevos.length > MAX_ARCHIVOS) {
      toast.error(`Máximo ${MAX_ARCHIVOS} archivos por análisis (ya tienes ${archivos.length})`);
      return;
    }
    setPreparando(true);
    try {
      const listos: ArchivoPedido[] = [];
      for (const f of nuevos) {
        const esPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
        const esImagen = f.type.startsWith("image/");
        if (!esPdf && !esImagen) {
          toast.error(`"${f.name}": solo se admiten imágenes o PDF`);
          continue;
        }
        if (f.size > 8 * 1024 * 1024) {
          toast.error(`"${f.name}" supera los 8 MB`);
          continue;
        }
        const preparado = esPdf ? { base64: await leerBase64(f), mimeType: "application/pdf" } : await prepararImagen(f);
        listos.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, nombre: f.name, esPdf, base64: preparado.base64, mimeType: preparado.mimeType });
      }
      if (listos.length === 0) return;
      const total = [...archivos, ...listos].reduce((n, a) => n + a.base64.length, 0);
      if (total > MAX_TOTAL_BASE64) {
        toast.error("Los archivos pesan demasiado en conjunto. Quita alguno o usa capturas más pequeñas.");
        return;
      }
      setArchivos((prev) => [...prev, ...listos]);
    } finally {
      setPreparando(false);
    }
  }

  function quitarArchivo(id: string) {
    setArchivos((prev) => prev.filter((a) => a.id !== id));
  }

  /** Analiza TODOS los archivos juntos, solo cuando se pulsa el botón (así no
      se empieza a leer la primera captura antes de adjuntar las demás). */
  async function analizar() {
    if (archivos.length === 0) return;
    setLeyendoOcr(true);
    setSegundosAnalisis(0);
    const inicio = Date.now();
    try {
      // 1) Se envían los archivos y el servidor responde al instante con un identificador
      //    (la IA es lenta y el proxy corta a los 60 s, por eso el análisis corre en segundo plano).
      const res = await fetch("/api/compras/pedido-proveedor/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archivos: archivos.map((a) => ({ base64: a.base64, mimeType: a.mimeType })),
          nombreProveedor: proveedorNombre,
        }),
      });
      const envio = await res.json();
      if (!envio.ok || !envio.jobId) throw new Error(envio.error || "No se pudo iniciar el análisis");

      // 2) Se consulta el resultado cada pocos segundos (máx. 4 minutos).
      let data: {
        estado: string; error?: string; numeroPedidoGlobal?: string | null; lineas?: LineaPedidoProveedorLeida[];
        proveedorIdSugerido?: string | null; proveedorCreado?: boolean;
      } | null = null;
      while (Date.now() - inicio < 240_000) {
        await new Promise((r) => setTimeout(r, 2500));
        if (cancelarAnalisis.current) return;
        setSegundosAnalisis(Math.round((Date.now() - inicio) / 1000));
        const r = await fetch(`/api/compras/pedido-proveedor/ocr/${encodeURIComponent(envio.jobId)}`);
        const d = await r.json();
        if (!d.ok) throw new Error(d.error || "No se pudo consultar el análisis");
        if (d.estado === "error") throw new Error(d.error || "No se pudo leer el pedido");
        if (d.estado === "listo") { data = d; break; }
      }
      if (!data) throw new Error("El análisis está tardando demasiado. Inténtalo de nuevo con menos archivos.");
      if (!data.lineas?.length) {
        toast.warning("No se leyó ninguna línea de pedido en los archivos");
        return;
      }
      setLineas(data.lineas.map((l) => lineaDesdeOcr(l, data.numeroPedidoGlobal ?? null)));
      setNumeroPedidoGlobal(data.numeroPedidoGlobal || null);
      setProveedorIdSugerido(data.proveedorIdSugerido ?? null);
      setProveedorCreado(!!data.proveedorCreado);
      toast.success(`${data.lineas.length} línea(s) leída(s) — revísalas antes de registrar`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo leer el pedido");
    } finally {
      setLeyendoOcr(false);
    }
  }

  function actualizar(i: number, cambios: Partial<LineaPedidoEditable>) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...cambios } : l)));
  }

  function lineaListaParaRegistrar(l: LineaPedidoEditable): boolean {
    if (!l.aplicar) return true; // no bloquea el registro de las demás
    if (l.destino === "tienda") {
      // Pieza nueva (sin referencia existente): el nombre interno de
      // proveedor es obligatorio — es lo único con lo que la IA podrá
      // reconocerla la próxima vez.
      return l.referencia.trim() !== "" || l.nombreInternoProveedor.trim() !== "";
    }
    if (l.origenCliente === "venta") {
      if (!l.ventaId || l.itemIds.length === 0 || !proveedorIdSugerido) return false;
    } else if (!l.resguardo) return false;
    if (!l.enlace.trim() || !l.numeroPedido.trim() || !l.fechaEstimada) return false;
    // El coste de las piezas de una venta ya está en la propia venta; el de una reparación se guarda con el pedido.
    if (l.origenCliente !== "venta" && !(l.costo > 0)) return false;
    if (numeroPedidoEsEnlace(l.numeroPedido)) return false;
    return true;
  }

  const hayAlgoAplicado = lineas.some((l) => l.aplicar);
  const todoListo = lineas.every(lineaListaParaRegistrar) && (!lineas.some((l) => l.aplicar && l.destino === "cliente" && l.origenCliente !== "venta") || !!compradoPor.trim());

  async function registrar() {
    setRegistrando(true);
    let okStock = 0, okResguardo = 0, fallos = 0;
    const resumen: LineaRegistroPedidoProveedor[] = [];
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
                referencia: `${l.nombreInternoProveedor.slice(0, 20).replace(/[^a-zA-Z0-9]+/g, "-")}-${Math.random().toString(16).slice(2, 6)}`.toUpperCase(),
                nombre: l.nombreComercial.trim(),
                nombreInternoProveedor: l.nombreInternoProveedor.trim(),
                codigoProveedor: l.codigoProveedor.trim(),
                idPedidoProveedor: l.idPedidoProveedor.trim(),
                descripcion: l.textoPedido ? `Detectado en pedido ${proveedorNombre} — ref. original: ${l.textoPedido}` : "",
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
          resumen.push({ nombre: l.nombre, cantidad: l.cantidad, destino: "tienda", destinoDetalle: referencia, ok: true });
        } catch (e) {
          fallos++;
          resumen.push({ nombre: l.nombre, cantidad: l.cantidad, destino: "tienda", destinoDetalle: "", ok: false });
          toast.error(`"${l.nombre}": ${e instanceof Error ? e.message : "error desconocido"}`);
        }
      }

      // --- Líneas "cliente": agrupadas por resguardo, una llamada por grupo ---
      const porResguardo = new Map<string, LineaPedidoEditable[]>();
      for (const l of lineas) {
        if (!l.aplicar || l.destino !== "cliente" || l.origenCliente === "venta" || !l.resguardo) continue;
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
          for (const l of grupo) {
            resumen.push({ nombre: l.nombre, cantidad: l.cantidad, destino: "cliente", destinoDetalle: `${resguardo} · ${l.clienteElegido || resguardo}`, ok: true });
          }
        } catch (e) {
          fallos += grupo.length;
          for (const l of grupo) {
            resumen.push({ nombre: l.nombre, cantidad: l.cantidad, destino: "cliente", destinoDetalle: `${resguardo} · ${l.clienteElegido || resguardo}`, ok: false });
          }
          toast.error(`Resguardo ${resguardo}: ${e instanceof Error ? e.message : "error desconocido"}`);
        }
      }

      // --- Líneas "cliente" de una VENTA de piezas: el pedido se registra en cada pieza elegida de la venta
      // (POST /api/items-venta/:itemId/registrar-pedido, el mismo que usa "Registrar pedido" en Ventas), que pasa a
      // "En Tránsito". Cuentan junto a los pedidos de resguardo en el historial (el detalle indica "Venta V-…").
      for (const l of lineas) {
        if (!l.aplicar || l.destino !== "cliente" || l.origenCliente !== "venta" || !l.ventaId) continue;
        let okLinea = 0;
        let errorLinea = "";
        for (const itemId of l.itemIds) {
          try {
            const res = await fetch(`/api/items-venta/${encodeURIComponent(itemId)}/registrar-pedido`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ proveedorId: proveedorIdSugerido || "", proveedorOtro: "", numeroPedido: l.numeroPedido.trim(), fechaEstimada: l.fechaEstimada, enlace: l.enlace.trim() }),
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error || "No se pudo registrar el pedido");
            okLinea++;
          } catch (e) {
            errorLinea = e instanceof Error ? e.message : "error desconocido";
          }
        }
        const detalle = `Venta ${l.ventaId} · ${l.clienteElegido || l.ventaId}`;
        okResguardo += okLinea;
        fallos += l.itemIds.length - okLinea;
        resumen.push({ nombre: l.nombre, cantidad: l.cantidad, destino: "cliente", destinoDetalle: detalle, ok: okLinea === l.itemIds.length });
        if (errorLinea) toast.error(`Venta ${l.ventaId}: ${errorLinea}`);
      }

      toast.success(`${okStock} pedido(s) de stock, ${okResguardo} pedido(s) de cliente (reparación o venta) registrados${fallos ? ` — ${fallos} con error` : ""}`);
      if (resumen.length > 0) {
        fetch("/api/compras/pedido-proveedor/registro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proveedorNombre, numeroPedidoGlobal, pedidosStock: okStock, pedidosResguardo: okResguardo, lineasFallidas: fallos, resumen }),
        }).catch(() => {});
      }
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
      <DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 p-0 sm:max-w-2xl lg:max-w-3xl">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3 pr-12">
          <DialogTitle className="flex items-center gap-1.5"><DocumentUpload className="size-5" /> Subir pedido con IA</DialogTitle>
        </div>

        <div className="flex min-h-0 flex-1">
        <ScrollArea className="min-h-0 min-w-0 flex-1">
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Proveedor</Label>
              <Input className="h-8 w-40" value={proveedorNombre} onChange={(e) => setProveedorNombre(e.target.value)} placeholder="ASWO" />
            </div>
            <input ref={inputOcr} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => anadirArchivos(e.target.files)} />
            <Button
              type="button" variant="outline" size="sm" className="gap-1.5"
              disabled={leyendoOcr || preparando || archivos.length >= MAX_ARCHIVOS} onClick={() => inputOcr.current?.click()}
            >
              {preparando ? <Refresh2 className="size-4 animate-spin" /> : <Add className="size-4" />}
              {preparando ? "Preparando…" : `Añadir archivos (${archivos.length}/${MAX_ARCHIVOS})`}
            </Button>
            <Button
              type="button" variant="outline" size="sm"
              className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/40"
              disabled={leyendoOcr || preparando || archivos.length === 0} onClick={analizar}
            >
              {leyendoOcr ? <Refresh2 className="size-4 animate-spin" /> : <MagicStar className="size-4" />}
              {leyendoOcr ? `Analizando… ${segundosAnalisis}s` : lineas.length > 0 ? "Volver a analizar con IA" : "Analizar con IA"}
            </Button>
            {proveedorIdSugerido && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <TickCircle className="size-3.5 text-emerald-600" />
                {proveedorCreado ? "Proveedor creado automáticamente" : "Proveedor encontrado"}
              </span>
            )}
          </div>

          {archivos.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {archivos.map((a) => (
                <span key={a.id} className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs">
                  {a.esPdf ? <DocumentText className="size-3.5 shrink-0" /> : <Gallery className="size-3.5 shrink-0" />}
                  <span className="max-w-48 truncate">{a.nombre}</span>
                  <button
                    type="button" title="Quitar este archivo" disabled={leyendoOcr}
                    className="text-muted-foreground hover:text-destructive disabled:opacity-50" onClick={() => quitarArchivo(a.id)}
                  >
                    <CloseCircle className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {lineas.length > 0 && (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Comprado por (necesario para los pedidos de reparación)</Label>
                <Select value={compradoPor} onValueChange={(v) => setCompradoPor(v || "")}>
                  <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Elige quién compró" /></SelectTrigger>
                  <SelectContent>
                    {empleados.map((e) => <SelectItem key={e.empleadoId} value={e.nombre}>{e.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

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
                              <div className="flex flex-wrap items-end gap-2">
                                <div className="w-20 space-y-1">
                                  <Label className="text-xs text-muted-foreground">Cantidad</Label>
                                  <Input type="number" min={1} className="h-8" value={l.cantidad}
                                    onChange={(e) => actualizar(i, { cantidad: Math.max(1, Number(e.target.value) || 1) })} />
                                </div>
                                <div className="min-w-40 flex-1 space-y-1">
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
                                <div className="grid grid-cols-1 gap-2 rounded-md bg-muted/50 p-2 sm:grid-cols-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Nombre interno (proveedor) *</Label>
                                    <Input className="h-8" placeholder="Nombre exacto del proveedor" value={l.nombreInternoProveedor}
                                      onChange={(e) => actualizar(i, { nombreInternoProveedor: e.target.value })} />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Código proveedor</Label>
                                    <Input className="h-8" value={l.codigoProveedor} onChange={(e) => actualizar(i, { codigoProveedor: e.target.value })} />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">ID de pedido</Label>
                                    <Input className="h-8" value={l.idPedidoProveedor} onChange={(e) => actualizar(i, { idPedidoProveedor: e.target.value })} />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Nombre comercial (opcional)</Label>
                                    <Input className="h-8" placeholder="Se puede poner después" value={l.nombreComercial}
                                      onChange={(e) => actualizar(i, { nombreComercial: e.target.value })} />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Categoría</Label>
                                    <Select value={l.categoria} onValueChange={(v) => v && actualizar(i, { categoria: v })}>
                                      <SelectTrigger className="h-8 w-full"><SelectValue>{(v: string) => v}</SelectValue></SelectTrigger>
                                      <SelectContent>
                                        {CATEGORIAS_SUGERIDAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Coste interno (€)</Label>
                                    <DecimalInput className="h-8 w-full" value={l.costeInterno} onChange={(n) => actualizar(i, { costeInterno: n })} />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Precio cliente (€)</Label>
                                    <DecimalInput className="h-8 w-full" value={l.precioCliente} onChange={(n) => actualizar(i, { precioCliente: n })} />
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="space-y-2 rounded-md bg-muted/50 p-2">
                              {!(l.resguardo || l.ventaId) ? (
                                <BuscadorClienteLinea
                                  textoInicial={l.textoPedido}
                                  onElegir={(c) =>
                                    c.tipo === "venta"
                                      ? actualizar(i, { origenCliente: "venta", ventaId: c.ventaId, resguardo: "", ventaItems: c.items, itemIds: itemsQueEncajan(l.nombre, c.items, l.cantidad), clienteElegido: c.clienteNombre, equipoElegido: "" })
                                      : actualizar(i, { origenCliente: "reparacion", resguardo: c.resguardo, ventaId: "", ventaItems: [], itemIds: [], clienteElegido: c.clienteNombre, equipoElegido: c.detalle })
                                  }
                                />
                              ) : (
                                <>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                                      <Profile2User className="size-3.5" /> {l.clienteElegido || l.resguardo || l.ventaId} · {l.origenCliente === "venta" ? `Venta ${l.ventaId}` : l.resguardo}{l.equipoElegido ? ` · ${l.equipoElegido}` : ""}
                                    </span>
                                    <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => actualizar(i, { origenCliente: "reparacion", resguardo: "", ventaId: "", ventaItems: [], itemIds: [], clienteElegido: "", equipoElegido: "" })}>
                                      Cambiar
                                    </Button>
                                  </div>
                                  {l.origenCliente === "venta" && (
                                    <div className="space-y-1 rounded-md border bg-card p-2">
                                      <p className="text-xs font-medium">Pieza(s) de la venta a la(s) que corresponde este pedido</p>
                                      {l.ventaItems.map((it) => (
                                        <label key={it.itemId} className="flex cursor-pointer items-center gap-2 text-xs">
                                          <Checkbox
                                            checked={l.itemIds.includes(it.itemId)}
                                            onCheckedChange={(v) => actualizar(i, { itemIds: v === true ? [...l.itemIds, it.itemId] : l.itemIds.filter((x) => x !== it.itemId) })}
                                          />
                                          {it.descripcion}
                                        </label>
                                      ))}
                                      {l.itemIds.length === 0 && <p className="text-[11px] text-amber-700 dark:text-amber-400">Marca al menos una pieza.</p>}
                                      {!proveedorIdSugerido && <p className="text-[11px] text-destructive">Hace falta un proveedor reconocido para registrar el pedido en una venta.</p>}
                                    </div>
                                  )}
                                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <div className="space-y-1 sm:col-span-2">
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
                                    {l.origenCliente !== "venta" && (
                                      <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Precio de compra (€)</Label>
                                        <DecimalInput className="h-8 w-full" value={l.costo} onChange={(n) => actualizar(i, { costo: n })} />
                                      </div>
                                    )}
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
            </>
          )}

          {lineas.length === 0 && (
            <p className="flex items-center gap-1.5 py-6 text-center text-sm text-muted-foreground">
              <Box1 className="size-4" /> Añade de 1 a 4 archivos del pedido (pantallazos o PDF) y pulsa «Analizar con IA».
            </p>
          )}
        </div>
        </ScrollArea>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t bg-muted/50 px-4 py-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button type="button" disabled={!hayAlgoAplicado || !todoListo || registrando} onClick={registrar}>
            {registrando ? <Refresh2 className="size-4 animate-spin" /> : null}
            Registrar pedidos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
