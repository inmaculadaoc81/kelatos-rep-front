"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CATEGORIAS, buscar, copiar, elegirCarpeta, navegadorCompatible,
  type Fichero, type InformeCopia, type ManejadorCarpeta, type ProgresoBusqueda, type ProgresoCopia, type ResumenCategoria,
} from "@/lib/extractor-discos";

const gb = (b: number) => (b >= 1e9 ? `${(b / 1e9).toFixed(1).replace(".", ",")} GB` : b >= 1e6 ? `${Math.round(b / 1e6)} MB` : `${Math.round(b / 1e3)} KB`);
const num = (n: number) => n.toLocaleString("es-ES");
function dur(seg: number): string {
  const s = Math.max(0, Math.round(seg));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min ${s % 60} s` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

const PASOS = ["Origen", "Qué copiar", "Copiar", "Terminar"];

function Barra({ pct, indeterminada, azul }: { pct: number; indeterminada?: boolean; azul?: boolean }) {
  return (
    <div className="relative h-5 overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", azul ? "bg-blue-600" : "bg-emerald-600", indeterminada && "w-2/5 animate-pulse")}
        style={indeterminada ? undefined : { width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

function Aviso({ tipo, children }: { tipo: "ok" | "mal" | "amb" | "info"; children: React.ReactNode }) {
  const c = { ok: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300", mal: "bg-destructive/10 text-destructive", amb: "bg-amber-500/10 text-amber-800 dark:text-amber-300", info: "bg-blue-500/10 text-blue-800 dark:text-blue-300" }[tipo];
  return <div className={cn("rounded-lg px-3 py-2.5 text-sm", c)}>{children}</div>;
}

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return <div className="rounded-lg bg-muted/50 px-3 py-2"><div className="text-xl font-semibold tabular-nums">{valor}</div><div className="text-xs text-muted-foreground">{etiqueta}</div></div>;
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
  const puedeContinuar = (n: number) => n < paso && !copiando;

  if (compatible === false) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-semibold">💾 Extractor de discos de clientes</h1>
        <div className="mt-4"><Aviso tipo="amb">Esta herramienta necesita <b>Google Chrome o Microsoft Edge</b> (el navegador que estás usando no permite elegir carpetas del equipo). Ábrela desde uno de ellos.</Aviso></div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-2xl font-semibold">💾 Extractor de discos de clientes</h1>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">🔒 Solo lectura · no se sube nada al servidor</span>
      </div>

      {/* Barra de pasos */}
      <ol className="flex items-start">
        {PASOS.map((nombre, i) => {
          const n = i + 1;
          const hecho = n < paso, actual = n === paso;
          return (
            <li key={nombre} className="relative flex-1 text-center">
              {i < PASOS.length - 1 && <span className={cn("absolute left-1/2 top-4 h-0.5 w-full", hecho ? "bg-emerald-600" : "bg-border")} />}
              <button type="button" disabled={!puedeContinuar(n)} onClick={() => setPaso(n)}
                className={cn("relative z-10 mx-auto flex size-9 items-center justify-center rounded-full border-2 text-sm font-bold",
                  hecho ? "border-emerald-600 bg-emerald-600 text-white" : actual ? "border-primary bg-background text-primary ring-4 ring-primary/15" : "border-border bg-background text-muted-foreground")}>
                {hecho ? "✓" : n}
              </button>
              <div className={cn("mt-1.5 text-xs", actual ? "font-semibold" : "text-muted-foreground")}>{nombre}</div>
            </li>
          );
        })}
      </ol>

      {error && <Aviso tipo="mal">{error}</Aviso>}

      {/* PASO 1 */}
      {paso === 1 && (
        <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold">Paso 1 · Elige la carpeta del cliente</h2>
            <p className="mt-1 text-sm text-muted-foreground">Conecta el disco del cliente al equipo. Cuando aparezca como unidad (D:, E:…), pulsa el botón y elige <b>la carpeta de la persona</b>, por ejemplo <code className="rounded bg-muted px-1">D:\Users\Ana</code>.</p>
          </div>
          <Aviso tipo="info">El navegador no deja elegir la raíz de una unidad ni carpetas del sistema. Entra en <b>Users</b> y elige la carpeta del usuario. El disco solo se <b>lee</b>: esta herramienta no puede escribir en él.</Aviso>
          <Button size="lg" className="h-12 gap-2 px-6 text-base" onClick={elegirOrigen}>📂 Elegir la carpeta del cliente</Button>
        </section>
      )}

      {/* PASO 2 */}
      {paso === 2 && origen && (
        <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold">Paso 2 · ¿Qué quiere el cliente?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Carpeta elegida: <b>{origen.name}</b> <button type="button" className="ml-2 text-primary underline" onClick={elegirOrigen}>cambiar</button></p>
          </div>
          <div>
            <div className="mb-1.5 text-sm font-semibold">Tipos de archivo</div>
            <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3", todo && "opacity-40")}>
              {CATEGORIAS.map((c) => {
                const sel = cats.has(c.id);
                return (
                  <button key={c.id} type="button" disabled={buscando}
                    onClick={() => { const n = new Set(cats); if (sel) n.delete(c.id); else n.add(c.id); setCats(n); reiniciarBusqueda(); }}
                    className={cn("flex items-center gap-2 rounded-xl border-2 p-3 text-left", sel ? "border-primary bg-primary/5" : "hover:border-primary/40")}>
                    <span className="text-2xl">{c.emoji}</span>
                    <span><span className="block text-sm font-semibold leading-tight">{c.nombre}</span><span className="block text-xs text-muted-foreground">{c.detalle}</span></span>
                  </button>
                );
              })}
            </div>
            <button type="button" disabled={buscando} onClick={() => { setTodo(!todo); reiniciarBusqueda(); }}
              className={cn("mt-2 flex w-full items-center gap-2 rounded-xl border-2 p-3 text-left", todo ? "border-primary bg-primary/5" : "hover:border-primary/40")}>
              <span className="text-2xl">📦</span>
              <span><span className="block text-sm font-semibold">Copiar absolutamente todo</span><span className="block text-xs text-muted-foreground">Ignora los tipos de arriba (tarda más y ocupa más)</span></span>
            </button>
          </div>

          {!buscando && !resultado && <Button size="lg" className="h-12 gap-2 px-6 text-base" onClick={ejecutarBusqueda}>🔍 Buscar archivos</Button>}

          {(buscando || resultado) && (
            <div className="space-y-3">
              <div className="text-sm font-semibold">{buscando ? "Buscando archivos…" : resultado && resultado.ficheros.length === 0 ? "🤷 No se ha encontrado nada con esos filtros" : "✅ Búsqueda terminada"}</div>
              <Barra pct={100} indeterminada={buscando} azul />
              <div className="grid grid-cols-2 gap-2"><Dato valor={num(buscando ? progBusqueda.n : resultado?.ficheros.length ?? 0)} etiqueta="archivos encontrados" /><Dato valor={gb(buscando ? progBusqueda.bytes : total)} etiqueta="ocupan en total" /></div>
              {buscando && <><div className="truncate text-xs text-muted-foreground">Mirando: {progBusqueda.actual}</div><Button variant="outline" onClick={() => { cancelar.current = true; }}>Cancelar búsqueda</Button></>}
              {resultado && resultado.ficheros.length > 0 && (
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-xs uppercase text-muted-foreground"><th className="py-1 text-left">Tipo</th><th className="py-1 text-right">Archivos</th><th className="py-1 text-right">Tamaño</th></tr></thead>
                  <tbody>
                    {Object.entries(resultado.resumen).map(([k, v]) => {
                      const c = CATEGORIAS.find((x) => x.id === k);
                      return <tr key={k} className="border-b"><td className="py-1.5">{c?.emoji ?? "📁"} {c?.nombre ?? "Todo"}</td><td className="py-1.5 text-right tabular-nums">{num(v.n)}</td><td className="py-1.5 text-right tabular-nums">{gb(v.bytes)}</td></tr>;
                    })}
                  </tbody>
                </table>
              )}
              {resultado && resultado.ficheros.length === 0 && <Aviso tipo="amb">Prueba a marcar más tipos de archivo, a elegir otra carpeta o a copiar absolutamente todo.</Aviso>}
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-2 pt-2">
            <Button variant="outline" onClick={() => setPaso(1)} disabled={buscando}>← Atrás</Button>
            {resultado && resultado.ficheros.length > 0 && <Button size="lg" className="h-12 bg-emerald-600 px-6 text-base hover:bg-emerald-700" onClick={() => setPaso(3)}>Continuar →</Button>}
          </div>
        </section>
      )}

      {/* PASO 3 */}
      {paso === 3 && resultado && origen && (
        <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Paso 3 · Copiar los archivos</h2>

          {!copiando && !informe && (
            <>
              <p className="text-sm text-muted-foreground">Se van a copiar <b>{num(resultado.ficheros.length)} archivos ({gb(total)})</b> de <b>{origen.name}</b>.</p>
              <div>
                <div className="mb-1 text-sm font-semibold">¿Dónde guardar la copia?</div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant={destino ? "outline" : "default"} onClick={elegirDestino}>📁 {destino ? "Cambiar destino" : "Elegir carpeta de destino"}</Button>
                  {destino && <span className="text-sm">Destino: <b>{destino.name}</b></span>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Un disco externo, una carpeta de red o el Ubuntu. Debe tener espacio de sobra (hacen falta {gb(total)}).</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Número de resguardo <span className="font-normal text-muted-foreground">(obligatorio)</span></label>
                <Input value={resguardo} onChange={(e) => setResguardo(e.target.value)} placeholder="Por ejemplo: 19640" autoComplete="off" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Nota <span className="font-normal text-muted-foreground">(opcional)</span></label>
                <Input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: el cliente pidió solo las fotos" autoComplete="off" />
              </div>
              <div className="flex flex-wrap justify-between gap-2 pt-2">
                <Button variant="outline" onClick={() => setPaso(2)}>← Atrás</Button>
                <Button size="lg" className="h-12 bg-emerald-600 px-6 text-base hover:bg-emerald-700" disabled={!destino || !resguardo.trim()} onClick={empezar}>▶ Empezar la copia</Button>
              </div>
            </>
          )}

          {copiando && prog && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-sm font-semibold">
                {[["copiando", "1 · Copiando"], ["verificando", "2 · Comprobando que es idéntica"], ["terminado", "3 · Listo"]].map(([k, t], i) => {
                  const orden = ["copiando", "verificando", "terminado"];
                  const e = orden.indexOf(prog.fase);
                  return <span key={k} className={cn("rounded-full px-3 py-1", i < e ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : i === e ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>{t}</span>;
                })}
              </div>
              <div className="text-5xl font-extrabold tabular-nums">{Math.round(pctCopia)}%</div>
              <Barra pct={pctCopia} azul={prog.fase === "verificando"} />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Dato valor={prog.fase === "verificando" ? num(prog.verifHecho) : gb(prog.bytes)} etiqueta={prog.fase === "verificando" ? `comprobados de ${num(prog.verifTotal)}` : `copiados de ${gb(prog.bytesTotal)}`} />
                <Dato valor={num(prog.hecho)} etiqueta={`archivos de ${num(prog.total)}`} />
                <Dato valor={prog.fase === "copiando" && velocidad > 1 ? `${Math.round(velocidad / 1e6)} MB/s` : "—"} etiqueta="velocidad" />
                <Dato valor={restante} etiqueta="tiempo restante" />
              </div>
              <div className="truncate text-xs text-muted-foreground">{prog.fase === "verificando" ? "Comprobando: " : "Copiando: "}{prog.actual}</div>
              {prog.errores > 0 && <Aviso tipo="amb">⚠️ {prog.errores} archivo(s) no se han podido leer (disco dañado o bloqueado). La copia sigue; quedarán anotados en el informe.</Aviso>}
              <Aviso tipo="info">No cierres esta pestaña ni desconectes el disco mientras copia.</Aviso>
              <Button variant="outline" onClick={() => { cancelar.current = true; }}>Cancelar la copia</Button>
            </div>
          )}

          {informe && (
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-6xl">{informe.cancelado ? "⏹️" : informe.errores.length + informe.fallosVerificacion.length ? "⚠️" : "✅"}</div>
                <h3 className="mt-1 text-xl font-semibold">{informe.cancelado ? "Copia cancelada" : informe.errores.length + informe.fallosVerificacion.length ? "Copia terminada, con avisos" : "¡Copia terminada y verificada!"}</h3>
                <p className="text-sm text-muted-foreground"><b>{num(informe.verificados)}</b> archivos copiados ({gb(informe.bytes)}) y comprobados uno a uno, en {dur(informe.segundos)}.</p>
              </div>
              <div className="break-all rounded-lg bg-muted px-3 py-2 font-mono text-xs">{informe.carpeta}</div>
              {(informe.errores.length > 0 || informe.fallosVerificacion.length > 0) && <Aviso tipo="amb">{informe.errores.length > 0 && `${informe.errores.length} archivo(s) ilegibles no copiados. `}{informe.fallosVerificacion.length > 0 && `${informe.fallosVerificacion.length} con fallo de verificación (repetir la copia). `}Están listados en el informe.</Aviso>}
              <details><summary className="cursor-pointer text-sm font-semibold text-primary">Ver el informe completo</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs">{informe.informe}</pre></details>
              <div className="flex justify-end"><Button size="lg" className="h-12 bg-emerald-600 px-6 text-base hover:bg-emerald-700" onClick={() => setPaso(4)}>Siguiente: terminar →</Button></div>
            </div>
          )}
        </section>
      )}

      {/* PASO 4 */}
      {paso === 4 && (
        <section className="space-y-4 rounded-2xl border bg-card p-5 text-center shadow-sm">
          <div className="text-6xl">🎉</div>
          <h2 className="text-xl font-semibold">Todo listo</h2>
          <p className="text-sm text-muted-foreground">La copia está guardada y verificada. Antes de desconectar el disco del cliente, <b>expúlsalo con seguridad</b> desde Windows (icono «Quitar hardware de forma segura») o con «Expulsar» en el Ubuntu.</p>
          {informe && <div className="break-all rounded-lg bg-muted px-3 py-2 font-mono text-xs">{informe.carpeta}</div>}
          <div className="flex justify-center"><Button size="lg" className="h-12 px-6 text-base" onClick={otraExtraccion}>➕ Empezar otra extracción</Button></div>
        </section>
      )}
    </div>
  );
}
