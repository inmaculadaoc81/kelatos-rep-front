"use client";

/* eslint-disable @next/next/no-img-element -- vistas previas de archivos locales (blob:), no se pueden optimizar con next/image */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentType, type ReactNode, type SVGProps } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  AddCircle, ArrowLeft2, ArrowRight2, Box, Category2, CloseCircle, Copy, DocumentText, Folder2, Gallery, InfoCircle, Lock, Play,
  SearchNormal1, ShieldTick, Sms, TickCircle, Verify, Video, VolumeHigh, Warning2,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import {
  CATEGORIAS, buscar, buscarEnArchivos, categoriaDe, copiar, tipoVista, elegirCarpeta, navegadorCompatible,
  type Fichero, type InformeCopia, type ManejadorCarpeta, type ProgresoBusqueda, type ProgresoCopia, type ResumenCategoria,
} from "@/lib/extractor-discos";

type Icono = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
const ICONO_CATEGORIA: Record<string, Icono> = { documentos: DocumentText, fotos: Gallery, videos: Video, musica: VolumeHigh, correo: Sms, otros: Box, todo: Category2 };

const gb = (b: number) => (b >= 1e9 ? `${(b / 1e9).toFixed(1).replace(".", ",")} GB` : b >= 1e6 ? `${Math.round(b / 1e6)} MB` : `${Math.round(b / 1e3)} KB`);
const num = (n: number) => n.toLocaleString("es-ES");
function dur(seg: number): string {
  const s = Math.max(0, Math.round(seg));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min ${s % 60} s` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

const PASOS = ["Origen", "Qué copiar", "Copiar", "Terminar"];

/** Aviso con el mismo estilo que usan el resto de pantallas (fondo suave del color + texto). */
function Aviso({ tipo, icono: I, children }: { tipo: "ok" | "mal" | "amb" | "info"; icono?: Icono; children: ReactNode }) {
  const c = {
    ok: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
    mal: "border-destructive/30 bg-destructive/10 text-destructive",
    amb: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
    info: "border-primary/20 bg-primary/5 text-foreground",
  }[tipo];
  return (
    <div className={cn("flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm", c)}>
      {I && <I className="mt-0.5 size-4 shrink-0" />}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="rounded-xl border bg-muted/30 px-3 py-2">
      <div className="text-xl font-semibold tabular-nums">{valor}</div>
      <div className="text-xs text-muted-foreground">{etiqueta}</div>
    </div>
  );
}

function Barra({ pct, indeterminada, verde }: { pct: number; indeterminada?: boolean; verde?: boolean }) {
  return (
    <Progress value={indeterminada ? null : Math.min(100, Math.max(0, pct))}
      className={cn("[&_[data-slot=progress-track]]:h-3", verde && "[&_[data-slot=progress-indicator]]:bg-emerald-600", indeterminada && "animate-pulse")} />
  );
}

function Opcion({ activa, deshabilitada, onClick, icono: I, titulo, detalle, className }: { activa: boolean; deshabilitada?: boolean; onClick: () => void; icono: Icono; titulo: string; detalle: string; className?: string }) {
  return (
    <button type="button" disabled={deshabilitada} onClick={onClick}
      className={cn("flex items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-60", activa ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50", className)}>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", activa ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}><I className="size-5" /></span>
      <span className="min-w-0"><span className="block text-sm font-medium leading-tight">{titulo}</span><span className="block text-xs text-muted-foreground">{detalle}</span></span>
    </button>
  );
}

/** Miniatura de un archivo (solo imágenes y vídeos); se carga cuando la fila se ve en pantalla y se libera al salir. */
function Miniatura({ fichero }: { fichero: Fichero }) {
  const nombre = fichero.ruta[fichero.ruta.length - 1];
  const tipo = tipoVista(nombre);
  const caja = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);
  const I = ICONO_CATEGORIA[categoriaDe(nombre)] ?? Box;
  const conMiniatura = (tipo === "imagen" && fichero.tam < 30e6) || tipo === "video";

  useEffect(() => {
    const el = caja.current;
    if (!el || !conMiniatura) return;
    const o = new IntersectionObserver((e) => { if (e[0]?.isIntersecting) { setVisible(true); o.disconnect(); } }, { rootMargin: "120px" });
    o.observe(el);
    return () => o.disconnect();
  }, [conMiniatura]);

  useEffect(() => {
    if (!visible) return;
    let vivo = true;
    let url: string | null = null;
    fichero.handle.getFile().then((f) => { if (!vivo) return; url = URL.createObjectURL(f); setSrc(url); }).catch(() => { if (vivo) setFallo(true); });
    return () => { vivo = false; if (url) URL.revokeObjectURL(url); };
  }, [visible, fichero]);

  return (
    <span ref={caja} className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground">
      {src && !fallo && tipo === "imagen" && <img src={src} alt="" className="size-full object-cover" onError={() => setFallo(true)} />}
      {src && !fallo && tipo === "video" && <video src={`${src}#t=0.5`} muted preload="metadata" className="size-full object-cover" onError={() => setFallo(true)} />}
      {(!src || fallo || !conMiniatura) && <I className="size-5" />}
    </span>
  );
}

