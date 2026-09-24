"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft2, Send2, Refresh2, TickCircle, Warning2, Monitor } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEsSuperadmin } from "@/hooks/use-es-superadmin";
import { DetalleTipoCorreo, ETIQUETA_CATEGORIA } from "@/lib/mails-tipos";
import { cn } from "@/lib/utils";
import { fechaHora } from "../../componentes-correo";

const DATOS_POR_DEFECTO = { name: "empresa de ejemplo sl", cCategoria: "categoría_de_ejemplo", emailAddress: "contacto@ejemplo.com" };

// La plantilla es código estilo nodo "Code" de n8n: usa `items` y devuelve
// [{ json: { email_body, email_subject, ... } }]. Se ejecuta SOLO aquí, en un
// Web Worker aislado del DOM y sin red, con un tiempo máximo (un bucle
// infinito se corta). El servidor únicamente guarda el texto.
const WORKER_SRC = `
self.onmessage = (e) => {
  const { codigo, items } = e.data;
  try {
    self.fetch = undefined; self.XMLHttpRequest = undefined; self.WebSocket = undefined; self.importScripts = undefined;
    const fn = new Function("items", "$input", "$json", codigo);
    const entrada = { all: () => items, first: () => items[0] };
    const res = fn(items, entrada, items[0] && items[0].json);
    self.postMessage({ ok: true, resultado: JSON.parse(JSON.stringify(res === undefined ? null : res)) });
  } catch (err) {
    self.postMessage({ ok: false, error: (err && err.name ? err.name + ": " : "") + (err && err.message ? err.message : String(err)) });
  }
};`;

const TIEMPO_MAXIMO_MS = 3000;

interface Resultado {
  asunto: string;
  cuerpo: string;
  otros: Record<string, unknown>;
}

function ejecutar(codigo: string, datos: Record<string, unknown>): Promise<Resultado> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
    const worker = new Worker(url);
    const limpiar = () => {
      clearTimeout(t);
      worker.terminate();
      URL.revokeObjectURL(url);
    };
    const t = setTimeout(() => {
      limpiar();
      reject(new Error(`El código tardó más de ${TIEMPO_MAXIMO_MS / 1000} s (¿bucle infinito?)`));
    }, TIEMPO_MAXIMO_MS);
    worker.onmessage = (e: MessageEvent<{ ok: boolean; resultado?: unknown; error?: string }>) => {
      limpiar();
      if (!e.data.ok) return reject(new Error(e.data.error || "Error al ejecutar el código"));
      const bruto = e.data.resultado;
      const primero = Array.isArray(bruto) ? bruto[0] : bruto;
      const json = (primero && typeof primero === "object" && "json" in (primero as object) ? (primero as { json: unknown }).json : primero) as Record<string, unknown> | null;
      if (!json || typeof json !== "object") return reject(new Error("El código debe devolver items: [{ json: { email_body, email_subject, … } }]"));
      const cuerpo = String(json.email_body ?? json.html ?? "");
      if (!cuerpo) return reject(new Error("El resultado no trae email_body"));
      const { email_body: _b, html: _h, ...resto } = json;
      void _b; void _h;
      resolve({ asunto: String(json.email_subject ?? json.subject ?? ""), cuerpo, otros: resto });
    };
    worker.onerror = (e) => {
      limpiar();
      reject(new Error(e.message || "Error al ejecutar el código"));
    };
    worker.postMessage({ codigo, items: [{ json: datos }] });
  });
}

/** Documento del correo para el iframe: sin scripts (sandbox vacío) y sin cargar nada externo. */
function documentoCorreo(cuerpo: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"><base target="_blank"></head><body style="margin:0;padding:16px;background:#fff">${cuerpo}</body></html>`;
}

