"use client";

import { useEffect, useRef, useState } from "react";
import { esPlataformaSinFactura } from "@/lib/compras";
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
  /** «Total» del pedido (tiendas online) y si el precio por unidad sale de él: al cambiar la cantidad, el precio se recalcula (Total ÷ cantidad). */
  totalPedido: number | null;
  precioDelTotal: boolean;
  /** Precio de una unidad tal como sale en la web; con la cantidad y el total se calcula el descuento (o los gastos extra). */
  precioListado: number | null;
  /** Los precios de la web llevan IVA y el total del pedido no (0,21 = 21 %): el coste que se registra es sin IVA. */
  ivaIncluido: number;
  /** El precio que sale en la web es el de TODAS las unidades juntas (eBay: «USD72,35» junto a «Cantidad: 2»); el de cada una es ese ÷ cantidad. */
  precioDeLinea: number | null;
  /** Descuento del pedido (€) sobre esta línea: cantidad × precio − descuento = lo que se pagó. El precio por unidad no cambia. */
  descuento: number;
  /** La cantidad no se leía en la captura y se dedujo del total: hay que revisarla. */
  cantidadInferida: boolean;
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

/** Coste real por unidad: (cantidad × precio − descuento) ÷ cantidad. Es lo que se registra en el pedido, para que el total cuadre con lo pagado. */
function costoNeto(l: { costo: number; cantidad: number; descuento: number }): number {
  if (!(l.descuento > 0) || !(l.cantidad > 0)) return l.costo;
  return Math.max(0, Math.round(((l.costo * l.cantidad - l.descuento) / l.cantidad) * 100) / 100);
}

const SIMBOLO_MONEDA: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", CAD: "C$", AUD: "A$", JPY: "¥", CNY: "¥", CHF: "CHF ", SEK: "kr ", NOK: "kr ", DKK: "kr ", PLN: "zł " };
const simboloDe = (m?: string | null) => (m ? SIMBOLO_MONEDA[m] ?? `${m} ` : "€");
/** Importe en la moneda del pedido: euros «90,18 €», dólares «$101,61». */
const fmtMoneda = (n: number, moneda?: string | null) => {
  const num = n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return !moneda || moneda === "EUR" ? `${num} €` : `${simboloDe(moneda)}${num}`;
};

/** Una línea (pedido de un solo artículo): compara el total del pedido con cantidad × precio de la web y explica la diferencia como descuento o gastos extra. */
function NotaTotalPedido({ l, moneda, unica = true }: { l: LineaPedidoEditable; moneda?: string | null; unica?: boolean }) {
  const eurFmt = (n: number) => fmtMoneda(n, moneda);
  if (l.precioDeLinea != null && l.cantidad > 1) {
    return (
      <div className="space-y-0.5 text-[11px] sm:col-span-2">
        <p className="text-emerald-700 dark:text-emerald-400">
          En la web, {eurFmt(l.precioDeLinea)} es el precio de las <strong>{l.cantidad} unidades juntas</strong> (cantidad leída en la imagen) → <strong>{eurFmt(l.costo)} por unidad</strong>. No es un descuento.
        </p>
      </div>
    );
  }
  if (l.ivaIncluido > 0 && l.precioListado != null) {
    const pct = Math.round(l.ivaIncluido * 100);
    return (
      <div className="space-y-0.5 text-[11px] sm:col-span-2">
        {l.cantidadInferida && <p className="font-medium text-amber-700 dark:text-amber-400">La cantidad no se veía en la captura: se dedujo del total ({l.cantidad} unidades). Revisa que sea correcta.</p>}
        <p className="text-emerald-700 dark:text-emerald-400">
          En la web: {eurFmt(l.precioListado)} por unidad <strong>con IVA {pct} % incluido</strong> → <strong>{eurFmt(l.costo)} sin IVA</strong>
          {unica && l.totalPedido ? <> · {l.cantidad} × {eurFmt(l.costo)} ≈ total del pedido {eurFmt(l.totalPedido)} (el total de la web va sin IVA) ✓</> : null}
        </p>
      </div>
    );
  }
  if (!l.totalPedido) return null;
  const total = l.totalPedido;
  const suma = Math.round((l.cantidad * l.costo - (l.descuento || 0)) * 100) / 100;
  if (l.descuento > 0) {
    const bruto = Math.round(l.cantidad * l.costo * 100) / 100;
    const cuadraDesc = Math.abs(suma - total) <= Math.max(0.5, total * 0.03);
    return (
      <div className="space-y-0.5 text-[11px] sm:col-span-2">
        {l.cantidadInferida && <p className="font-medium text-amber-700 dark:text-amber-400">La cantidad no se veía en la captura: se dedujo del total ({l.cantidad} unidades). Revisa que sea correcta.</p>}
        <p className={cuadraDesc ? "text-emerald-700 dark:text-emerald-400" : "font-medium text-destructive"}>
          {l.cantidad} × {eurFmt(l.costo)} = {eurFmt(bruto)} − descuento {eurFmt(l.descuento)} = <strong>{eurFmt(suma)}</strong> · total del pedido {eurFmt(total)}
          {cuadraDesc ? " ✓" : " — no cuadra: revisa el descuento"}. Coste real por unidad: <strong>{eurFmt(costoNeto(l))}</strong>
        </p>
      </div>
    );
  }
  if (l.precioListado != null && l.precioListado > 0) {
    const bruto = Math.round(l.precioListado * l.cantidad * 100) / 100;
    const dif = Math.round((bruto - total) * 100) / 100;
    const unidad = Math.round((total / l.cantidad) * 100) / 100;
    if (Math.abs(dif) > Math.max(0.5, total * 0.03)) {
      return (
        <div className="space-y-0.5 text-[11px] sm:col-span-2">
          {l.cantidadInferida && <p className="font-medium text-amber-700 dark:text-amber-400">La cantidad no se veía en la captura: se dedujo del total ({l.cantidad} unidades). Revisa que sea correcta.</p>}
          <p className={dif > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}>
            En la web: {l.cantidad} × {eurFmt(l.precioListado)} = {eurFmt(bruto)} · total pagado {eurFmt(total)} →{" "}
            {dif > 0 ? <strong>descuento de {eurFmt(dif)} ({Math.round((dif / bruto) * 100)} %)</strong> : <strong>{eurFmt(-dif)} más (envío o impuestos)</strong>}
            . Coste por unidad: <strong>{eurFmt(unidad)}</strong>
          </p>
        </div>
      );
    }
  }
  const cuadra = Math.abs(suma - total) <= Math.max(0.5, total * 0.03);
  return (
    <p className={`text-[11px] sm:col-span-2 ${cuadra ? "text-emerald-700 dark:text-emerald-400" : "font-medium text-destructive"}`}>
      Total del pedido: {eurFmt(total)} · esta línea: {l.cantidad} × {eurFmt(l.costo)} = {eurFmt(suma)}
      {l.precioDelTotal ? " (precio calculado con el total; si compraste varias unidades, cambia la cantidad y se recalcula)" : cuadra ? " ✓" : " — no cuadra: revisa la cantidad y el precio"}
    </p>
  );
}

