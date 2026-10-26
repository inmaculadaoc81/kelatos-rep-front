"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DecimalInput } from "@/components/ui/decimal-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { DocumentUpload, MagicStar, Refresh2, SearchNormal1, TickCircle, Box1, Profile2User, Add, CloseCircle, DocumentText, Gallery, Warning2 } from "@/lib/icons";
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
  /** Texto opcional de ESTA imagen (resguardo, cliente, "recibida"...): solo se aplica a ella. */
  texto: string;
}

/** Mensaje de texto sin imagen ("Asus 1184556 6 cargadores recibido"). */
interface TextoSuelto {
  id: string;
  texto: string;
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
  /** Solo ventas: todas sus piezas (aunque la venta esté cerrada y pagada), con su estado. */
  items: ItemVentaPendiente[];
}

/** Un pedido ya registrado que podría ser al que se refiere un mensaje de "recibido" (reparación, venta o stock). */
interface CandidatoRecepcion {
  clave: string;
  origen: "reparacion" | "venta" | "stock";
  /** pedidoId (reparación), itemId (venta) o id del pedido de stock. */
  id: string;
  titulo: string;
  detalle: string;
  estado: string;
  /** Coste y nº de pedido registrados (reparaciones), para comparar con la factura. */
  costo: number | null;
  numeroPedido: string;
}

interface ItemVentaPendiente {
  itemId: string;
  descripcion: string;
  /** Estado de la pieza en la venta: Pieza Pendiente, En Tránsito, Pieza Recibida... */
  estadoPedido: string;
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
  /** Venta: el pedido no corresponde a ninguna pieza existente y hay que añadirlo como pieza nueva de la venta. */
  nuevaPieza: boolean;
  precioNuevaPieza: number;
  // Recepción: el texto o la nota decían que ya llegó ("recibido", "llegó")
  /** La mercancía ya llegó (lo dice la nota). En líneas de tienda, al registrar el pedido se marca recibido y sube el stock. */
  recibido: boolean;
  /** Solo hay una referencia (nº de pedido o resguardo) y ninguna pieza: sirve únicamente para marcar un pedido existente como recibido. */
  soloRecepcion: boolean;
  proveedorTexto: string;
  numeroPedidoLinea: string;
  /** registrar = pedido nuevo · recibir = marcar Recibido un pedido pendiente · vincular = enlazar con un pedido ya recibido (sin cambiar su estado). */
  accion: "registrar" | "recibir" | "vincular";
  /** Solo "vincular": actualizar también el coste del pedido al realmente pagado. */
  actualizarCoste: boolean;
  /** Imagen o texto de la que sale la línea (vacío si salió de varias capturas juntas). */
  fuente: string;
  buscandoRecepcion: boolean;
  candidatosRecepcion: CandidatoRecepcion[];
  /** Pedidos ya registrados (a mano o antes) que parecen ser este mismo: la línea se desmarca para no duplicarlo. */
  posiblesDuplicados: CandidatoRecepcion[];
  recibirIds: string[];
  clienteElegido: string;
  equipoElegido: string;
  enlace: string;
  numeroPedido: string;
  fechaEstimada: string;
  costo: number;
}

/** Categoría inicial de una pieza nueva según su nombre (el empleado puede cambiarla). Sin pista clara, "OTRO": antes
    todas salían como CARGADOR aunque fueran piezas de otro aparato. */
function categoriaPorNombre(nombre: string): string {
  const n = nombre.toLowerCase();
  if (/thermomix|vorwerk/.test(n)) return "THERMOMIX";
  if (/dyson/.test(n)) return "DYSON";
  if (/cargador|adaptador|alimentaci[oó]n|fuente/.test(n)) return "CARGADOR";
  return "OTRO";
}

