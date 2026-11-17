"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ComponentType, type ReactNode, type SVGProps } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  AddCircle, ArrowLeft2, ArrowRight2, Box, Category2, CloseCircle, Copy, DocumentText, Folder2, Gallery, InfoCircle, Lock, Play,
  SearchNormal1, ShieldTick, Sms, TickCircle, Verify, Video, VolumeHigh, Warning2,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import {
  CATEGORIAS, buscar, copiar, elegirCarpeta, navegadorCompatible,
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

export default function ExtractorDiscosPage() {
  const compatible = useSyncExternalStore<boolean | null>(() => () => {}, navegadorCompatible, () => null);
  const [paso, setPaso] = useState(1);
  const [origen, setOrigen] = useState<ManejadorCarpeta | null>(null);
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
  const cancelar = useRef(false);
  const muestra = useRef<{ t: number; b: number } | null>(null);

  useEffect(() => {
    if (!copiando) return;
    const f = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [copiando]);

  const total = resultado ? resultado.ficheros.reduce((s, f) => s + f.tam, 0) : 0;
  const reiniciarBusqueda = () => { setResultado(null); setError(null); };

  async function elegirOrigen() {
    setError(null);
    try {
      const c = await elegirCarpeta("read");
      if (!c) return;
      setOrigen(c); reiniciarBusqueda(); setPaso(2);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo abrir la carpeta"); }
  }

  async function ejecutarBusqueda() {
    if (!origen) return;
    if (!todo && cats.size === 0) { setError("Marca al menos un tipo de archivo (o «Copiar absolutamente todo»)."); return; }
    setError(null); setResultado(null); setBuscando(true); cancelar.current = false; setProgBusqueda({ n: 0, bytes: 0, actual: "" });
    try {
      const r = await buscar(origen, cats, todo, setProgBusqueda, () => cancelar.current);
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
    if (!resultado || !destino || !origen) return;
    const res = resguardo.replace(/[^A-Za-z0-9_-]/g, "");
    if (!res) { setError("Escribe el número de resguardo (solo letras, números, - y _)."); return; }
    setError(null); setCopiando(true); setInforme(null); cancelar.current = false; muestra.current = null; setVelocidad(0);
    let bloqueo: { release: () => Promise<void> } | null = null;
    try { bloqueo = await (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen") ?? null; } catch { /* sin bloqueo de pantalla no pasa nada */ }
    try {
      const inf = await copiar({
        ficheros: resultado.ficheros, destino, resguardo: res, nota: nota.slice(0, 300), origenNombre: origen.name,
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
    setPaso(1); setOrigen(null); setResultado(null); setDestino(null); setResguardo(""); setNota(""); setProg(null); setInforme(null); setError(null);
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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 p-4 sm:p-6">
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
            <Aviso tipo="info" icono={InfoCircle}>El navegador no deja elegir la raíz de una unidad ni carpetas del sistema: entra en <b>Users</b> y elige la carpeta del usuario. El disco solo se <b>lee</b>; esta herramienta no puede escribir en él.</Aviso>
            <Button size="lg" className="h-11 gap-2 px-5" onClick={elegirOrigen}><Folder2 className="size-5" /> Elegir la carpeta del cliente</Button>
          </CardContent>
        </Card>
      )}

      {/* PASO 2 */}
      {paso === 2 && origen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Paso 2 · ¿Qué quiere el cliente?</CardTitle>
            <CardDescription>Carpeta elegida: <b>{origen.name}</b> <button type="button" className="ml-1 text-primary underline-offset-2 hover:underline" onClick={elegirOrigen} disabled={buscando}>cambiar</button></CardDescription>
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
                    <Button variant="outline" className="gap-1.5" onClick={() => { cancelar.current = true; }}><CloseCircle className="size-4" /> Cancelar búsqueda</Button>
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
      {paso === 3 && resultado && origen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Paso 3 · Copiar los archivos</CardTitle>
            {!copiando && !informe && <CardDescription>Se van a copiar <b>{num(resultado.ficheros.length)} archivos ({gb(total)})</b> de <b>{origen.name}</b>.</CardDescription>}
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
                  <Label htmlFor="res">Número de resguardo <span className="font-normal text-muted-foreground">(obligatorio)</span></Label>
                  <Input id="res" value={resguardo} onChange={(e) => setResguardo(e.target.value)} placeholder="Por ejemplo: 19640" autoComplete="off" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nota">Nota <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                  <Input id="nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: el cliente pidió solo las fotos" autoComplete="off" />
                </div>
                <div className="flex flex-wrap justify-between gap-2 pt-1">
                  <Button variant="outline" className="gap-1.5" onClick={() => setPaso(2)}><ArrowLeft2 className="size-4" /> Atrás</Button>
                  <Button size="lg" className="h-11 gap-2 px-5" disabled={!destino || !resguardo.trim()} onClick={empezar}><Play className="size-4" variant="Bold" /> Empezar la copia</Button>
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
                <Button variant="outline" className="gap-1.5" onClick={() => { cancelar.current = true; }}><CloseCircle className="size-4" /> Cancelar la copia</Button>
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
  );
}