/** Lo que hizo la IA con la captura: resumen de lo deducido y cada lectura del OCR (normal, ampliada y zooms), para comprobar en qué se basó. */
function PanelLecturas({ texto, lineas, zooms, moneda, imagenes, onOcultar }: {
  texto: string; lineas: LineaPedidoEditable[]; zooms: { nombre: string; imagen: string }[]; moneda: string | null; imagenes: string[]; onOcultar: () => void;
}) {
  const bloques = texto.split(/\n{2,}(?=LECTURA |NUMEROS SUELTOS|--- ARCHIVO)/).map((b) => {
    const [titulo, ...resto] = b.split("\n");
    return { titulo: titulo.replace(/:$/, ""), cuerpo: resto.join("\n").trim() };
  }).filter((b) => b.titulo.trim());
  const una = lineas.length === 1 ? lineas[0] : null;
  return (
    <aside className="hidden w-[360px] shrink-0 flex-col border-l bg-muted/20 lg:flex">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="text-sm font-semibold">Lo que leyó la IA</span>
        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onOcultar}>Ocultar</Button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-xs">
        {imagenes[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagenes[0]} alt="Captura subida" className="max-h-44 w-full rounded border bg-background object-contain" />
        )}
        {una && (
          <div className="space-y-0.5 rounded-md border bg-card p-2">
            <div className="font-semibold">Lo que dedujo</div>
            <div>Cantidad: <strong>{una.cantidad}</strong>{una.cantidadInferida ? " (deducida del total)" : ""}</div>
            {una.precioListado != null && <div>Precio de cada unidad: <strong>{fmtMoneda(una.precioListado, moneda)}</strong></div>}
            {una.totalPedido != null && <div>Total del pedido: <strong>{fmtMoneda(una.totalPedido, moneda)}</strong></div>}
            {una.descuento > 0 && <div>Descuento: <strong>{fmtMoneda(una.descuento, moneda)}</strong></div>}
            {una.ivaIncluido > 0 && <div>IVA: los precios llevan <strong>{Math.round(una.ivaIncluido * 100)} %</strong> incluido y el total no</div>}
            {moneda && <div>Moneda: <strong>{moneda}</strong></div>}
          </div>
        )}
        {/* Cada zoom: la zona ampliada que se leyó, con el texto que salió de ella */}
        {zooms.length > 0 && (
          <div className="space-y-1.5">
            <div className="font-semibold">Zooms que hizo el OCR</div>
            {zooms.map((z) => {
              const ficha = z.nombre.split(" ")[0]; // Z1, Z2, Z3, M
              const bloque = bloques.find((b) => b.titulo.startsWith(`LECTURA ${ficha} `) || b.titulo.startsWith(`LECTURA ${ficha}:`));
              return (
                <details key={z.nombre} open className="rounded-md border bg-card">
                  <summary className="cursor-pointer px-2 py-1.5 font-medium">{z.nombre}</summary>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={z.imagen} alt={z.nombre} className="w-full border-t bg-white object-contain" />
                  {bloque?.cuerpo && <pre className="max-h-40 overflow-auto border-t px-2 py-1.5 font-mono text-[10px] leading-snug whitespace-pre-wrap text-muted-foreground">{bloque.cuerpo}</pre>}
                </details>
              );
            })}
          </div>
        )}
        <div className="space-y-1.5">
          {bloques.filter((b) => !zooms.some((z) => b.titulo.startsWith(`LECTURA ${z.nombre.split(" ")[0]} `) || b.titulo.startsWith(`LECTURA ${z.nombre.split(" ")[0]}:`))).map((b, i) => (
            <details key={i} open={/^NUMEROS SUELTOS/.test(b.titulo)} className="rounded-md border bg-card">
              <summary className="cursor-pointer px-2 py-1.5 font-medium">{b.titulo}</summary>
              {b.cuerpo && <pre className="max-h-56 overflow-auto border-t px-2 py-1.5 font-mono text-[10px] leading-snug whitespace-pre-wrap text-muted-foreground">{b.cuerpo}</pre>}
            </details>
          ))}
        </div>
      </div>
    </aside>
  );
}

/** Al inicio de cada línea de pedido: primero el TOTAL del pedido y la explicación de cómo sale el precio por unidad (IVA, descuento, precio de las unidades juntas…). */
function CabeceraPrecioLinea({ l, moneda, unica }: { l: LineaPedidoEditable; moneda?: string | null; unica: boolean }) {
  if (!unica && !(l.ivaIncluido > 0)) return null;
  return (
    <div className="space-y-1.5">
      {unica && l.totalPedido != null && (
        <div className="flex flex-wrap items-baseline gap-x-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5">
          <span className="text-xs font-medium text-muted-foreground">Total del pedido{l.ivaIncluido > 0 ? " (sin IVA)" : ""}:</span>
          <span className="text-base font-bold">{fmtMoneda(l.totalPedido, moneda)}</span>
        </div>
      )}
      <div className="grid grid-cols-1"><NotaTotalPedido l={l} moneda={moneda} unica={unica} /></div>
    </div>
  );
}

const PLATAFORMAS_BASE = ["AliExpress", "Amazon", "eBay", "Temu", "Wallapop", "ASWO", "Web del proveedor"];
const CLAVE_PLATAFORMAS_EXTRA = "kelatos_plataformas_pedido_extra";