/** Vista previa de un archivo (imagen, vídeo o audio) en una ventana. */
function VistaPrevia({ fichero, onCerrar }: { fichero: Fichero | null; onCerrar: () => void }) {
  const nombre = fichero ? fichero.ruta[fichero.ruta.length - 1] : "";
  const tipo = tipoVista(nombre);
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!fichero) return;
    let vivo = true;
    let url: string | null = null;
    fichero.handle.getFile().then((f) => { if (!vivo) return; url = URL.createObjectURL(f); setSrc(url); }).catch(() => {});
    return () => { vivo = false; setSrc(null); if (url) URL.revokeObjectURL(url); };
  }, [fichero]);
  return (
    <Dialog open={!!fichero} onOpenChange={(o) => { if (!o) onCerrar(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogTitle className="truncate pr-6 text-base">{nombre}</DialogTitle>
        <DialogDescription className="truncate">{fichero ? `${fichero.ruta.slice(0, -1).join(" / ") || "Raíz"} · ${gb(fichero.tam)}` : ""}</DialogDescription>
        <div className="flex max-h-[65vh] min-h-32 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {tipo === "imagen" && src && <img src={src} alt={nombre} className="max-h-[65vh] max-w-full object-contain" />}
          {tipo === "video" && src && <video src={src} controls autoPlay muted className="max-h-[65vh] max-w-full" />}
          {tipo === "audio" && src && <audio src={src} controls autoPlay className="w-full p-4" />}
          {tipo === "otro" && <p className="p-6 text-sm text-muted-foreground">Este tipo de archivo no tiene vista previa, pero se copiará igual.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const POR_TANDA = 100;

/** Lista de los archivos encontrados (derecha de la pantalla): buscador, filtro por tipo, miniaturas y vista previa al pulsar. */
function ListaArchivos({ ficheros }: { ficheros: Fichero[] }) {
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<string>("todos");
  const [mostrar, setMostrar] = useState(POR_TANDA);
  const [previo, setPrevio] = useState<Fichero | null>(null);
  const tipos = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of ficheros) { const c = categoriaDe(f.ruta[f.ruta.length - 1]); m.set(c, (m.get(c) ?? 0) + 1); }
    return [...m.entries()];
  }, [ficheros]);
  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return ficheros.filter((f) => (tipo === "todos" || categoriaDe(f.ruta[f.ruta.length - 1]) === tipo) && (!t || f.ruta.join("/").toLowerCase().includes(t)));
  }, [ficheros, q, tipo]);
  const chips: [string, string][] = [["todos", `Todos (${num(ficheros.length)})`], ...tipos.map(([c, n]): [string, string] => [c, `${CATEGORIAS.find((x) => x.id === c)?.nombre ?? c} (${num(n)})`])];
  return (
    <Card className="lg:sticky lg:top-4">
      <CardHeader>
        <CardTitle className="text-base">Archivos encontrados ({num(ficheros.length)})</CardTitle>
        <CardDescription>Pulsa uno para verlo antes de copiar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={q} onChange={(e) => { setQ(e.target.value); setMostrar(POR_TANDA); }} placeholder="Buscar por nombre o carpeta…" />
        <div className="flex flex-wrap gap-1.5">
          {chips.map(([c, t]) => (
            <button key={c} type="button" onClick={() => { setTipo(c); setMostrar(POR_TANDA); }}
              className={cn("rounded-full border px-2.5 py-0.5 text-xs", tipo === c ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted")}>{t}</button>
          ))}
        </div>
        <ul className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
          {filtrados.slice(0, mostrar).map((f) => {
            const nombre = f.ruta[f.ruta.length - 1];
            return (
              <li key={f.ruta.join("/")}>
                <button type="button" onClick={() => setPrevio(f)} className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-muted/60">
                  <Miniatura fichero={f} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{nombre}</span>
                    <span className="block truncate text-xs text-muted-foreground">{f.ruta.slice(0, -1).join(" / ") || "Raíz"} · {gb(f.tam)}</span>
                  </span>
                </button>
              </li>
            );
          })}
          {filtrados.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Ningún archivo coincide.</li>}
        </ul>
        {filtrados.length > mostrar && <Button variant="outline" size="sm" className="w-full" onClick={() => setMostrar(mostrar + POR_TANDA)}>Ver más ({num(filtrados.length - mostrar)} restantes)</Button>}
      </CardContent>
      <VistaPrevia fichero={previo} onCerrar={() => setPrevio(null)} />
    </Card>
  );
}

export default function ExtractorDiscosPage() {
  const compatible = useSyncExternalStore<boolean | null>(() => () => {}, navegadorCompatible, () => null);
  const [paso, setPaso] = useState(1);
  const [origen, setOrigen] = useState<ManejadorCarpeta | null>(null);
  const [local, setLocal] = useState<{ nombre: string; archivos: File[] } | null>(null); // disco entero elegido con el selector clásico
  const entradaDisco = useRef<HTMLInputElement>(null);
  const nombreOrigen = origen?.name ?? local?.nombre ?? "";
  const [cats, setCats] = useState<Set<string>>(new Set(["documentos", "fotos"]));
  const [todo, setTodo] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [progBusqueda, setProgBusqueda] = useState<ProgresoBusqueda>({ n: 0, bytes: 0, actual: "" });
  const [resultado, setResultado] = useState<{ ficheros: Fichero[]; resumen: Record<string, ResumenCategoria> } | null>(null);
  const [destino, setDestino] = useState<ManejadorCarpeta | null>(null);
  const [resguardo, setResguardo] = useState("");
  const [nota, setNota] = useState("");
  const [copiando, setCopiando] = useState(false);
  const [prog, setProg] = useState<ProgresoCopia | null>(null);
  const [velocidad, setVelocidad] = useState(0);
  const [informe, setInforme] = useState<InformeCopia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confirmar = useConfirm();
  const router = useRouter();
  const cancelar = useRef(false);
  const muestra = useRef<{ t: number; b: number } | null>(null);

  useEffect(() => {
    if (!copiando) return;
    const f = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", f); // cerrar la pestaña o recargar: el aviso lo pinta el navegador (no se puede personalizar)
    // Salir a otra pantalla del dashboard (menú lateral, enlaces): se pregunta con el modal del dashboard.
    const alClicar = async (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      e.preventDefault(); e.stopPropagation();
      if (await confirmar("Hay una copia en curso. Si sales ahora, la copia se cancelará.", { titulo: "Salir de la pantalla", detalle: "Lo copiado hasta ahora quedará incompleto en el destino." })) {
        cancelar.current = true;
        router.push(url.pathname + url.search);
      }
    };
    document.addEventListener("click", alClicar, true);
    return () => { window.removeEventListener("beforeunload", f); document.removeEventListener("click", alClicar, true); };
  }, [copiando, confirmar, router]);

  const total = resultado ? resultado.ficheros.reduce((s, f) => s + f.tam, 0) : 0;
  const reiniciarBusqueda = () => { setResultado(null); setError(null); };

  async function elegirOrigen() {
    setError(null);
    try {
      const c = await elegirCarpeta("read");
      if (!c) return;
      setOrigen(c); setLocal(null); reiniciarBusqueda(); setPaso(2);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo abrir la carpeta"); }
  }

  function discoElegido(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    const archivos = Array.from(lista);
    const nombre = (archivos[0].webkitRelativePath || "").split("/")[0] || "Disco";
    setError(null); setOrigen(null); setLocal({ nombre, archivos }); reiniciarBusqueda(); setPaso(2);
  }

  async function ejecutarBusqueda() {
    if (!origen && !local) return;
    if (!todo && cats.size === 0) { setError("Marca al menos un tipo de archivo (o «Copiar absolutamente todo»)."); return; }
    setError(null); setResultado(null); setBuscando(true); cancelar.current = false; setProgBusqueda({ n: 0, bytes: 0, actual: "" });
    try {
      const r = origen ? await buscar(origen, cats, todo, setProgBusqueda, () => cancelar.current) : buscarEnArchivos(local!.archivos, cats, todo);
      if (!r.cancelado) setResultado({ ficheros: r.ficheros, resumen: r.resumen });
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo leer la carpeta"); }
    setBuscando(false);
  }

  async function elegirDestino() {
    setError(null);
    try {
      const d = await elegirCarpeta("readwrite");
      if (!d) return;
      if (origen) {
        if (await d.isSameEntry(origen)) { setError("El destino no puede ser la misma carpeta del cliente."); return; }
        if ((await origen.resolve(d)) || (await d.resolve(origen))) { setError("El destino no puede estar dentro de la carpeta del cliente (ni al revés). Elige otro sitio, por ejemplo un disco externo."); return; }
      }
      setDestino(d);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo abrir el destino"); }
  }

  async function empezar() {
    if (!resultado || !destino || (!origen && !local)) return;
    const res = resguardo.replace(/[^A-Za-z0-9_-]/g, "");
    const ok = await confirmar(`¿Empezar la copia de ${num(resultado.ficheros.length)} archivos (${gb(total)}) en «${destino.name}»?`, {
      titulo: "Empezar la copia",
      detalle: `${res ? `Resguardo ${res}. ` : "Sin número de resguardo. "}No cierres la pestaña ni desconectes el disco mientras copia.`,
    });
    if (!ok) return;
    setError(null); setCopiando(true); setInforme(null); cancelar.current = false; muestra.current = null; setVelocidad(0);
    let bloqueo: { release: () => Promise<void> } | null = null;
    try { bloqueo = await (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen") ?? null; } catch { /* sin bloqueo de pantalla no pasa nada */ }
    try {
      const inf = await copiar({
        ficheros: resultado.ficheros, destino, resguardo: res, nota: nota.slice(0, 300), origenNombre: nombreOrigen,
        cancelado: () => cancelar.current,
        alAvanzar: (p) => {
          setProg(p);
          if (p.fase === "copiando") {
            const t = Date.now();
            const m = muestra.current;
            if (m && t - m.t >= 1000) { const v = ((p.bytes - m.b) / (t - m.t)) * 1000; setVelocidad((a) => (a ? a * 0.6 + v * 0.4 : v)); muestra.current = { t, b: p.bytes }; }
            else if (!m) muestra.current = { t, b: p.bytes };
          }
        },
      });
      setInforme(inf);
    } catch (e) {
      setError(e instanceof Error ? e.message : "La copia se ha interrumpido");
      toast.error("La copia se ha interrumpido");
    }
    await bloqueo?.release().catch(() => {});
    setCopiando(false);
  }

  function otraExtraccion() {
    setPaso(1); setOrigen(null); setLocal(null); setResultado(null); setDestino(null); setResguardo(""); setNota(""); setProg(null); setInforme(null); setError(null);
  }

  const pctCopia = !prog ? 0 : prog.fase === "terminado" ? 100 : prog.fase === "verificando" ? (prog.verifTotal ? (100 * prog.verifHecho) / prog.verifTotal : 100) : prog.bytesTotal ? (100 * prog.bytes) / prog.bytesTotal : (100 * prog.hecho) / Math.max(1, prog.total);
  const restante = prog && prog.fase === "copiando" && velocidad > 1 ? dur((prog.bytesTotal - prog.bytes) / velocidad) : prog?.fase === "verificando" ? "casi listo" : "—";
  const puedeVolver = (n: number) => n < paso && !copiando;
  const hayAvisos = !!informe && informe.errores.length + informe.fallosVerificacion.length > 0;

  if (compatible === false) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
        <h1 className="text-2xl font-semibold">Extractor de discos de clientes</h1>
        <Aviso tipo="amb" icono={Warning2}>Esta herramienta necesita <b>Google Chrome o Microsoft Edge</b>: el navegador que estás usando no permite elegir carpetas del equipo. Ábrela desde uno de ellos.</Aviso>
      </div>
    );
  }

  const verLista = !!resultado && resultado.ficheros.length > 0 && (paso === 2 || paso === 3);
  return (
    <div className={cn("mx-auto w-full p-4 sm:p-6", verLista ? "max-w-6xl" : "max-w-3xl")}>
    <div className="flex flex-col items-start gap-5 lg:flex-row">
    <div className="w-full min-w-0 flex-1 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">Extractor de discos de clientes</h1>
          <p className="text-sm text-muted-foreground">Copia los datos del cliente antes de formatear, con comprobación archivo por archivo.</p>
        </div>
        <Badge variant="outline" className="h-auto gap-1.5 border-emerald-500/40 bg-emerald-500/10 py-1 text-emerald-700 dark:text-emerald-300"><Lock className="size-3.5" /> Solo lectura · no se sube nada al servidor</Badge>
      </div>

      {/* Barra de pasos */}
      <ol className="flex items-start">
        {PASOS.map((nombre, i) => {
          const n = i + 1;
          const hecho = n < paso, actual = n === paso;
          return (
            <li key={nombre} className="relative flex-1 text-center">
              {i < PASOS.length - 1 && <span className={cn("absolute left-1/2 top-4 h-0.5 w-full", hecho ? "bg-primary" : "bg-border")} />}
              <button type="button" disabled={!puedeVolver(n)} onClick={() => setPaso(n)} aria-label={`Paso ${n}: ${nombre}`}
                className={cn("relative z-10 mx-auto flex size-9 items-center justify-center rounded-full border-2 text-sm font-semibold",
                  hecho ? "border-primary bg-primary text-primary-foreground" : actual ? "border-primary bg-background text-primary ring-4 ring-primary/15" : "border-border bg-background text-muted-foreground")}>
                {hecho ? <TickCircle className="size-5" variant="Bold" /> : n}
              </button>
              <div className={cn("mt-1.5 text-xs", actual ? "font-semibold" : "text-muted-foreground")}>{nombre}</div>
            </li>
          );
        })}
      </ol>

      {error && <Aviso tipo="mal" icono={Warning2}>{error}</Aviso>}

      {/* PASO 1 */}
      {paso === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Paso 1 · Elige la carpeta del cliente</CardTitle>
            <CardDescription>Conecta el disco del cliente al equipo. Cuando aparezca como unidad (D:, E:…), pulsa el botón y elige <b>la carpeta de la persona</b>, por ejemplo <code className="rounded bg-muted px-1">D:\Users\Ana</code>.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2 rounded-xl border p-4">
                <div className="text-sm font-semibold">Una carpeta (recomendado)</div>
                <p className="flex-1 text-xs text-muted-foreground">Elige la carpeta de la persona, por ejemplo <code className="rounded bg-muted px-1">D:\Users\Ana</code>. Es lo más rápido y el navegador garantiza que solo se lee.</p>
                <Button className="h-11 gap-2" onClick={elegirOrigen}><Folder2 className="size-5" /> Elegir una carpeta</Button>
              </div>
              <div className="flex flex-col gap-2 rounded-xl border p-4">
                <div className="text-sm font-semibold">El disco entero</div>
                <p className="flex-1 text-xs text-muted-foreground">Para elegir la unidad completa (<code className="rounded bg-muted px-1">D:\</code>) o carpetas que Chrome bloquea. Tarda más en leer el disco.</p>
                <Button variant="outline" className="h-11 gap-2" onClick={() => entradaDisco.current?.click()}><Box className="size-5" /> Elegir el disco entero</Button>
                <input ref={entradaDisco} type="file" className="hidden" multiple onChange={(e) => { discoElegido(e.target.files); e.target.value = ""; }}
                  {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} />
              </div>
            </div>
            <Aviso tipo="info" icono={InfoCircle}>Si Chrome dice «no se puede abrir esta carpeta porque contiene archivos del sistema», es normal: usa «Una carpeta» y entra en <b>Users</b>, o prueba «El disco entero». Al elegir el disco entero Chrome preguntará si quieres «subir» los archivos: <b>no se sube nada</b>, solo se leen en este equipo.</Aviso>
            <div className="rounded-xl border border-dashed p-3 text-sm">
              <div className="font-medium">¿Y si un día el dashboard no abre?</div>
              <p className="mt-0.5 text-xs text-muted-foreground">Instala la misma herramienta en el PC: funciona sin internet y sin entrar al dashboard. Hazlo ahora, mientras el dashboard funciona.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a href="/extractor-discos/Instalar-Extractor-Kelatos.exe" download><Button variant="outline" size="sm">Instalador para Windows (.exe)</Button></a>
                <a href="/extractor-discos/Extractor-Kelatos-ubuntu.tar.gz" download><Button variant="outline" size="sm">Para Ubuntu (.tar.gz)</Button></a>
                <a href="/extractor-discos/Extractor-Kelatos-instalador.zip" download><Button variant="outline" size="sm">Windows en carpeta (.zip)</Button></a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PASO 2 */}
      {paso === 2 && (origen || local) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Paso 2 · ¿Qué quiere el cliente?</CardTitle>
            <CardDescription>Origen elegido: <b>{nombreOrigen}</b> <button type="button" className="ml-1 text-primary underline-offset-2 hover:underline" onClick={() => setPaso(1)} disabled={buscando}>cambiar</button></CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1.5 text-sm font-medium">Tipos de archivo</div>
              <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2", todo && "opacity-40")}>
                {CATEGORIAS.map((c) => {
                  const sel = cats.has(c.id);
                  return (
                    <Opcion key={c.id} activa={sel} deshabilitada={buscando} icono={ICONO_CATEGORIA[c.id] ?? Box} titulo={c.nombre} detalle={c.detalle}
                      onClick={() => { const n = new Set(cats); if (sel) n.delete(c.id); else n.add(c.id); setCats(n); reiniciarBusqueda(); }} />
                  );
                })}
              </div>
              <Opcion className="mt-2 w-full" activa={todo} deshabilitada={buscando} icono={Category2} titulo="Copiar absolutamente todo" detalle="Ignora los tipos de arriba (tarda más y ocupa más)"
                onClick={() => { setTodo(!todo); reiniciarBusqueda(); }} />
            </div>

            {!buscando && !resultado && <Button size="lg" className="h-11 gap-2 px-5" onClick={ejecutarBusqueda}><SearchNormal1 className="size-5" /> Buscar archivos</Button>}

            {(buscando || resultado) && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {buscando ? "Buscando archivos…" : resultado && resultado.ficheros.length === 0 ? "No se ha encontrado nada con esos filtros" : <><TickCircle className="size-4 text-emerald-600" variant="Bold" /> Búsqueda terminada</>}
                </div>
                <Barra pct={100} indeterminada={buscando} />
                <div className="grid grid-cols-2 gap-2">
                  <Dato valor={num(buscando ? progBusqueda.n : resultado?.ficheros.length ?? 0)} etiqueta="archivos encontrados" />
                  <Dato valor={gb(buscando ? progBusqueda.bytes : total)} etiqueta="ocupan en total" />
                </div>
                {buscando && (
                  <>
                    <div className="truncate text-xs text-muted-foreground">Mirando: {progBusqueda.actual}</div>
                    <Button variant="outline" className="gap-1.5" onClick={async () => { if (await confirmar("¿Cancelar la búsqueda de archivos?", { titulo: "Cancelar la búsqueda" })) cancelar.current = true; }}><CloseCircle className="size-4" /> Cancelar búsqueda</Button>
                  </>
                )}
                {resultado && resultado.ficheros.length > 0 && (
                  <div className="overflow-hidden rounded-xl border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-3 py-2 text-left font-medium">Tipo</th><th className="px-3 py-2 text-right font-medium">Archivos</th><th className="px-3 py-2 text-right font-medium">Tamaño</th></tr></thead>
                      <tbody>
                        {Object.entries(resultado.resumen).map(([k, v]) => {
                          const c = CATEGORIAS.find((x) => x.id === k);
                          const I = ICONO_CATEGORIA[k] ?? Box;
                          return <tr key={k} className="border-t"><td className="px-3 py-2"><span className="inline-flex items-center gap-2"><I className="size-4 text-muted-foreground" />{c?.nombre ?? "Todo"}</span></td><td className="px-3 py-2 text-right tabular-nums">{num(v.n)}</td><td className="px-3 py-2 text-right tabular-nums">{gb(v.bytes)}</td></tr>;
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {resultado && resultado.ficheros.length === 0 && <Aviso tipo="amb" icono={InfoCircle}>Prueba a marcar más tipos de archivo, a elegir otra carpeta o a copiar absolutamente todo.</Aviso>}
              </div>
            )}

            <div className="flex flex-wrap justify-between gap-2 pt-1">
              <Button variant="outline" className="gap-1.5" onClick={() => setPaso(1)} disabled={buscando}><ArrowLeft2 className="size-4" /> Atrás</Button>
              {resultado && resultado.ficheros.length > 0 && <Button size="lg" className="h-11 gap-1.5 px-5" onClick={() => setPaso(3)}>Continuar <ArrowRight2 className="size-4" /></Button>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PASO 3 */}
      {paso === 3 && resultado && (origen || local) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Paso 3 · Copiar los archivos</CardTitle>
            {!copiando && !informe && <CardDescription>Se van a copiar <b>{num(resultado.ficheros.length)} archivos ({gb(total)})</b> de <b>{nombreOrigen}</b>.</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            {!copiando && !informe && (
              <>
                <div className="space-y-1.5">
                  <Label>¿Dónde guardar la copia?</Label>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant={destino ? "outline" : "default"} className="gap-2" onClick={elegirDestino}><Folder2 className="size-4" /> {destino ? "Cambiar destino" : "Elegir carpeta de destino"}</Button>
                    {destino && <span className="text-sm">Destino: <b>{destino.name}</b></span>}
                  </div>
                  <p className="text-xs text-muted-foreground">Un disco externo, una carpeta de red o el Ubuntu. Debe tener espacio de sobra (hacen falta {gb(total)}).</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="res">Número de resguardo <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                  <Input id="res" value={resguardo} onChange={(e) => setResguardo(e.target.value)} placeholder="Por ejemplo: 19640" autoComplete="off" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nota">Nota <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                  <Input id="nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: el cliente pidió solo las fotos" autoComplete="off" />
                </div>
                <div className="flex flex-wrap justify-between gap-2 pt-1">
                  <Button variant="outline" className="gap-1.5" onClick={() => setPaso(2)}><ArrowLeft2 className="size-4" /> Atrás</Button>
                  <Button size="lg" className="h-11 gap-2 px-5" disabled={!destino} onClick={empezar}><Play className="size-4" variant="Bold" /> Empezar la copia</Button>
                </div>
              </>
            )}

            {copiando && prog && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {[["copiando", "1 · Copiando"], ["verificando", "2 · Comprobando que es idéntica"], ["terminado", "3 · Listo"]].map(([k, t], i) => {
                    const e = ["copiando", "verificando", "terminado"].indexOf(prog.fase);
                    return <Badge key={k} variant={i === e ? "default" : "outline"} className={cn("h-auto py-1", i < e && "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", i > e && "text-muted-foreground")}>{t}</Badge>;
                  })}
                </div>
                <div className="text-5xl font-bold tabular-nums">{Math.round(pctCopia)}%</div>
                <Barra pct={pctCopia} verde={prog.fase === "verificando"} />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Dato valor={prog.fase === "verificando" ? num(prog.verifHecho) : gb(prog.bytes)} etiqueta={prog.fase === "verificando" ? `comprobados de ${num(prog.verifTotal)}` : `copiados de ${gb(prog.bytesTotal)}`} />
                  <Dato valor={num(prog.hecho)} etiqueta={`archivos de ${num(prog.total)}`} />
                  <Dato valor={prog.fase === "copiando" && velocidad > 1 ? `${Math.round(velocidad / 1e6)} MB/s` : "—"} etiqueta="velocidad" />
                  <Dato valor={restante} etiqueta="tiempo restante" />
                </div>
                <div className="truncate text-xs text-muted-foreground">{prog.fase === "verificando" ? "Comprobando: " : "Copiando: "}{prog.actual}</div>
                {prog.errores > 0 && <Aviso tipo="amb" icono={Warning2}>{prog.errores} archivo(s) no se han podido leer (disco dañado o bloqueado). La copia sigue; quedarán anotados en el informe.</Aviso>}
                <Aviso tipo="info" icono={InfoCircle}>No cierres esta pestaña ni desconectes el disco mientras copia.</Aviso>
                <Button variant="outline" className="gap-1.5" onClick={async () => { if (await confirmar("¿Cancelar la copia?", { titulo: "Cancelar la copia", detalle: "Lo copiado hasta ahora quedará incompleto en el destino. El disco del cliente no se modifica." })) cancelar.current = true; }}><CloseCircle className="size-4" /> Cancelar la copia</Button>
              </div>
            )}

            {informe && (
              <div className="space-y-3">
                <div className="flex flex-col items-center gap-1 text-center">
                  <span className={cn("flex size-14 items-center justify-center rounded-full", informe.cancelado || hayAvisos ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300")}>
                    {informe.cancelado || hayAvisos ? <Warning2 className="size-8" /> : <ShieldTick className="size-8" />}
                  </span>
                  <h3 className="text-lg font-semibold">{informe.cancelado ? "Copia cancelada" : hayAvisos ? "Copia terminada, con avisos" : "Copia terminada y verificada"}</h3>
                  <p className="text-sm text-muted-foreground"><b>{num(informe.verificados)}</b> archivos copiados ({gb(informe.bytes)}) y comprobados uno a uno, en {dur(informe.segundos)}.</p>
                </div>
                <div className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2">
                  <span className="min-w-0 flex-1 break-all font-mono text-xs">{informe.carpeta}</span>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { void navigator.clipboard?.writeText(informe.carpeta); toast.success("Ruta copiada"); }}><Copy className="size-3.5" /> Copiar</Button>
                </div>
                {hayAvisos && <Aviso tipo="amb" icono={Warning2}>{informe.errores.length > 0 && `${informe.errores.length} archivo(s) ilegibles no copiados. `}{informe.fallosVerificacion.length > 0 && `${informe.fallosVerificacion.length} con fallo de verificación (repetir la copia). `}Están listados en el informe.</Aviso>}
                <details className="rounded-xl border px-3 py-2"><summary className="cursor-pointer text-sm font-medium">Ver el informe completo</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs">{informe.informe}</pre></details>
                <div className="flex justify-end"><Button size="lg" className="h-11 gap-1.5 px-5" onClick={() => setPaso(4)}>Siguiente: terminar <ArrowRight2 className="size-4" /></Button></div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* PASO 4 */}
      {paso === 4 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"><Verify className="size-8" /></span>
            <h2 className="text-lg font-semibold">Todo listo</h2>
            <p className="max-w-md text-sm text-muted-foreground">La copia está guardada y verificada. Antes de desconectar el disco del cliente, <b>expúlsalo con seguridad</b> desde Windows (icono «Quitar hardware de forma segura») o con «Expulsar» en el Ubuntu.</p>
            {informe && <div className="w-full break-all rounded-xl border bg-muted/30 px-3 py-2 font-mono text-xs">{informe.carpeta}</div>}
            <Button size="lg" className="h-11 gap-2 px-5" onClick={otraExtraccion}><AddCircle className="size-5" /> Empezar otra extracción</Button>
          </CardContent>
        </Card>
      )}
    </div>
    {verLista && resultado && <aside className="w-full lg:w-[380px] lg:shrink-0"><ListaArchivos ficheros={resultado.ficheros} /></aside>}
    </div>
    </div>
  );
}