function lineaDesdeOcr(l: LineaPedidoProveedorLeida, numeroPedidoGlobal: string | null): LineaPedidoEditable {
  return {
    nombre: l.nombre,
    codigoProveedor: l.codigoProveedor || "",
    idPedidoProveedor: l.idPedidoProveedor || "",
    cantidad: l.cantidad,
    textoPedido: l.textoPedido,
    // Una línea que solo sirve para marcar un pedido como recibido empieza desmarcada hasta encontrar ese pedido.
    aplicar: !l.soloRecepcion,
    destino: l.destino,
    referencia: l.referenciaSugerida || "",
    nombrePiezaSugerida: l.nombrePiezaSugerida,
    nombreInternoProveedor: l.nombre,
    nombreComercial: "",
    categoria: l.categoriaSugerida || categoriaPorNombre(l.nombre),
    // Si el documento trae el precio realmente pagado (facturas con PVP y precio unitario), ese es el coste.
    costeInterno: l.precioPagado ?? 0,
    precioCliente: l.precioClienteSugerido ?? l.precioUnitario ?? 0,
    origenCliente: "reparacion",
    resguardo: l.resguardo || "",
    ventaId: "",
    ventaItems: [],
    itemIds: [],
    nuevaPieza: false,
    precioNuevaPieza: 0,
    clienteElegido: "",
    equipoElegido: "",
    enlace: "",
    numeroPedido: l.numeroPedido || numeroPedidoGlobal || "No informado",
    fechaEstimada: "",
    costo: l.precioPagado ?? l.precioUnitario ?? 0,
    recibido: !!l.recibido,
    soloRecepcion: !!l.soloRecepcion,
    proveedorTexto: l.proveedorTexto || "",
    numeroPedidoLinea: l.numeroPedido || "",
    accion: l.soloRecepcion ? "recibir" : "registrar",
    actualizarCoste: false,
    fuente: "",
    buscandoRecepcion: !!l.recibido,
    candidatosRecepcion: [],
    posiblesDuplicados: [],
    recibirIds: [],
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
    .map((it) => ({ it, puntos: [...palabrasDe(it.descripcion)].filter((w) => buscadas.has(w)).length, pendiente: it.estadoPedido === "Pieza Pendiente" ? 1 : 0 }))
    .filter((x) => x.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos || b.pendiente - a.pendiente);
  if (puntuadas.length > 0) return puntuadas.slice(0, Math.max(1, cantidad)).map((x) => x.it.itemId);
  return items.length === 1 && items[0].estadoPedido === "Pieza Pendiente" ? [items[0].itemId] : [];
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
              .filter((v: { estado: string }) => v.estado !== "Cancelado")
              .map((v: { ventaId: string; clienteNombre: string; estado: string; estadoPago: string; items: { itemId: string; descripcion: string; estadoPedido: string }[] }) => {
                const piezas: ItemVentaPendiente[] = (v.items || []).map((it) => ({ itemId: it.itemId, descripcion: it.descripcion, estadoPedido: it.estadoPedido }));
                return {
                  tipo: "venta" as const, clave: `V-${v.ventaId}`, resguardo: "", ventaId: v.ventaId, clienteNombre: v.clienteNombre,
                  detalle: piezas.map((p) => p.descripcion).join(", "), estado: `${v.estado}${v.estadoPago ? ` · ${v.estadoPago}` : ""}`, items: piezas,
                };
              })
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
        <p className="text-xs text-muted-foreground">Ninguna reparación abierta ni venta de piezas coincide — añade este pedido a mano desde Reparaciones o Ventas.</p>
      )}
      {candidatos.length > 0 && (
        <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border bg-card p-1">
          {reps.length > 0 && <p className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Reparaciones abiertas</p>}
          {reps.map(fila)}
          {ventas.length > 0 && <p className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Ventas de piezas (aunque estén cerradas y pagadas)</p>}
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
  /** Antes de analizar: ¿la mercancía de lo que se sube ya llegó al local o aún no? Cada línea se puede cambiar después. */
  const [llegada, setLlegada] = useState<"aun_no" | "llego">("aun_no");
  /** Textos sin imagen (p. ej. un aviso de "recibido" por mensaje). */
  const [textosSueltos, setTextosSueltos] = useState<TextoSuelto[]>([]);
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
      setTextosSueltos([]);
      setLlegada("aun_no");
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
        listos.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, nombre: f.name, esPdf, base64: preparado.base64, mimeType: preparado.mimeType, texto: "" });
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

  function ponerTextoArchivo(id: string, texto: string) {
    setArchivos((prev) => prev.map((a) => (a.id === id ? { ...a, texto } : a)));
  }

  function anadirTextoSuelto() {
    setTextosSueltos((prev) => [...prev, { id: `t-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`, texto: "" }]);
  }

  function quitarArchivo(id: string) {
    setArchivos((prev) => prev.filter((a) => a.id !== id));
  }

  /** Para cada línea marcada como recibida, busca los pedidos YA registrados a los que se refiere: por nº de pedido y por
      resguardo en Compras (reparaciones y ventas) y, en líneas de tienda, pedidos de stock pendientes del mismo proveedor
      y cantidad. Si hay coincidencias, la línea propone "marcar como recibido" en vez de crear otro pedido. */
  async function buscarRecepciones(nuevas: LineaPedidoEditable[], soloIndice?: number) {
    const ESTADOS_FINALES = ["Recibido", "Cancelado", "recibido", "cancelado"];
    await Promise.all(
      nuevas.map(async (l, i) => {
        if (soloIndice !== undefined && i !== soloIndice) return;
        if (!l.recibido) return;
        const candidatos = new Map<string, CandidatoRecepcion>();
        try {
          const consultas = [l.numeroPedidoLinea, l.resguardo].filter(Boolean);
          for (const q of consultas) {
            const r = await fetch(`/api/compras?busqueda=${encodeURIComponent(q)}&porPagina=50`).then((x) => x.json()).catch(() => null);
            for (const c of (r?.ok ? r.compras : []) as { origen: "reparacion" | "venta"; pedidoId: string; resguardo: string; clienteNombre: string; numeroPedido: string; descripcion: string; estado: string; costo: number | null }[]) {
              const porNumero = !!l.numeroPedidoLinea && c.numeroPedido.trim().toLowerCase() === l.numeroPedidoLinea.toLowerCase();
              const porResguardo = !!l.resguardo && c.origen === "reparacion" && c.resguardo === l.resguardo;
              if (!porNumero && !porResguardo) continue;
              const clave = `${c.origen}-${c.pedidoId}`;
              candidatos.set(clave, {
                clave, origen: c.origen, id: c.pedidoId, titulo: c.descripcion || "Pieza",
                detalle: `${c.origen === "venta" ? `Venta ${c.resguardo}` : `Resguardo ${c.resguardo}`} · ${c.clienteNombre || "—"} · pedido ${c.numeroPedido || "—"}`, estado: c.estado,
                costo: c.costo ?? null, numeroPedido: c.numeroPedido || "",
              });
            }
          }
          // Línea de tienda: pedidos de stock pendientes del mismo proveedor y la misma cantidad.
          if (l.destino === "tienda" && l.proveedorTexto) {
            const r = await fetch(`/api/stock-piezas/pedidos/buscar?q=${encodeURIComponent(l.proveedorTexto)}`).then((x) => x.json()).catch(() => null);
            for (const p of (r?.ok ? r.pedidos : []) as { id: number; referencia: string; proveedor: string | null; cantidad: number; estado: string }[]) {
              if (String(p.estado).toLowerCase() !== "pendiente" || p.cantidad !== l.cantidad) continue;
              const clave = `stock-${p.id}`;
              candidatos.set(clave, { clave, origen: "stock", id: String(p.id), titulo: p.referencia, detalle: `Stock · ${p.proveedor || "—"} · ${p.cantidad} uds`, estado: p.estado, costo: null, numeroPedido: "" });
            }
          }
        } catch {
          /* sin coincidencias: la línea sigue su camino normal */
        }
        const lista = [...candidatos.values()];
        const pendientes = lista.filter((c) => !ESTADOS_FINALES.includes(c.estado));
        // Por nombre de pieza si coincide alguno; si no, todos los pendientes de esa referencia.
        const buscadas = palabrasDe(l.nombre);
        const porNombre = pendientes.filter((c) => [...palabrasDe(c.titulo)].some((w) => buscadas.has(w)));
        const elegidos = (porNombre.length > 0 ? porNombre : pendientes).map((c) => c.clave);
        // Pedidos de reparación que YA están recibidos (p. ej. dados de alta a mano con un nº provisional): se ofrece
        // vincularlos con el pedido real en vez de crear otro duplicado.
        const yaRecibidos = lista.filter((c) => c.origen === "reparacion" && c.estado === "Recibido");
        const vincularElegidos = yaRecibidos.filter((c) => [...palabrasDe(c.titulo)].some((w) => buscadas.has(w))).map((c) => c.clave);
        setLineas((prev) =>
          prev.map((x, idx) =>
            idx !== i
              ? x
              : {
                  ...x,
                  buscandoRecepcion: false,
                  candidatosRecepcion: lista,
                  recibirIds: elegidos.length > 0 ? elegidos : yaRecibidos.length > 0 ? vincularElegidos : [],
                  accion: elegidos.length > 0 ? "recibir" : yaRecibidos.length > 0 ? "vincular" : x.soloRecepcion ? "recibir" : "registrar",
                  aplicar: elegidos.length > 0 || vincularElegidos.length > 0 ? true : x.soloRecepcion ? false : x.aplicar,
                }
          )
        );
      })
    );
  }

  /** Para las líneas que NO son «ya llegó»: ¿ese pedido ya está registrado? Se busca por nº de pedido (mismo número y una pieza
      parecida) en Compras (reparaciones y ventas) y, en tienda, por pedidos de stock pendientes de la misma referencia y cantidad.
      Si aparece, la línea se desmarca (no se registra otra vez) y se avisa; el empleado puede volver a marcarla si es otro pedido. */
  async function buscarDuplicados(nuevas: LineaPedidoEditable[]) {
    const normal = (x: string) => x.toLowerCase().replace(/[\s-]/g, "");
    await Promise.all(
      nuevas.map(async (l, i) => {
        if (l.recibido || l.soloRecepcion) return;
        const encontrados = new Map<string, CandidatoRecepcion>();
        try {
          const num = (l.numeroPedidoLinea || "").trim();
          if (num.length >= 5 && /\d/.test(num)) {
            const r = await fetch(`/api/compras?busqueda=${encodeURIComponent(num)}&porPagina=50`).then((x) => x.json()).catch(() => null);
            const buscadas = palabrasDe(l.nombre);
            for (const c of (r?.ok ? r.compras : []) as { origen: "reparacion" | "venta"; pedidoId: string; resguardo: string; clienteNombre: string; numeroPedido: string; descripcion: string; estado: string; costo: number | null }[]) {
              if (normal(c.numeroPedido || "") !== normal(num) || String(c.estado).toLowerCase() === "cancelado") continue;
              if (c.descripcion && ![...palabrasDe(c.descripcion)].some((w) => buscadas.has(w))) continue;
              const clave = `${c.origen}-${c.pedidoId}`;
              encontrados.set(clave, {
                clave, origen: c.origen, id: c.pedidoId, titulo: c.descripcion || "Pieza",
                detalle: `${c.origen === "venta" ? `Venta ${c.resguardo}` : `Resguardo ${c.resguardo}`} · ${c.clienteNombre || "—"} · pedido ${c.numeroPedido || "—"}`,
                estado: c.estado, costo: c.costo ?? null, numeroPedido: c.numeroPedido || "",
              });
            }
          }
          if (l.destino === "tienda" && l.referencia) {
            const r = await fetch(`/api/stock-piezas/pedidos/buscar?q=${encodeURIComponent(l.referencia)}`).then((x) => x.json()).catch(() => null);
            for (const sp of (r?.ok ? r.pedidos : []) as { id: number; referencia: string; proveedor: string | null; cantidad: number; estado: string }[]) {
              if (String(sp.estado).toLowerCase() !== "pendiente" || sp.referencia !== l.referencia || sp.cantidad !== l.cantidad) continue;
              const clave = `stock-${sp.id}`;
              encontrados.set(clave, { clave, origen: "stock", id: String(sp.id), titulo: sp.referencia, detalle: `Stock · ${sp.proveedor || "—"} · ${sp.cantidad} uds`, estado: sp.estado, costo: null, numeroPedido: "" });
            }
          }
        } catch {
          /* sin coincidencias */
        }
        const lista = [...encontrados.values()];
        if (lista.length === 0) return;
        setLineas((prev) => prev.map((x, idx) => (idx !== i || x.recibido ? x : { ...x, posiblesDuplicados: lista, aplicar: false })));
      })
    );
  }

  /** Analiza TODOS los archivos juntos, solo cuando se pulsa el botón (así no
      se empieza a leer la primera captura antes de adjuntar las demás). */
  async function analizar() {
    const sueltos = textosSueltos.filter((t) => t.texto.trim());
    if (archivos.length === 0 && sueltos.length === 0) return;
    // Nombres para indicar de qué imagen o texto sale cada línea (mismo orden que los elementos enviados).
    const fuentes = [...archivos.map((a) => a.nombre), ...sueltos.map((_, k) => `Texto ${k + 1}`)];
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
          // Cada imagen con su texto, y los textos sueltos (sin imagen): el texto de una imagen solo vale para ella.
          elementos: [
            ...archivos.map((a) => ({ base64: a.base64, mimeType: a.mimeType, texto: a.texto.trim() || undefined })),
            ...sueltos.map((t) => ({ texto: t.texto.trim() })),
          ],
          // Sin imágenes, el proveedor lo dice el propio texto ("Asus 1184556 …"), no el campo del diálogo.
          nombreProveedor: archivos.length > 0 ? proveedorNombre : "",
        }),
      });
      const envio = await res.json();
      if (!envio.ok || !envio.jobId) throw new Error(envio.error || "No se pudo iniciar el análisis");

      // 2) Se consulta el resultado cada pocos segundos (máx. 4 minutos).
      let data: {
        estado: string; error?: string; numeroPedidoGlobal?: string | null; lineas?: LineaPedidoProveedorLeida[];
        proveedorIdSugerido?: string | null; proveedorCreado?: boolean; avisos?: string[]; documentoEsFactura?: boolean;
      } | null = null;
      // Varias imágenes con texto se leen una a una (la IA atiende de una en una): margen de 7 minutos.
      while (Date.now() - inicio < 420_000) {
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
        toast.warning("No se leyó ninguna línea de pedido en los archivos o el texto");
        return;
      }
      const lineasNuevas = data.lineas.map((l) => {
        const base = lineaDesdeOcr(l, data.numeroPedidoGlobal ?? null);
        // "Ya llegó" si lo eligió el empleado antes de analizar o lo dice el texto de esa línea ("recibido", "llegó").
        const recibido = base.recibido || llegada === "llego";
        return { ...base, recibido, buscandoRecepcion: recibido, fuente: l.elemento != null ? fuentes[l.elemento] || "" : "" };
      });
      if (data.avisos?.length) toast.warning(data.avisos.join(" · "));
      setLineas(lineasNuevas);
      if (data.documentoEsFactura && llegada === "aun_no") {
        toast.info("Parece una factura o albarán. Si la mercancía ya llegó al local, marca «Ya llegó» en las líneas (o en la casilla de arriba).");
      }
      void buscarRecepciones(lineasNuevas);
      void buscarDuplicados(lineasNuevas);
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

  /** Marca o desmarca TODAS las líneas como "ya llegó al local" (p. ej. porque lo que se sube es la factura del proveedor). */
  function cambiarTodoRecibido(valor: boolean) {
    const actualizadas = lineas.map((l) => ({
      ...l,
      recibido: valor,
      buscandoRecepcion: valor,
      accion: valor ? l.accion : l.soloRecepcion ? l.accion : ("registrar" as const),
    }));
    setLineas(actualizadas);
    if (valor) void buscarRecepciones(actualizadas);
  }

  /** Una línea que ya llegó no tiene enlace de compra ni fecha estimada (viene de una factura o un aviso): se usan
      valores por defecto en vez de bloquear el registro. */
  function enlaceEfectivo(l: LineaPedidoEditable): string {
    return l.enlace.trim() || (l.recibido ? `Recibido (factura ${proveedorNombre || "proveedor"})` : "");
  }
  function fechaEstimadaEfectiva(l: LineaPedidoEditable): string {
    return l.fechaEstimada || (l.recibido ? new Date().toISOString().slice(0, 10) : "");
  }

  /** Una línea concreta: ya llegó (se buscan los pedidos a los que corresponde) o aún no (vuelve a ser un pedido nuevo). */
  function cambiarRecibidoLinea(i: number, valor: boolean) {
    const actualizadas = lineas.map((l, idx) =>
      idx !== i ? l : { ...l, recibido: valor, buscandoRecepcion: valor, accion: valor ? l.accion : l.soloRecepcion ? l.accion : ("registrar" as const) }
    );
    setLineas(actualizadas);
    if (valor) void buscarRecepciones(actualizadas, i);
  }

  /** Cambia lo que se hará con una línea "ya llegó" y deja marcada la selección más probable en cada caso. */
  function cambiarAccion(i: number, accion: "registrar" | "recibir" | "vincular") {
    setLineas((prev) =>
      prev.map((l, idx) => {
        if (idx !== i) return l;
        const buscadas = palabrasDe(l.nombre);
        const afin = (c: CandidatoRecepcion) => [...palabrasDe(c.titulo)].some((w) => buscadas.has(w));
        if (accion === "recibir") {
          const pend = l.candidatosRecepcion.filter((c) => c.estado !== "Recibido" && c.estado !== "Cancelado" && c.estado !== "recibido");
          const afines = pend.filter(afin);
          return { ...l, accion, recibirIds: (afines.length > 0 ? afines : pend).map((c) => c.clave) };
        }
        if (accion === "vincular") {
          const rec = l.candidatosRecepcion.filter((c) => c.origen === "reparacion" && c.estado === "Recibido");
          return { ...l, accion, recibirIds: rec.filter(afin).map((c) => c.clave) };
        }
        return { ...l, accion };
      })
    );
  }

  function actualizar(i: number, cambios: Partial<LineaPedidoEditable>) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...cambios } : l)));
  }

  function lineaListaParaRegistrar(l: LineaPedidoEditable): boolean {
    if (!l.aplicar) return true; // no bloquea el registro de las demás
    if (l.accion === "recibir" || l.accion === "vincular") return l.recibirIds.length > 0;
    if (l.destino === "tienda") {
      // Pieza nueva (sin referencia existente): el nombre interno de
      // proveedor es obligatorio — es lo único con lo que la IA podrá
      // reconocerla la próxima vez.
      return l.referencia.trim() !== "" || l.nombreInternoProveedor.trim() !== "";
    }
    if (l.origenCliente === "venta") {
      if (!l.ventaId || (l.itemIds.length === 0 && !l.nuevaPieza) || !proveedorIdSugerido) return false;
      if (l.nuevaPieza && (!(l.costo > 0) || !(l.precioNuevaPieza > 0))) return false;
    } else if (!l.resguardo) return false;
    // Piezas de una venta que ya se recibieron: solo se vincula el pedido (nº de pedido); el enlace y la fecha
    // estimada solo hacen falta para piezas aún sin recibir o nuevas.
    const soloVincular = l.origenCliente === "venta" && !l.nuevaPieza && l.itemIds.every((id) => l.ventaItems.find((it) => it.itemId === id)?.estadoPedido === "Pieza Recibida");
    if (!l.numeroPedido.trim()) return false;
    // Si ya llegó (factura/albarán o aviso de recibido) no hay enlace ni fecha estimada que exigir: se rellenan solos.
    if (!soloVincular && !l.recibido && (!l.enlace.trim() || !l.fechaEstimada)) return false;
    // El coste de las piezas de una venta ya está en la propia venta; el de una reparación se guarda con el pedido.
    if (l.origenCliente !== "venta" && !(l.costo > 0)) return false;
    if (numeroPedidoEsEnlace(l.numeroPedido)) return false;
    return true;
  }

  const itemsVentaUsados = lineas.filter((l) => l.aplicar && l.accion === "registrar" && l.destino === "cliente" && l.origenCliente === "venta").flatMap((l) => l.itemIds);
  const hayItemRepetido = new Set(itemsVentaUsados).size !== itemsVentaUsados.length;
  const todoRecibido = lineas.length > 0 && lineas.every((l) => l.recibido);
  const hayAlgoAplicado = lineas.some((l) => l.aplicar);
  const todoListo = lineas.every(lineaListaParaRegistrar) && !hayItemRepetido && (!lineas.some((l) => l.aplicar && l.accion === "registrar" && l.destino === "cliente" && l.origenCliente !== "venta") || !!compradoPor.trim());

  async function registrar() {
    setRegistrando(true);
    let okStock = 0, okResguardo = 0, okRecibidos = 0, fallos = 0;
    const resumen: LineaRegistroPedidoProveedor[] = [];
    try {
      // --- Líneas "recibir": marcan como RECIBIDOS pedidos que ya estaban registrados (sin crear nada nuevo) ---
      const yaMarcados = new Set<string>();
      for (const l of lineas) {
        if (!l.aplicar || (l.accion !== "recibir" && l.accion !== "vincular")) continue;
        const elegidos = l.candidatosRecepcion.filter((c) => l.recibirIds.includes(c.clave) && !yaMarcados.has(c.clave));
        let okLinea = 0;
        for (const c of elegidos) {
          yaMarcados.add(c.clave);
          try {
            const res =
              l.accion === "vincular"
                ? await fetch(`/api/pedidos/${encodeURIComponent(c.id)}/vincular`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ numeroPedido: l.numeroPedido.trim(), costo: l.actualizarCoste ? l.costo : undefined }) })
                : c.origen === "reparacion"
                ? await fetch("/api/pedidos/cambiar-estado", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pedidos: [c.id], estado: "Recibido", recibidoPor: compradoPor || undefined }) })
                : c.origen === "venta"
                  ? await fetch(`/api/items-venta/${encodeURIComponent(c.id)}/recibir`, { method: "POST" })
                  : await fetch(`/api/stock-piezas/pedidos/${encodeURIComponent(c.id)}/recibido`, { method: "POST" });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error || "No se pudo marcar como recibido");
            okLinea++;
          } catch (e) {
            fallos++;
            toast.error(`"${c.titulo}": ${e instanceof Error ? e.message : "error desconocido"}`);
          }
        }
        okRecibidos += okLinea;
        resumen.push({ nombre: l.nombre, cantidad: l.cantidad, destino: l.destino, destinoDetalle: `${l.accion === "vincular" ? "Vinculado" : "Recibido"}: ${elegidos.map((c) => c.detalle).join(" | ")}`, ok: okLinea === elegidos.length && okLinea > 0 });
      }

      // --- Líneas "tienda": crear pieza si hace falta, luego pedido pendiente ---
      for (const l of lineas) {
        if (!l.aplicar || l.accion !== "registrar" || l.destino !== "tienda") continue;
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
                proveedor: l.proveedorTexto || proveedorNombre, stockDisponible: 0, stockMinimo: 0,
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
          // El mensaje decía que ya llegó: el pedido de stock se marca recibido en el acto (y el stock sube).
          let detalleRecibido = referencia;
          if (l.recibido && dataPedido.pedido?.id != null) {
            const resRec = await fetch(`/api/stock-piezas/pedidos/${encodeURIComponent(String(dataPedido.pedido.id))}/recibido`, { method: "POST" });
            const dataRec = await resRec.json();
            if (dataRec.ok) detalleRecibido = `${referencia} (recibido)`;
            else toast.error(`"${l.nombre}": se registró el pedido pero no se pudo marcar recibido: ${dataRec.error || "error"}`);
          }
          resumen.push({ nombre: l.nombre, cantidad: l.cantidad, destino: "tienda", destinoDetalle: detalleRecibido, ok: true });
        } catch (e) {
          fallos++;
          resumen.push({ nombre: l.nombre, cantidad: l.cantidad, destino: "tienda", destinoDetalle: "", ok: false });
          toast.error(`"${l.nombre}": ${e instanceof Error ? e.message : "error desconocido"}`);
        }
      }

      // --- Líneas "cliente": agrupadas por resguardo, una llamada por grupo ---
      const porResguardo = new Map<string, LineaPedidoEditable[]>();
      for (const l of lineas) {
        if (!l.aplicar || l.accion !== "registrar" || l.destino !== "cliente" || l.origenCliente === "venta" || !l.resguardo) continue;
        const arr = porResguardo.get(l.resguardo) || [];
        arr.push(l);
        porResguardo.set(l.resguardo, arr);
      }
      for (const [resguardo, grupo] of porResguardo) {
        try {
          const piezas = grupo.flatMap((l) =>
            Array.from({ length: l.cantidad }, () => ({
              descripcion: l.nombre, proveedor: proveedorIdSugerido || "", enlace: enlaceEfectivo(l),
              numeroPedido: l.numeroPedido.trim(), fechaEstimada: fechaEstimadaEfectiva(l), costo: l.costo,
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
          // La mercancía ya llegó (factura/albarán o aviso): los pedidos recién creados se marcan Recibidos en el acto.
          if (grupo.some((l) => l.recibido) && Array.isArray(data.pedidoIds) && data.pedidoIds.length > 0) {
            const resRec = await fetch("/api/pedidos/cambiar-estado", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pedidos: data.pedidoIds, estado: "Recibido", recibidoPor: compradoPor || undefined }),
            });
            const dataRec = await resRec.json();
            if (!dataRec.ok) toast.error(`Resguardo ${resguardo}: se registró el pedido pero no se pudo marcar recibido: ${dataRec.error || "error"}`);
          }
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
        if (!l.aplicar || l.accion !== "registrar" || l.destino !== "cliente" || l.origenCliente !== "venta" || !l.ventaId) continue;
        let okLinea = 0;
        let errorLinea = "";
        const idsPedir = [...l.itemIds];
        // Pieza que no existe en la venta: se añade primero como pieza nueva (POST /api/ventas/:id/items, el mismo
        // que "Agregar Pieza" en Ventas) y luego se le registra el pedido como a las demás.
        if (l.nuevaPieza) {
          const nuevas = Math.max(1, l.cantidad - l.itemIds.length);
          for (let n = 0; n < nuevas; n++) {
            try {
              const resNueva = await fetch(`/api/ventas/${encodeURIComponent(l.ventaId)}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ descripcion: l.nombre, costo: l.costo, precio: l.precioNuevaPieza, proveedorId: proveedorIdSugerido || "", proveedorOtro: "", enlace: enlaceEfectivo(l) }),
              });
              const dataNueva = await resNueva.json();
              if (!dataNueva.ok || !dataNueva.item?.itemId) throw new Error(dataNueva.error || "No se pudo añadir la pieza a la venta");
              idsPedir.push(String(dataNueva.item.itemId));
            } catch (e) {
              errorLinea = e instanceof Error ? e.message : "error desconocido";
            }
          }
        }
        for (const itemId of idsPedir) {
          try {
            // Pieza ya recibida y vendida: solo se vincula el pedido real (no cambia su estado). Resto: pedido nuevo.
            const yaRecibida = l.ventaItems.find((it) => it.itemId === itemId)?.estadoPedido === "Pieza Recibida";
            const res = await fetch(`/api/items-venta/${encodeURIComponent(itemId)}/${yaRecibida ? "vincular-pedido" : "registrar-pedido"}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
                yaRecibida
                  ? { proveedorId: proveedorIdSugerido || "", numeroPedido: l.numeroPedido.trim(), enlace: l.enlace.trim() }
                  : { proveedorId: proveedorIdSugerido || "", proveedorOtro: "", numeroPedido: l.numeroPedido.trim(), fechaEstimada: fechaEstimadaEfectiva(l), enlace: enlaceEfectivo(l) }
              ),
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error || "No se pudo registrar el pedido");
            // Pieza nueva o aún sin recibir, y la mercancía ya llegó: se marca recibida (las ya recibidas solo se vinculan).
            if (!yaRecibida && l.recibido) {
              const resRec = await fetch(`/api/items-venta/${encodeURIComponent(itemId)}/recibir`, { method: "POST" });
              const dataRec = await resRec.json();
              if (!dataRec.ok) throw new Error(`pedido registrado pero no se pudo marcar recibido: ${dataRec.error || "error"}`);
            }
            okLinea++;
          } catch (e) {
            errorLinea = e instanceof Error ? e.message : "error desconocido";
          }
        }
        const detalle = `Venta ${l.ventaId} · ${l.clienteElegido || l.ventaId}`;
        okResguardo += okLinea;
        fallos += idsPedir.length - okLinea;
        resumen.push({ nombre: l.nombre, cantidad: l.cantidad, destino: "cliente", destinoDetalle: detalle, ok: okLinea === idsPedir.length && okLinea > 0 });
        if (errorLinea) toast.error(`Venta ${l.ventaId}: ${errorLinea}`);
      }

      toast.success(`${okStock} pedido(s) de stock, ${okResguardo} pedido(s) de cliente (reparación o venta) registrados${okRecibidos ? `, ${okRecibidos} pedido(s) existente(s) marcado(s) o vinculado(s)` : ""}${fallos ? ` — ${fallos} con error` : ""}`);
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
            <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={leyendoOcr || textosSueltos.length >= 6} onClick={anadirTextoSuelto} title="Para avisos como «Asus 1184556 6 cargadores recibido», sin imagen">
              <Add className="size-4" /> Solo texto
            </Button>
            <Button
              type="button" variant="outline" size="sm"
              className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/40"
              disabled={leyendoOcr || preparando || (archivos.length === 0 && !textosSueltos.some((t) => t.texto.trim()))} onClick={analizar}
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

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">¿La mercancía ya llegó al local?</span>
            <div className="inline-flex rounded-lg border bg-card p-0.5">
              <Button type="button" size="sm" variant={llegada === "aun_no" ? "default" : "ghost"} className="h-7 px-2.5 text-xs" disabled={leyendoOcr} onClick={() => setLlegada("aun_no")}>
                Aún no ha llegado
              </Button>
              <Button type="button" size="sm" variant={llegada === "llego" ? "default" : "ghost"} className="h-7 px-2.5 text-xs" disabled={leyendoOcr} onClick={() => setLlegada("llego")}>
                Ya llegó
              </Button>
            </div>
            <span className="text-[11px] text-muted-foreground">Después podrás cambiarlo en cada línea.</span>
          </div>

          {(archivos.length > 0 || textosSueltos.length > 0) && (
            <div className="space-y-2">
              {archivos.map((a) => (
                <div key={a.id} className="space-y-1.5 rounded-md border bg-muted/30 p-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    {a.esPdf ? <DocumentText className="size-3.5 shrink-0" /> : <Gallery className="size-3.5 shrink-0" />}
                    <span className="min-w-0 flex-1 truncate font-medium">{a.nombre}</span>
                    <button
                      type="button" title="Quitar este archivo" disabled={leyendoOcr}
                      className="text-muted-foreground hover:text-destructive disabled:opacity-50" onClick={() => quitarArchivo(a.id)}
                    >
                      <CloseCircle className="size-3.5" />
                    </button>
                  </div>
                  <Input
                    className="h-8 bg-background text-sm" disabled={leyendoOcr} value={a.texto}
                    placeholder="Texto de esta imagen (opcional): resguardo, cliente, «recibida»… Ej.: 19304 recibida"
                    onChange={(e) => ponerTextoArchivo(a.id, e.target.value)}
                  />
                </div>
              ))}
              {textosSueltos.map((t, k) => (
                <div key={t.id} className="space-y-1.5 rounded-md border border-dashed bg-muted/30 p-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <DocumentText className="size-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 font-medium">Texto {k + 1} (sin imagen)</span>
                    <button
                      type="button" title="Quitar este texto" disabled={leyendoOcr}
                      className="text-muted-foreground hover:text-destructive disabled:opacity-50" onClick={() => setTextosSueltos((prev) => prev.filter((x) => x.id !== t.id))}
                    >
                      <CloseCircle className="size-3.5" />
                    </button>
                  </div>
                  <Textarea
                    className="min-h-12 bg-background text-sm" disabled={leyendoOcr} value={t.texto}
                    placeholder={"Ej.: Asus 1184556 6 cargadores recibido\naliexpress 3076642294525134 llegó"}
                    onChange={(e) => setTextosSueltos((prev) => prev.map((x) => (x.id === t.id ? { ...x, texto: e.target.value } : x)))}
                  />
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground">
                El texto de una imagen solo se aplica a esa imagen. Un número de 5 dígitos es un resguardo; uno de 6 o más, un nº de pedido. Con «recibido» o «llegó» se marcan como recibidos los pedidos ya registrados.
              </p>
            </div>
          )}

          {lineas.length > 0 && (
            <>
              <label className="flex cursor-pointer items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2 text-xs">
                <Checkbox checked={todoRecibido} onCheckedChange={(v) => cambiarTodoRecibido(v === true)} className="mt-0.5" />
                <span>
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">Todas las líneas ya llegaron al local</span>
                  <span className="block text-muted-foreground">
                    Marca o quita «Ya llegó» en todas a la vez; también puedes decidirlo línea por línea. Lo que ya llegó se registra como Recibido (los pedidos de reparación y de venta pasan a Recibido y el stock de tienda sube); lo que no, queda como pedido en camino.
                  </span>
                </span>
              </label>

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
                            {l.fuente && <span className="max-w-40 truncate rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground" title={l.fuente}>de: {l.fuente}</span>}
                            <label className="flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs" title="Marca si esta mercancía ya llegó al local; desmárcala si aún está en camino">
                              <Checkbox checked={l.recibido} onCheckedChange={(v) => cambiarRecibidoLinea(i, v === true)} />
                              Ya llegó
                            </label>
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

                          {l.posiblesDuplicados.length > 0 && !l.recibido && (
                            <div className="space-y-1 rounded-md border border-amber-400/60 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                              <p className="flex items-center gap-1.5 font-medium"><Warning2 className="size-3.5" /> Posible duplicado: este pedido ya parece estar registrado</p>
                              <ul className="list-disc pl-5">
                                {l.posiblesDuplicados.map((c) => <li key={c.clave}>{c.id} · {c.titulo} · {c.detalle} · {c.estado}</li>)}
                              </ul>
                              <p>Por eso la línea quedó desmarcada y no se registrará. Si es un pedido distinto, vuelve a marcar la casilla de la izquierda.</p>
                            </div>
                          )}

                          {(l.recibido || l.soloRecepcion) && (
                            <div className="space-y-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2">
                              <p className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                <TickCircle className="size-3.5" /> Indicado como recibido
                                {l.numeroPedidoLinea ? ` · pedido ${l.numeroPedidoLinea}` : ""}
                                {l.resguardo && l.destino === "cliente" ? ` · resguardo ${l.resguardo}` : ""}
                                {l.proveedorTexto ? ` · ${l.proveedorTexto}` : ""}
                              </p>
                              {l.buscandoRecepcion ? (
                                <p className="text-xs text-muted-foreground">Buscando pedidos ya registrados…</p>
                              ) : l.candidatosRecepcion.length > 0 ? (
                                <>
                                  <div className="flex flex-wrap gap-1.5">
                                    {l.candidatosRecepcion.some((c) => c.estado !== "Recibido" && c.estado !== "Cancelado" && c.estado !== "recibido") && (
                                      <Button type="button" size="sm" variant={l.accion === "recibir" ? "default" : "outline"} className="h-7 text-xs" onClick={() => cambiarAccion(i, "recibir")}>
                                        Marcar pedido existente como recibido
                                      </Button>
                                    )}
                                    {l.candidatosRecepcion.some((c) => c.origen === "reparacion" && c.estado === "Recibido") && (
                                      <Button type="button" size="sm" variant={l.accion === "vincular" ? "default" : "outline"} className="h-7 text-xs" onClick={() => cambiarAccion(i, "vincular")}>
                                        Vincular a un pedido ya recibido
                                      </Button>
                                    )}
                                    {!l.soloRecepcion && (
                                      <Button type="button" size="sm" variant={l.accion === "registrar" ? "default" : "outline"} className="h-7 text-xs" onClick={() => cambiarAccion(i, "registrar")}>
                                        Registrar como pedido nuevo
                                      </Button>
                                    )}
                                  </div>
                                  {(l.accion === "recibir" || l.accion === "vincular") && (
                                    <div className="space-y-1 rounded-md border bg-card p-2">
                                      {l.candidatosRecepcion.filter((c) => (l.accion === "vincular" ? c.origen === "reparacion" && c.estado === "Recibido" : c.estado !== "Recibido" && c.estado !== "Cancelado" && c.estado !== "recibido")).map((c) => (
                                        <label key={c.clave} className="flex cursor-pointer items-center gap-2 text-xs">
                                          <Checkbox
                                            checked={l.recibirIds.includes(c.clave)}
                                            onCheckedChange={(v) => actualizar(i, { recibirIds: v === true ? [...l.recibirIds, c.clave] : l.recibirIds.filter((x) => x !== c.clave) })}
                                          />
                                          <span className="min-w-0 flex-1 truncate"><span className="font-medium">{c.titulo}</span> <span className="text-muted-foreground">· {c.detalle}</span></span>
                                          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{c.estado}</span>
                                        </label>
                                      ))}
                                      {l.recibirIds.length === 0 && <p className="text-[11px] text-amber-700 dark:text-amber-400">Marca al menos un pedido.</p>}
                                      {l.accion === "vincular" && (
                                        <div className="space-y-1 border-t pt-1.5">
                                          <p className="text-[11px] text-muted-foreground">
                                            Estos pedidos ya figuran como recibidos: solo se les anota el nº de pedido real ({l.numeroPedido || "—"}); su estado no cambia y no se crea ningún pedido nuevo.
                                          </p>
                                          <label className="flex cursor-pointer items-center gap-2 text-xs">
                                            <Checkbox checked={l.actualizarCoste} onCheckedChange={(v) => actualizar(i, { actualizarCoste: v === true })} />
                                            Actualizar también el coste al realmente pagado ({l.costo.toFixed(2)} €)
                                          </label>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <p className="text-[11px] text-muted-foreground">
                                  {l.soloRecepcion
                                    ? "No encuentro ningún pedido registrado con esa referencia, así que no hay nada que marcar como recibido (la línea queda desmarcada)."
                                    : l.destino === "tienda"
                                      ? "No hay un pedido pendiente que coincida: se registrará el pedido y se marcará como recibido (el stock sube)."
                                      : "No hay un pedido pendiente que coincida: se registrará como pedido nuevo y se marcará como recibido."}
                                </p>
                              )}
                            </div>
                          )}

                          <div className={l.accion === "registrar" ? "space-y-2" : "hidden"}>
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
                                      ? actualizar(i, { origenCliente: "venta", ventaId: c.ventaId, resguardo: "", ventaItems: c.items, itemIds: itemsQueEncajan(l.nombre, c.items, l.cantidad), nuevaPieza: false, precioNuevaPieza: 0, clienteElegido: c.clienteNombre, equipoElegido: "" })
                                      : actualizar(i, { origenCliente: "reparacion", resguardo: c.resguardo, ventaId: "", ventaItems: [], itemIds: [], nuevaPieza: false, precioNuevaPieza: 0, clienteElegido: c.clienteNombre, equipoElegido: c.detalle })
                                  }
                                />
                              ) : (
                                <>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                                      <Profile2User className="size-3.5" /> {l.clienteElegido || l.resguardo || l.ventaId} · {l.origenCliente === "venta" ? `Venta ${l.ventaId}` : l.resguardo}{l.equipoElegido ? ` · ${l.equipoElegido}` : ""}
                                    </span>
                                    <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => actualizar(i, { origenCliente: "reparacion", resguardo: "", ventaId: "", ventaItems: [], itemIds: [], nuevaPieza: false, precioNuevaPieza: 0, clienteElegido: "", equipoElegido: "" })}>
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
                                          <span className="min-w-0 flex-1 truncate">{it.descripcion}</span>
                                          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{it.estadoPedido}</span>
                                        </label>
                                      ))}
                                      <label className="flex cursor-pointer items-center gap-2 border-t pt-1.5 text-xs font-medium">
                                        <Checkbox checked={l.nuevaPieza} onCheckedChange={(v) => actualizar(i, { nuevaPieza: v === true })} />
                                        No está en la lista: añadirla como pieza nueva de esta venta
                                      </label>
                                      {l.nuevaPieza && (
                                        <div className="grid grid-cols-1 gap-2 rounded-md bg-muted/50 p-2 sm:grid-cols-2">
                                          <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Precio de compra (€)</Label>
                                            <DecimalInput className="h-8 w-full" value={l.costo} onChange={(n) => actualizar(i, { costo: n })} />
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Precio al cliente (€)</Label>
                                            <DecimalInput className="h-8 w-full" value={l.precioNuevaPieza} onChange={(n) => actualizar(i, { precioNuevaPieza: n })} />
                                          </div>
                                          <p className="text-[11px] text-muted-foreground sm:col-span-2">Se añade a la venta y cambia su total y su ganancia; la factura ya emitida no se modifica.</p>
                                        </div>
                                      )}
                                      {l.itemIds.some((id) => l.ventaItems.find((it) => it.itemId === id)?.estadoPedido === "Pieza Recibida") && (
                                        <p className="text-[11px] text-muted-foreground">
                                          Las piezas ya recibidas solo se <strong>vinculan</strong> a este pedido (nº de pedido, proveedor y enlace si lo indicas): su estado, coste y precio no cambian.
                                          El enlace y la fecha estimada solo hacen falta para piezas sin recibir o nuevas.
                                        </p>
                                      )}
                                      {l.itemIds.length === 0 && !l.nuevaPieza && <p className="text-[11px] text-amber-700 dark:text-amber-400">Marca al menos una pieza o añádela como nueva.</p>}
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
                    </div>
                  ))}
              </div>
            </>
          )}

          {lineas.length === 0 && (
            <p className="flex items-center gap-1.5 py-6 text-center text-sm text-muted-foreground">
              <Box1 className="size-4" /> Añade de 1 a 4 archivos del pedido (pantallazos o PDF) y/o escribe un texto, y pulsa «Analizar con IA».
            </p>
          )}
        </div>
        </ScrollArea>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t bg-muted/50 px-4 py-3 sm:flex-row sm:justify-end">
          {hayItemRepetido && <p className="text-xs text-destructive sm:mr-auto sm:self-center">Dos líneas tienen marcada la misma pieza de una venta: asigna cada pieza a una sola línea.</p>}
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