/** Plataforma del pedido: se elige de la lista o se añade una nueva (las nuevas se recuerdan en este navegador). */
function SelectorPlataforma({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [extras, setExtras] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(CLAVE_PLATAFORMAS_EXTRA) || "[]") as string[]; } catch { return []; }
  });
  const [nueva, setNueva] = useState(false);
  const [texto, setTexto] = useState("");
  const opciones = Array.from(new Set([...PLATAFORMAS_BASE, ...extras, ...(value.trim() ? [value.trim()] : [])]));

  function anadir() {
    const n = texto.trim();
    if (!n) return;
    const lista = Array.from(new Set([...extras, n])).filter((x) => !PLATAFORMAS_BASE.includes(x));
    setExtras(lista);
    try { localStorage.setItem(CLAVE_PLATAFORMAS_EXTRA, JSON.stringify(lista)); } catch { /* sin almacenamiento */ }
    onChange(n);
    setTexto("");
    setNueva(false);
  }

  if (nueva) {
    return (
      <div className="flex items-center gap-1">
        <Input className="h-8 w-40" autoFocus placeholder="Nombre de la plataforma" value={texto} onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); anadir(); } }} />
        <Button type="button" size="sm" className="h-8" disabled={!texto.trim()} onClick={anadir}>Añadir</Button>
        <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => { setNueva(false); setTexto(""); }}>Cancelar</Button>
      </div>
    );
  }
  return (
    <Select value={value.trim() || "__ninguna__"} onValueChange={(v) => { if (v === "__nueva__") setNueva(true); else onChange(!v || v === "__ninguna__" ? "" : v); }}>
      <SelectTrigger className="h-8 w-48"><SelectValue>{(v: string) => (v === "__ninguna__" ? "Elegir plataforma…" : v)}</SelectValue></SelectTrigger>
      <SelectContent>
        <SelectItem value="__ninguna__">Sin plataforma</SelectItem>
        {opciones.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        <SelectItem value="__nueva__">+ Añadir una nueva…</SelectItem>
      </SelectContent>
    </Select>
  );
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

function lineaDesdeOcr(l0: LineaPedidoProveedorLeida, numeroPedidoGlobal: string | null): LineaPedidoEditable {
  // Una «diferencia» entre cantidad × precio y el total que equivale a un IVA (21 %, 10 %, 4 %) NO es un descuento: los precios de la web llevan IVA y el total no.
  let l = l0;
  if (!l.ivaIncluido && l.precioListado && l.descuento && l.totalPedido) {
    const bruto = l.precioListado * l.cantidad;
    const r = [1.21, 1.1, 1.04].find((x) => Math.abs(bruto / l.totalPedido! - x) / x <= 0.02);
    if (r) l = { ...l, ivaIncluido: Math.round((r - 1) * 100) / 100, descuento: null, precioUnitario: Math.round((l.totalPedido / l.cantidad) * 100) / 100 };
  }
  return {
    nombre: l.nombre,
    codigoProveedor: l.codigoProveedor || "",
    idPedidoProveedor: l.idPedidoProveedor || "",
    cantidad: l.cantidad,
    totalPedido: l.totalPedido ?? null,
    precioDelTotal: !!l.ajustadoAlTotal,
    precioListado: l.precioListado ?? null,
    ivaIncluido: l.ivaIncluido ?? 0,
    precioDeLinea: l.precioDeLinea ?? null,
    cantidadInferida: !!l.cantidadInferida,
    textoPedido: l.textoPedido,
    // Una línea que solo sirve para marcar un pedido como recibido empieza desmarcada hasta encontrar ese pedido.
    aplicar: !l.soloRecepcion,
    destino: l.destino,
    referencia: l.referenciaSugerida || "",
    nombrePiezaSugerida: l.nombrePiezaSugerida,
    nombreInternoProveedor: l.nombre,
    nombreComercial: l.nombre, // el servidor exige el nombre comercial para dar de alta una pieza nueva: se propone el nombre leído
    categoria: l.categoriaSugerida || categoriaPorNombre(l.nombre),
    // El precio que trae el documento es lo que COSTÓ la compra: va a coste interno (si hay PVP y precio pagado, el pagado).
    // El precio al cliente no sale del documento: solo se propone el de una pieza ya existente; si no, lo escribe quien registra.
    costeInterno: l.precioPagado ?? l.precioUnitario ?? 0, // con descuento: coste real por unidad (el total pagado ÷ cantidad)
    precioCliente: l.precioClienteSugerido ?? 0,
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
    costo: (l.precioListado && l.descuento ? l.precioListado : null) ?? l.precioPagado ?? l.precioUnitario ?? 0,
    descuento: l.precioListado && l.descuento ? l.descuento : 0,
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
type FaseAnalisis = "leyendo" | "ia" | "terminando";
const FRASES_ANALISIS: Record<FaseAnalisis, string[]> = {
  leyendo: ["Leyendo la imagen…", "Reconociendo el texto…"],
  ia: ["Analizando…", "Identificando artículos…", "Detectando precios…", "Reconociendo el proveedor…", "Ordenando las líneas…", "Casi listo…"],
  terminando: ["Comprobando el stock…"],
};
// Tramo de la barra que ocupa cada fase: [desde %, hasta %, segundos típicos de la fase].
const TRAMO_FASE: Record<FaseAnalisis, [number, number, number]> = { leyendo: [0, 25, 3], ia: [25, 92, 20], terminando: [92, 97, 2] };

/** Barra de progreso del análisis con IA: fina, pegada al borde inferior del encabezado, con porcentaje y una frase que va cambiando.
    La fase (leyendo / IA / terminando) la informa el servidor; dentro de cada fase el avance es una estimación que se frena
    antes del final del tramo hasta que llega la siguiente fase o el resultado. */
function BarraAnalisis({ fase, desde }: { fase: FaseAnalisis; desde: number }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const segundos = Math.max(0, (ahora - desde) / 1000);
  const [ini, fin, tipico] = TRAMO_FASE[fase];
  const porcentaje = Math.round(ini + (fin - ini) * (1 - Math.exp(-segundos / tipico)));
  const frases = FRASES_ANALISIS[fase];
  const frase = frases[Math.min(Math.floor(segundos / 4), frases.length - 1)];
  return (
    <>
      <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400" aria-live="polite">
        <MagicStar className="size-3.5 animate-pulse" /> IA · {frase} <span className="tabular-nums">{porcentaje}%</span>
      </span>
      <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-violet-500/15" role="progressbar" aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-violet-500 transition-[width] duration-300 ease-out" style={{ width: `${porcentaje}%` }} />
      </div>
    </>
  );
}

export function PedidoProveedorDialog({ open, onOpenChange, onRegistrado }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistrado: () => void;
}) {
  const [proveedorBase, setProveedorNombre] = useState("ASWO");
  /** Dónde se hizo el pedido (Wallapop, AliExpress, Amazon...): distinto del proveedor, que es quien vende. */
  const [plataforma, setPlataforma] = useState("");
  /** Texto que leyó el OCR (lecturas normal, ampliada y los zooms): se enseña a la derecha para ver en qué se basó la IA. */
  const [textoOcr, setTextoOcr] = useState("");
  /** Miniaturas de las zonas ampliadas (zooms) que leyó el OCR. */
  const [zooms, setZooms] = useState<{ nombre: string; imagen: string }[]>([]);
  const [verLecturas, setVerLecturas] = useState<boolean>(() => {
    try { return localStorage.getItem("kelatos_pedido_ia_ver_lecturas") !== "0"; } catch { return true; }
  });
  const alternarLecturas = (v: boolean) => { setVerLecturas(v); try { localStorage.setItem("kelatos_pedido_ia_ver_lecturas", v ? "1" : "0"); } catch { /* sin almacenamiento */ } };
  /** Si el pedido venía en otra moneda: cómo se convirtió a euros (se muestra arriba para revisarlo). */
  const [conversion, setConversion] = useState<{ moneda: string; convertido: boolean; tasa?: number; fecha?: string; importeOriginal?: number | null; motivo?: string } | null>(null);
  // Ya no hay campo «Proveedor»: el proveedor es la plataforma elegida (si no hay, el detectado o ASWO como siempre).
  const proveedorNombre = plataforma.trim() || proveedorBase;
  /** Símbolo de los importes del pedido (€ normalmente; $ si la captura está en dólares). El coste interno y el precio al cliente siguen siendo en euros. */
  const simMoneda = conversion ? simboloDe(conversion.moneda) : "€";
  /** Lo que se guarda va en euros: con el cambio del día del pedido (editable arriba). */
  const aEuros = (n: number) => (conversion?.convertido && conversion.tasa ? Math.round(n * conversion.tasa * 100) / 100 : n);
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
  const [faseAnalisis, setFaseAnalisis] = useState<{ fase: FaseAnalisis; desde: number }>({ fase: "leyendo", desde: 0 });
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
      setPlataforma("");
      setTextoOcr("");
      setZooms([]);
      setConversion(null);
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

  async function anadirArchivos(lista: FileList | File[] | null) {
    if (!lista || lista.length === 0) return;
    if (leyendoOcr || preparando) return;
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

  /** Para las líneas que NO son «ya llegó»: ¿ese pedido ya está registrado? Se busca en Compras (reparaciones y ventas) por:
      · nº de pedido igual + una pieza parecida + el MISMO PROVEEDOR (el de la línea, o el del cuadro de arriba si la línea no dice
        otro), para que dos proveedores con el mismo número no se confundan; y
      · sin número válido: mismo resguardo + mismo proveedor + pieza parecida.
      En tienda, además, pedidos de stock pendientes de la misma referencia y cantidad.
      Si aparece, la línea se desmarca (no se registra otra vez) y se avisa; el empleado puede volver a marcarla si es otro pedido. */
  async function buscarDuplicados(nuevas: LineaPedidoEditable[]) {
    const normal = (x: string) => x.toLowerCase().replace(/[\s-]/g, "");
    // Proveedor comparable: sin acentos ni signos; «aswo» y «aswoo» o «Amazon.es» y «amazon» se consideran el mismo.
    const prov = (x: string) => x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").replace(/(.)\1+/g, "$1");
    const mismoProveedor = (a: string, b: string) => {
      const x = prov(a), y = prov(b);
      return !x || !y || x === y || x.includes(y) || y.includes(x);
    };
    type FilaC = { origen: "reparacion" | "venta"; pedidoId: string; resguardo: string; clienteNombre: string; numeroPedido: string; descripcion: string; estado: string; costo: number | null; proveedorNombre?: string; proveedorOtro?: string };
    await Promise.all(
      nuevas.map(async (l, i) => {
        if (l.recibido || l.soloRecepcion) return;
        const proveedorLinea = (l.proveedorTexto || proveedorNombre || "").trim();
        const encontrados = new Map<string, CandidatoRecepcion>();
        const anadir = (c: FilaC) => {
          const clave = `${c.origen}-${c.pedidoId}`;
          const prv = c.proveedorOtro || c.proveedorNombre || "—";
          encontrados.set(clave, {
            clave, origen: c.origen, id: c.pedidoId, titulo: c.descripcion || "Pieza",
            detalle: `${c.origen === "venta" ? `Venta ${c.resguardo}` : `Resguardo ${c.resguardo}`} · ${c.clienteNombre || "—"} · ${prv} · pedido ${c.numeroPedido || "—"}`,
            estado: c.estado, costo: c.costo ?? null, numeroPedido: c.numeroPedido || "",
          });
        };
        try {
          const buscadas = palabrasDe(l.nombre);
          const parecida = (c: FilaC) => !c.descripcion || [...palabrasDe(c.descripcion)].some((w) => buscadas.has(w));
          // Un nº de pedido largo de tienda online (AliExpress, eBay, Amazon: 10+ caracteres) es único en el mundo: se detecta aunque el proveedor guardado sea otro (p. ej. ASWO por defecto).
          const numLargo = (l.numeroPedidoLinea || "").replace(/[\s-]/g, "").length >= 10;
          const valido = (c: FilaC) => String(c.estado).toLowerCase() !== "cancelado" && (numLargo || mismoProveedor(proveedorLinea, c.proveedorOtro || c.proveedorNombre || ""));
          const num = (l.numeroPedidoLinea || "").trim();
          if (num.length >= 5 && /\d/.test(num)) {
            const r = await fetch(`/api/compras?busqueda=${encodeURIComponent(num)}&porPagina=50`).then((x) => x.json()).catch(() => null);
            for (const c of (r?.ok ? r.compras : []) as FilaC[]) {
              if (normal(c.numeroPedido || "") === normal(num) && valido(c) && parecida(c)) anadir(c);
            }
          } else if (l.destino === "cliente" && l.resguardo) {
            // Sin número de pedido utilizable: mismo resguardo, mismo proveedor y una pieza parecida.
            const r = await fetch(`/api/compras?busqueda=${encodeURIComponent(l.resguardo)}&porPagina=50`).then((x) => x.json()).catch(() => null);
            for (const c of (r?.ok ? r.compras : []) as FilaC[]) {
              if (c.origen === "reparacion" && c.resguardo === l.resguardo && c.descripcion && valido(c) && parecida(c)) anadir(c);
            }
          }
          if (l.destino === "tienda" && l.referencia) {
            const r = await fetch(`/api/stock-piezas/pedidos/buscar?q=${encodeURIComponent(l.referencia)}`).then((x) => x.json()).catch(() => null);
            for (const sp of (r?.ok ? r.pedidos : []) as { id: number; referencia: string; proveedor: string | null; cantidad: number; estado: string }[]) {
              if (String(sp.estado).toLowerCase() !== "pendiente" || sp.referencia !== l.referencia || sp.cantidad !== l.cantidad || !mismoProveedor(proveedorLinea, sp.proveedor || "")) continue;
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
    setFaseAnalisis({ fase: "leyendo", desde: inicio });
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
          // Si el campo sigue con el valor por defecto (ASWO), el servidor intenta detectar el proveedor por el remitente del documento (p. ej. Dyson).
          nombreProveedor: archivos.length > 0 && proveedorNombre.trim().toUpperCase() !== "ASWO" ? proveedorNombre : "",
        }),
      });
      const envio = await res.json();
      if (!envio.ok || !envio.jobId) throw new Error(envio.error || "No se pudo iniciar el análisis");

      // 2) Se consulta el resultado cada segundo (máx. 7 minutos).
      let data: {
        estado: string; error?: string; numeroPedidoGlobal?: string | null; lineas?: LineaPedidoProveedorLeida[];
        proveedorIdSugerido?: string | null; proveedorNombreSugerido?: string | null; proveedorCreado?: boolean; avisos?: string[]; documentoEsFactura?: boolean; plataforma?: string | null; textoOcr?: string; zooms?: { nombre: string; imagen: string }[]; monedaPedido?: string | null; conversionMoneda?: { moneda: string; convertido: boolean; tasa?: number; fecha?: string; importeOriginal?: number | null; motivo?: string } | null;
      } | null = null;
      // Varias imágenes con texto se leen una a una (la IA atiende de una en una): margen de 7 minutos.
      while (Date.now() - inicio < 420_000) {
        await new Promise((r) => setTimeout(r, 1000));
        if (cancelarAnalisis.current) return;
        setSegundosAnalisis(Math.round((Date.now() - inicio) / 1000));
        const r = await fetch(`/api/compras/pedido-proveedor/ocr/${encodeURIComponent(envio.jobId)}`);
        const d = await r.json();
        if (!d.ok) throw new Error(d.error || "No se pudo consultar el análisis");
        if (d.estado === "error") throw new Error(d.error || "No se pudo leer el pedido");
        if (d.estado === "listo") { data = d; break; }
        if (d.fase) setFaseAnalisis((a) => (a.fase === d.fase ? a : { fase: d.fase, desde: Date.now() }));
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
      // El campo Proveedor pasa a mostrar el que se ha detectado de verdad (antes se quedaba con lo escrito, p. ej. ASWO, aunque fuera Wallapop).
      if (data.proveedorNombreSugerido) setProveedorNombre(data.proveedorNombreSugerido);
      setProveedorCreado(!!data.proveedorCreado);
      setPlataforma(data.plataforma ?? "");
      setTextoOcr(data.textoOcr || "");
      setZooms(data.zooms ?? []);
      if (data.conversionMoneda?.convertido && data.conversionMoneda.tasa) {
        const conv = data.conversionMoneda;
        setConversion(conv);
        // Los importes se quedan como en la captura (p. ej. $101,61); solo el coste interno (stock) se pasa a euros con el cambio del día.
        setLineas((prev) => prev.map((x) => ({ ...x, costeInterno: Math.round(x.costeInterno * (conv.tasa ?? 1) * 100) / 100 })));
      } else if (data.monedaPedido) {
        setConversion(data.conversionMoneda ?? { moneda: data.monedaPedido, convertido: false });
        toast.warning(`El importe está en ${data.monedaPedido} y no se pudo consultar el cambio a euros: pon el equivalente en euros que cobró el banco`);
      } else setConversion(null);
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

  /** Una línea con varias unidades puede repartirse entre cliente y tienda (p. ej. 2 uds.: una para la reparación de un cliente y otra para el
      stock de la tienda): separa 1 unidad en una línea nueva con el OTRO destino (se puede repetir) y deja la original con las restantes. */
  function dividirLinea(i: number) {
    setLineas((prev) => {
      const l = prev[i];
      if (!l || l.cantidad < 2 || l.accion !== "registrar") return prev;
      const otro: "tienda" | "cliente" = l.destino === "tienda" ? "cliente" : "tienda";
      const nueva: LineaPedidoEditable = {
        ...l, cantidad: 1, destino: otro, aplicar: true,
        // Los datos del destino anterior no valen para el nuevo: el empleado elige el cliente (o la pieza de stock) de esta unidad.
        origenCliente: "reparacion", resguardo: "", ventaId: "", ventaItems: [], itemIds: [], nuevaPieza: false, clienteElegido: "", equipoElegido: "",
        posiblesDuplicados: [], candidatosRecepcion: [], recibirIds: [],
      };
      const resto: LineaPedidoEditable = { ...l, cantidad: l.cantidad - 1, itemIds: l.itemIds.slice(0, l.cantidad - 1) };
      return [...prev.slice(0, i), resto, nueva, ...prev.slice(i + 1)];
    });
  }

  /** Lo que le falta a una línea para poder registrarse (vacío = lista). Es lo que habilita el botón «Registrar pedidos» y lo que se muestra al lado. */
  function faltantesLinea(l: LineaPedidoEditable): string[] {
    if (!l.aplicar) return []; // no bloquea el registro de las demás
    if (l.accion === "recibir" || l.accion === "vincular") return l.recibirIds.length > 0 ? [] : ["elegir el pedido que se marca como recibido"];
    if (l.destino === "tienda") {
      // Pieza nueva (sin referencia existente): el nombre interno de proveedor es obligatorio — es lo único con lo que la IA podrá
      // reconocerla la próxima vez. Con al menos 2 letras o cifras: un «+» suelto de una tabla mal leída no es un nombre.
      if (l.referencia.trim() !== "") return [];
      const faltan: string[] = [];
      if (l.nombreInternoProveedor.replace(/[^\p{L}\p{N}]/gu, "").length < 2) faltan.push("nombre del proveedor de la pieza (o elegir una pieza existente)");
      return faltan;
    }
    const f: string[] = [];
    if (l.origenCliente === "venta") {
      if (!l.ventaId) f.push("elegir la venta del cliente");
      else if (l.itemIds.length === 0 && !l.nuevaPieza) f.push("elegir la pieza de la venta");
      if (!proveedorIdSugerido) f.push("proveedor del pedido");
      if (l.nuevaPieza && (!(l.costo > 0) || !(l.precioNuevaPieza > 0))) f.push("coste y precio de la pieza nueva");
    } else if (!l.resguardo) f.push("elegir el cliente (resguardo)");
    // Piezas de una venta que ya se recibieron: solo se vincula el pedido (nº de pedido); el enlace y la fecha
    // estimada solo hacen falta para piezas aún sin recibir o nuevas.
    const soloVincular = l.origenCliente === "venta" && !l.nuevaPieza && l.itemIds.every((id) => l.ventaItems.find((it) => it.itemId === id)?.estadoPedido === "Pieza Recibida");
    if (!l.numeroPedido.trim()) f.push("nº de pedido");
    else if (numeroPedidoEsEnlace(l.numeroPedido)) f.push("nº de pedido (parece un enlace; escribe el número)");
    // Si ya llegó (factura/albarán o aviso de recibido) no hay enlace ni fecha estimada que exigir: se rellenan solos.
    if (!soloVincular && !l.recibido) {
      if (!l.enlace.trim()) f.push("enlace del pedido");
      if (!l.fechaEstimada) f.push("fecha estimada de llegada");
    }
    // El coste de las piezas de una venta ya está en la propia venta; el de una reparación se guarda con el pedido.
    if (l.origenCliente !== "venta" && !(l.costo > 0)) f.push("coste");
    return f;
  }
  function lineaListaParaRegistrar(l: LineaPedidoEditable): boolean {
    return faltantesLinea(l).length === 0;
  }

  const itemsVentaUsados = lineas.filter((l) => l.aplicar && l.accion === "registrar" && l.destino === "cliente" && l.origenCliente === "venta").flatMap((l) => l.itemIds);
  const hayItemRepetido = new Set(itemsVentaUsados).size !== itemsVentaUsados.length;
  const todoRecibido = lineas.length > 0 && lineas.every((l) => l.recibido);
  const hayAlgoAplicado = lineas.some((l) => l.aplicar);
  const todoListo = lineas.every(lineaListaParaRegistrar) && !hayItemRepetido && (!lineas.some((l) => l.aplicar && l.accion === "registrar" && !(l.destino === "cliente" && l.origenCliente === "venta")) || !!compradoPor.trim());

  /** Antes de registrar: ¿ya hay un pedido con ese mismo nº de pedido, pieza parecida y (en stock) misma cantidad? Si sí, no se registra otra vez. */
  async function pedidosYaRegistrados(): Promise<string[]> {
    const norm = (x: string) => x.toLowerCase().replace(/[\s-]/g, "");
    const encontrados: string[] = [];
    const vistos = new Set<string>();
    for (const l of lineas) {
      if (!l.aplicar || l.accion !== "registrar" || l.destino === "cliente" && l.origenCliente === "venta") continue;
      const num = (l.numeroPedido || "").trim();
      if (num.length < 5 || !/\d/.test(num) || vistos.has(norm(num) + "|" + l.nombre)) continue;
      vistos.add(norm(num) + "|" + l.nombre);
      const r = await fetch(`/api/compras?busqueda=${encodeURIComponent(num)}&porPagina=50`).then((x) => x.json()).catch(() => null);
      const buscadas = palabrasDe(l.nombre);
      for (const c of (r?.ok ? r.compras : []) as { origen: string; pedidoId: string; numeroPedido: string; descripcion: string; equipoModelo: string; estado: string }[]) {
        if (norm(c.numeroPedido || "") !== norm(num) || String(c.estado).toLowerCase() === "cancelado") continue;
        const nombreC = c.origen === "stock" ? c.equipoModelo : c.descripcion;
        const pc = palabrasDe(nombreC || "");
        const comunes = [...pc].filter((w) => buscadas.has(w)).length;
        const parecido = Math.max(pc.size, buscadas.size) > 0 && comunes / Math.max(pc.size, buscadas.size) >= 0.6;
        const cantC = Number(/(\d+)\s*ud/.exec(c.descripcion || "")?.[1] ?? NaN);
        const mismaCantidad = c.origen !== "stock" || !Number.isFinite(cantC) || cantC === l.cantidad;
        if (parecido && mismaCantidad) encontrados.push(`${l.nombre.slice(0, 50)}… ya está registrado como ${c.pedidoId} (pedido ${num})`);
      }
    }
    return encontrados;
  }

  async function registrar() {
    setRegistrando(true);
    const yaHay = await pedidosYaRegistrados();
    if (yaHay.length > 0) {
      toast.error(`No se registró: ${yaHay.join(" · ")}. Desmarca esa línea si es el mismo pedido.`, { duration: 12000 });
      setRegistrando(false);
      return;
    }
    let okStock = 0, okResguardo = 0, okRecibidos = 0, fallos = 0;
    const resumen: LineaRegistroPedidoProveedor[] = [];
    /** Pedidos creados en esta pasada (PED-n, VTA-<item>, STK-n): a cada uno se le anota la plataforma al final. */
    const refsCreados: string[] = [];
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
                nombre: l.nombreComercial.trim() || l.nombreInternoProveedor.trim(),
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
            body: JSON.stringify({
              cantidad: l.cantidad,
              fechaEstimadaLlegada: fechaEstimadaEfectiva(l) || null,
              proveedor: (l.proveedorTexto || proveedorNombre).trim() || undefined,
              enlace: enlaceEfectivo(l) || undefined,
              numeroPedido: l.numeroPedido.trim() && l.numeroPedido.trim() !== "No informado" ? l.numeroPedido.trim() : undefined,
              costo: (costoNeto(l) > 0 ? aEuros(costoNeto(l)) : l.costeInterno > 0 ? l.costeInterno : undefined),
              compradoPor: compradoPor.trim() || undefined,
            }),
          });
          const dataPedido = await resPedido.json();
          if (!dataPedido.ok) throw new Error(dataPedido.error || "No se pudo crear el pedido de stock");
          okStock++;
          if (dataPedido.pedido?.id != null) refsCreados.push(`STK-${dataPedido.pedido.id}`);
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
              numeroPedido: l.numeroPedido.trim(), fechaEstimada: fechaEstimadaEfectiva(l), costo: aEuros(costoNeto(l)),
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
          if (Array.isArray(data.pedidoIds)) refsCreados.push(...data.pedidoIds.map(String));
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
                body: JSON.stringify({ descripcion: l.nombre, costo: aEuros(l.costo), precio: l.precioNuevaPieza, proveedorId: proveedorIdSugerido || "", proveedorOtro: "", enlace: enlaceEfectivo(l) }),
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
            refsCreados.push(`VTA-${itemId}`);
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
      // El archivo original queda como justificante en Drive, enlazado a cada pedido creado (sobre todo para plataformas sin factura).
      if (archivos.length > 0 && refsCreados.length > 0) {
        fetch("/api/compras/justificantes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            archivos: archivos.map((a) => ({ base64: a.base64, mimeType: a.mimeType })),
            pedidos: refsCreados, proveedor: proveedorNombre, plataforma: plataforma.trim(), numeroPedido: numeroPedidoGlobal,
          }),
        }).then((r) => r.json()).then((d) => { if (!d.ok) toast.error(`Los pedidos se registraron, pero no se pudo guardar el justificante en Drive: ${d.error || "error"}`); })
          .catch(() => toast.error("Los pedidos se registraron, pero no se pudo guardar el justificante en Drive"));
      }
      if (plataforma.trim() && refsCreados.length > 0) {
        fetch("/api/compras/plataforma", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pedidos: refsCreados.map((ref) => ({ ref, plataforma: plataforma.trim() })) }),
        }).catch(() => toast.error("Los pedidos se registraron, pero no se pudo anotar la plataforma"));
      }
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

  // Pegar capturas con Ctrl+V (p. ej. tras Win+Shift+S) sin tener que guardarlas como archivo. Solo actúa si el portapapeles trae una imagen;
  // pegar texto en un campo sigue funcionando como siempre.
  const anadirRef = useRef(anadirArchivos);
  anadirRef.current = anadirArchivos;
  useEffect(() => {
    if (!open) return;
    const alPegar = (e: ClipboardEvent) => {
      const imagenes = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (imagenes.length === 0) return;
      e.preventDefault();
      const sello = Date.now().toString().slice(-6);
      const nombrados = imagenes.map((f, i) => new File([f], `Captura pegada ${sello}-${i + 1}.${f.type.split("/")[1] || "png"}`, { type: f.type }));
      void anadirRef.current(nombrados);
    };
    document.addEventListener("paste", alPegar);
    return () => document.removeEventListener("paste", alPegar);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`flex max-h-[90vh] w-full flex-col gap-0 p-0 sm:max-w-2xl ${textoOcr && verLecturas ? "lg:max-w-6xl" : "lg:max-w-3xl"}`}>
        <div className="relative flex items-center justify-between gap-3 border-b px-4 py-3 pr-12">
          <DialogTitle className="flex items-center gap-1.5"><DocumentUpload className="size-5" /> Subir pedido con IA</DialogTitle>
          {leyendoOcr && <BarraAnalisis fase={faseAnalisis.fase} desde={faseAnalisis.desde} />}
          {textoOcr && (
            <Button type="button" variant="outline" size="sm" className="ml-auto h-7 text-xs" onClick={() => alternarLecturas(!verLecturas)}>
              {verLecturas ? "Ocultar lo que leyó la IA" : "Ver lo que leyó la IA"}
            </Button>
          )}
        </div>

        <div className="flex min-h-0 flex-1">
        <ScrollArea className="min-h-0 min-w-0 flex-1">
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Plataforma (dónde se pidió)</Label>
              <SelectorPlataforma value={plataforma} onChange={setPlataforma} />
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
                {proveedorCreado ? "Proveedor creado automáticamente" : "Proveedor encontrado"}: <strong className="font-medium text-foreground">{proveedorNombre}</strong>
              </span>
            )}
            {esPlataformaSinFactura(plataforma) && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400" title="Esta plataforma no emite factura: el pedido se registra como Sin factura y la captura queda como justificante">
                <Warning2 className="size-3.5" /> {plataforma} · sin factura
              </span>
            )}
          </div>

          {conversion && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              {conversion.convertido && conversion.tasa ? (
                <>
                  <span>
                    Importes en <strong>{conversion.moneda}</strong> ({simMoneda}), tal como salen en la captura. Se registrará en euros con el cambio del <strong>{conversion.fecha}</strong>:
                  </span>
                  <span className="inline-flex items-center gap-1">
                    1 {conversion.moneda} =
                    <input
                      type="number" step="0.0001" min="0" value={conversion.tasa}
                      onChange={(e) => {
                        const t = Number(e.target.value);
                        if (!(t > 0)) return;
                        setConversion((c) => (c ? { ...c, tasa: t } : c));
                        setLineas((prev) => prev.map((x) => ({ ...x, costeInterno: Math.round(costoNeto(x) * t * 100) / 100 })));
                      }}
                      className="h-6 w-20 rounded border border-amber-500/40 bg-background px-1 text-center text-foreground"
                    />
                    €
                  </span>
                  {conversion.importeOriginal != null && <span>(= <strong>{(Math.round(conversion.importeOriginal * conversion.tasa * 100) / 100).toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</strong> en total). El cargo real del banco puede variar: ajusta el cambio si hace falta.</span>}
                </>
              ) : (
                <span>Importes en <strong>{conversion.moneda}</strong>: no se pudo consultar el cambio a euros. Escribe el equivalente en euros que cobró el banco.</span>
              )}
            </div>
          )}

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
                <Label className="text-xs text-muted-foreground">Comprado por * (obligatorio: quién hizo la compra)</Label>
                <Select value={compradoPor} onValueChange={(v) => setCompradoPor(v || "")}>
                  <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Elige quién compró" /></SelectTrigger>
                  <SelectContent>
                    {empleados.map((e) => <SelectItem key={e.empleadoId} value={e.nombre}>{e.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {(() => {
                const total = lineas.find((x) => x.totalPedido)?.totalPedido ?? null;
                if (!total) return null;
                const mon = conversion?.moneda ?? null;
                const unidades = lineas.reduce((n, x) => n + x.cantidad, 0);
                const sinIva = lineas.some((x) => x.ivaIncluido > 0);
                const aEur = conversion?.convertido && conversion.tasa ? Math.round(total * conversion.tasa * 100) / 100 : null;
                return (
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Total del pedido{sinIva ? " (sin IVA)" : ""}</div>
                      <div className="text-2xl leading-tight font-bold">{fmtMoneda(total, mon)}</div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {aEur != null && <div className="text-sm font-semibold text-foreground">≈ {fmtMoneda(aEur, "EUR")} al cambio</div>}
                      <div>{lineas.length} línea{lineas.length !== 1 ? "s" : ""} · {unidades} unidad{unidades !== 1 ? "es" : ""}</div>
                      {sinIva && <div>Los precios de cada artículo en la web llevan IVA; aquí van sin IVA</div>}
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const total = lineas.find((x) => x.totalPedido)?.totalPedido ?? null;
                if (!total || lineas.length < 2) return null;
                const suma = Math.round(lineas.filter((x) => x.aplicar).reduce((n, x) => n + x.cantidad * x.costo, 0) * 100) / 100;
                const cuadra = Math.abs(suma - total) <= Math.max(0.5, total * 0.03);
                const eur = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
                return (
                  <p className={`rounded-md border px-3 py-2 text-xs ${cuadra ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400" : "border-destructive/30 bg-destructive/5 font-medium text-destructive"}`}>
                    Total del pedido: {eur(total)} · suma de las líneas: {eur(suma)}
                    {cuadra ? (lineas.some((x) => x.ivaIncluido > 0) ? ` ✓ cuadra: los precios de la web llevan IVA (${Math.round((lineas.find((x) => x.ivaIncluido > 0)?.ivaIncluido ?? 0) * 100)} %) y el total no; aquí van sin IVA` : " ✓ cuadra") : suma > total
                      ? ` — el total es ${eur(suma - total)} menor (${Math.round(((suma - total) / suma) * 100)} %): parece un descuento.`
                      : ` — el total es ${eur(total - suma)} mayor: parece envío o impuestos.`}
                    {!cuadra && suma > 0 && (
                      <button type="button" className="ml-2 underline underline-offset-2" onClick={() => {
                        const f = total / suma;
                        setLineas((prev) => prev.map((x) => (x.aplicar ? { ...x, costo: Math.round(x.costo * f * 100) / 100, costeInterno: Math.round(x.costeInterno * f * 100) / 100 } : x)));
                      }}>
                        Repartirlo entre las líneas (ajusta el coste de cada una)
                      </button>
                    )}
                  </p>
                );
              })()}

              <div className="space-y-2.5">
                  {lineas.map((l, i) => (
                    <div key={i} className="space-y-2 rounded-md border bg-card p-2.5">
                      <div className="flex items-start gap-2">
                        <Checkbox checked={l.aplicar} onCheckedChange={(v) => actualizar(i, { aplicar: v === true })} className="mt-1" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">{l.nombre}</span>
                            <span className="text-xs text-muted-foreground">cant. {l.cantidad}{l.textoPedido ? ` · "${l.textoPedido}"` : ""}</span>
                            {l.cantidad >= 2 && l.accion === "registrar" && !l.soloRecepcion && (
                              <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs" title="Reparte las unidades: separa 1 en una línea nueva con el otro destino" onClick={() => dividirLinea(i)}>
                                Separar 1 ud. para {l.destino === "tienda" ? "un cliente" : "la tienda"}
                              </Button>
                            )}
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
                              <CabeceraPrecioLinea l={l} moneda={conversion?.moneda} unica={lineas.length === 1} />
                              <div className="flex flex-wrap items-end gap-2">
                                <div className="w-20 space-y-1">
                                  <Label className="text-xs text-muted-foreground">Cantidad</Label>
                                  <Input type="number" min={1} className="h-8" value={l.cantidad}
                                    onChange={(e) => {
                                      const cantidad = Math.max(1, Number(e.target.value) || 1);
                                      // Si el precio salió del total del pedido, al cambiar la cantidad se reparte de nuevo (Total ÷ cantidad).
                                      if (l.precioListado && l.totalPedido && l.precioDelTotal) {
                                        // El precio de cada unidad es fijo (el de la web): lo que cambia con la cantidad es el descuento.
                                        const desc = Math.max(0, Math.round((l.precioListado * cantidad - l.totalPedido) * 100) / 100);
                                        actualizar(i, { cantidad, costo: l.precioListado, descuento: desc, costeInterno: Math.round((l.totalPedido / cantidad) * 100) / 100 });
                                      } else if (l.precioDelTotal && l.totalPedido) {
                                        const unidad = Math.round((l.totalPedido / cantidad) * 100) / 100;
                                        actualizar(i, { cantidad, costo: unidad, costeInterno: unidad });
                                      } else actualizar(i, { cantidad, costeInterno: costoNeto({ costo: l.costo, cantidad, descuento: l.descuento }) });
                                    }} />
                                </div>
                                <div className="min-w-40 flex-1 space-y-1">
                                  <Label className="text-xs text-muted-foreground">Referencia de Stock (vacío = pieza nueva)</Label>
                                  <Input className="h-8" placeholder="Vacío = crear pieza nueva" value={l.referencia}
                                    onChange={(e) => actualizar(i, { referencia: e.target.value, nombrePiezaSugerida: null })} />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <div className="space-y-1 sm:col-span-2">
                                  <Label className="text-xs text-muted-foreground">Enlace (del pedido en {proveedorNombre || "el proveedor"})</Label>
                                  <Input className="h-8" placeholder="https://… (opcional)" value={l.enlace} onChange={(e) => actualizar(i, { enlace: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Nº de pedido</Label>
                                  <Input className="h-8" value={l.numeroPedido === "No informado" ? "" : l.numeroPedido} onChange={(e) => actualizar(i, { numeroPedido: e.target.value })} />
                                  {numeroPedidoEsEnlace(l.numeroPedido) && <p className="text-[11px] text-destructive">{MENSAJE_NUMERO_PEDIDO_ENLACE}</p>}
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Fecha estimada</Label>
                                  <Input type="date" className="h-8" value={l.fechaEstimada} onChange={(e) => actualizar(i, { fechaEstimada: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Precio de compra por unidad ({simMoneda})</Label>
                                  <DecimalInput className="h-8 w-full" value={l.costo} onChange={(n) => actualizar(i, { costo: n, costeInterno: costoNeto({ costo: n, cantidad: l.cantidad, descuento: l.descuento }), precioDelTotal: false })} />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Descuento del pedido ({simMoneda})</Label>
                                  <DecimalInput className="h-8 w-full" value={l.descuento} onChange={(n) => actualizar(i, { descuento: n, costeInterno: costoNeto({ costo: l.costo, cantidad: l.cantidad, descuento: n }) })} />
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
                                    <Input className="h-8" placeholder="Si lo dejas vacío se usa el nombre del proveedor" value={l.nombreComercial}
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
                              {l.origenCliente !== "venta" && <CabeceraPrecioLinea l={l} moneda={conversion?.moneda} unica={lineas.length === 1} />}
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
                                            <Label className="text-xs text-muted-foreground">Precio de compra ({simMoneda})</Label>
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
                                </>
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
                                        <Label className="text-xs text-muted-foreground">Precio de compra ({simMoneda})</Label>
                                        <DecimalInput className="h-8 w-full" value={l.costo} onChange={(n) => actualizar(i, { costo: n })} />
                                      </div>
                                    )}
                                    {l.origenCliente !== "venta" && (
                                      <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Descuento del pedido ({simMoneda})</Label>
                                        <DecimalInput className="h-8 w-full" value={l.descuento} onChange={(n) => actualizar(i, { descuento: n })} />
                                      </div>
                                    )}
                                  </div>
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
              <Box1 className="size-4" /> Añade de 1 a 4 archivos del pedido (pantallazos o PDF), pega una captura con Ctrl+V y/o escribe un texto, y pulsa «Analizar con IA».
            </p>
          )}
        </div>
        </ScrollArea>
        {textoOcr && verLecturas && (
          <PanelLecturas
            texto={textoOcr}
            lineas={lineas}
            zooms={zooms}
            moneda={conversion?.moneda ?? null}
            imagenes={archivos.filter((a) => !a.esPdf).map((a) => `data:${a.mimeType};base64,${a.base64}`)}
            onOcultar={() => alternarLecturas(false)}
          />
        )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t bg-muted/50 px-4 py-3 sm:flex-row sm:justify-end">
          {hayItemRepetido && <p className="text-xs text-destructive sm:mr-auto sm:self-center">Dos líneas tienen marcada la misma pieza de una venta: asigna cada pieza a una sola línea.</p>}
          {hayAlgoAplicado && !todoListo && !hayItemRepetido && (
            <div className="max-h-28 overflow-y-auto text-xs text-amber-800 sm:mr-auto sm:max-w-[60%] dark:text-amber-300">
              <p className="font-medium">Para poder registrar falta:</p>
              <ul className="list-disc pl-4">
                {lineas.map((l, i) => ({ l, i, f: faltantesLinea(l) })).filter((x) => x.f.length > 0).map((x) => (
                  <li key={x.i}>{x.l.nombre}: {x.f.join(", ")}</li>
                ))}
                {lineas.some((l) => l.aplicar && l.accion === "registrar" && !(l.destino === "cliente" && l.origenCliente === "venta")) && !compradoPor.trim() && <li>«Comprado por» (arriba)</li>}
              </ul>
            </div>
          )}
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