export default function PlantillaTipoPage({ params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = use(params);
  const esSuperadmin = useEsSuperadmin();
  const [detalle, setDetalle] = useState<DetalleTipoCorreo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [datosTxt, setDatosTxt] = useState("");
  const [guardado, setGuardado] = useState({ codigo: "", datos: "" });
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [errorEjecucion, setErrorEjecucion] = useState<string | null>(null);
  const [ejecutando, setEjecutando] = useState(false);
  const [movil, setMovil] = useState(false);
  const secuencia = useRef(0);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/mails/tipos/${encodeURIComponent(tipo)}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      const d = data.tipo as DetalleTipoCorreo;
      const cod = d.plantilla_js ?? "";
      const dat = JSON.stringify(d.plantilla_datos_prueba ?? DATOS_POR_DEFECTO, null, 2);
      setDetalle(d);
      setCodigo(cod);
      setDatosTxt(dat);
      setGuardado({ codigo: cod, datos: dat });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    }
  }, [tipo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const datosParseados = useMemo(() => {
    try {
      const v = JSON.parse(datosTxt);
      return v && typeof v === "object" && !Array.isArray(v) ? { ok: true as const, valor: v as Record<string, unknown> } : { ok: false as const, error: "Debe ser un objeto JSON" };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "JSON no válido" };
    }
  }, [datosTxt]);

  useEffect(() => {
    if (!detalle) return;
    if (!codigo.trim()) {
      setResultado(null);
      setErrorEjecucion(null);
      return;
    }
    if (!datosParseados.ok) return;
    const id = ++secuencia.current;
    setEjecutando(true);
    const t = setTimeout(() => {
      ejecutar(codigo, datosParseados.valor)
        .then((r) => {
          if (id !== secuencia.current) return;
          setResultado(r);
          setErrorEjecucion(null);
        })
        .catch((e) => {
          if (id !== secuencia.current) return;
          setErrorEjecucion(e instanceof Error ? e.message : String(e));
        })
        .finally(() => {
          if (id === secuencia.current) setEjecutando(false);
        });
    }, 600);
    return () => clearTimeout(t);
  }, [codigo, datosParseados, detalle]);

  const sinGuardar = detalle !== null && (codigo !== guardado.codigo || datosTxt !== guardado.datos);

  async function guardar() {
    if (!datosParseados.ok) return toast.error(`Datos de prueba: ${datosParseados.error}`);
    setGuardando(true);
    try {
      const res = await fetch(`/api/mails/tipos/${encodeURIComponent(tipo)}/plantilla`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, datosPrueba: datosParseados.valor }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setGuardado({ codigo, datos: datosTxt });
      toast.success("Plantilla guardada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  function alPulsarTecla(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const { selectionStart: ini, selectionEnd: fin } = el;
      const nuevo = codigo.slice(0, ini) + "  " + codigo.slice(fin);
      setCodigo(nuevo);
      requestAnimationFrame(() => el.setSelectionRange(ini + 2, ini + 2));
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (esSuperadmin && sinGuardar) guardar();
    }
  }

  const otrosCampos = resultado ? Object.entries(resultado.otros).filter(([, v]) => typeof v !== "object" || v === null) : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Link href="/mails/tipos" className="flex size-8 items-center justify-center rounded-md border hover:bg-muted/40" title="Volver a tipos de correo">
            <ArrowLeft2 className="size-4" />
          </Link>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-sky-500 to-indigo-600 text-white">
            <Send2 className="size-4.5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">{detalle ? detalle.nombre : "Plantilla de correo"}</h1>
            <p className="text-sm text-muted-foreground">
              {detalle
                ? `${ETIQUETA_CATEGORIA[detalle.categoria] || detalle.categoria} · ${detalle.plantilla_actualizada_en ? `guardada ${fechaHora(detalle.plantilla_actualizada_en)} por ${detalle.plantilla_actualizada_por ?? "—"}` : "sin plantilla guardada"}`
                : "Cargando…"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sinGuardar && <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Cambios sin guardar</span>}
          {esSuperadmin ? (
            <Button size="sm" disabled={!sinGuardar || guardando || !datosParseados.ok} onClick={guardar}>
              {guardando ? "Guardando…" : "Guardar plantilla"}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Solo el superadmin puede guardar</span>
          )}
        </div>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>}

      {!detalle && !error && <Skeleton className="h-[60vh] w-full" />}

      {detalle && (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="overflow-hidden rounded-lg border">
              <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
                <span className="text-sm font-semibold">Código JS</span>
                <span className="text-xs text-muted-foreground">Recibe <code>items</code> y devuelve <code>{"[{ json: { email_body, email_subject } }]"}</code></span>
              </div>
              <textarea
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                onKeyDown={alPulsarTecla}
                readOnly={!esSuperadmin}
                spellCheck={false}
                wrap="off"
                placeholder="return items.map(item => { … });"
                className="block h-[58vh] w-full resize-none bg-slate-950 p-3 font-mono text-[13px] leading-5 text-slate-100 outline-none"
              />
            </div>
            <div className="overflow-hidden rounded-lg border">
              <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
                <span className="text-sm font-semibold">Datos de prueba (item de entrada)</span>
                {!datosParseados.ok && <span className="text-xs text-destructive">{datosParseados.error}</span>}
              </div>
              <textarea
                value={datosTxt}
                onChange={(e) => setDatosTxt(e.target.value)}
                readOnly={!esSuperadmin}
                spellCheck={false}
                wrap="off"
                className={cn("block h-32 w-full resize-none bg-slate-900 p-3 font-mono text-[13px] leading-5 text-slate-100 outline-none", !datosParseados.ok && "ring-2 ring-inset ring-destructive")}
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
              <span className="text-sm font-semibold">Vista previa</span>
              <div className="flex items-center gap-2">
                <span className={cn("inline-flex items-center gap-1 text-xs", errorEjecucion ? "text-destructive" : "text-muted-foreground")}>
                  {ejecutando ? <Refresh2 className="size-3.5 animate-spin" /> : errorEjecucion ? <Warning2 className="size-3.5" /> : <TickCircle className="size-3.5 text-green-600" />}
                  {ejecutando ? "Ejecutando…" : errorEjecucion ? "Error" : "Ejecutado"}
                </span>
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5" onClick={() => setMovil((v) => !v)} aria-pressed={movil}>
                  <Monitor className="size-3.5" /> {movil ? "Móvil" : "Escritorio"}
                </Button>
              </div>
            </div>

            {errorEjecucion && (
              <pre className="whitespace-pre-wrap border-b border-destructive/30 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">{errorEjecucion}</pre>
            )}

            {resultado ? (
              <>
                <div className="border-b px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Asunto: </span>
                  <span className="font-medium">{resultado.asunto || "—"}</span>
                </div>
                <div className={cn("flex-1 overflow-auto bg-slate-100 p-3 dark:bg-slate-800", errorEjecucion && "opacity-50")}>
                  <iframe
                    title="Vista previa del correo"
                    sandbox=""
                    srcDoc={documentoCorreo(resultado.cuerpo)}
                    className={cn("mx-auto block h-[52vh] rounded-md border bg-white", movil ? "w-[375px] max-w-full" : "w-full")}
                  />
                </div>
                {otrosCampos.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 border-t px-3 py-2">
                    {otrosCampos.map(([k, v]) => (
                      <span key={k} className="max-w-full truncate rounded-md bg-muted px-2 py-0.5 text-xs" title={`${k}: ${String(v)}`}>
                        <span className="text-muted-foreground">{k}:</span> {String(v)}
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              !errorEjecucion && (
                <div className="flex h-[52vh] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  {codigo.trim() ? "Ejecutando el código…" : "Pega el código de tu nodo de correo a la izquierda y aquí verás el resultado."}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
