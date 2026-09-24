"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft2, Send2, Refresh2, TickCircle, Warning2, Monitor, Copy, Add, Maximize4, MinusSquare, Sun1, Moon,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CodeEditor, ManejadorEditor, TemaEditor } from "@/components/code-editor";
import { useEsSuperadmin } from "@/hooks/use-es-superadmin";
import { DetalleTipoCorreo, ETIQUETA_CATEGORIA } from "@/lib/mails-tipos";
import { cn } from "@/lib/utils";
import { fechaHora } from "../../componentes-correo";

// ── Ejecución de la plantilla ─────────────────────────────────────────────
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
  bruto: unknown;
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
      resolve({ asunto: String(json.email_subject ?? json.subject ?? ""), cuerpo, otros: resto, bruto });
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

// ── Ayudas de edición ─────────────────────────────────────────────────────
const EJEMPLOS: { nombre: string; datos: Record<string, unknown> }[] = [
  { nombre: "Empresa y categoría", datos: { name: "taller mecánico garcía", cCategoria: "reparación_de_vehículos", emailAddress: "contacto@tallergarcia.example" } },
  { nombre: "Solo empresa", datos: { name: "clínica dental sonrisa", emailAddress: "info@sonrisa.example" } },
  { nombre: "Solo categoría", datos: { cCategoria: "asesoría-fiscal", emailAddress: "hola@asesoria.example" } },
  { nombre: "Sin datos", datos: { emailAddress: "contacto@ejemplo.com" } },
  { nombre: "Nombre con acentos y símbolos", datos: { name: "ñandú café & té s.l.", cCategoria: "hostelería", emailAddress: "hola@nandu.example" } },
];

const FRAGMENTOS: { nombre: string; codigo: string }[] = [
  { nombre: "Esqueleto completo", codigo: `return items.map(item => {
  const data = item.json;

  const empresa = (data.name || "").toString().trim();
  const emailDestino = data.emailAddress || data.email || "";

  const parrafos = [
    empresa ? \`Hola, equipo de \${empresa}:\` : "Hola:",
    "Escribe aquí el cuerpo del mensaje.",
  ];

  const unsubscribeUrl =
    \`https://ssn8nss.affirmatechnology.com/webhook/unsubscribe2?email=\${encodeURIComponent(emailDestino)}\`;

  const mensaje = \`
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#222;max-width:600px;">
      \${parrafos.map(p => \`<p style="margin:0 0 14px 0;">\${p}</p>\`).join("")}
      <p style="margin:22px 0 0 0;">Un saludo,<br>Equipo</p>
      <p style="margin:28px 0 0 0;font-size:11px;color:#999;">
        Si no quieres recibir más correos, <a href="\${unsubscribeUrl}" style="color:#999;">puedes darte de baja aquí</a>.
      </p>
    </div>\`;

  return { json: { ...data, email_body: mensaje, email_subject: "Asunto del correo" } };
});
` },
  { nombre: "Párrafo (elemento del array)", codigo: `"Escribe aquí tu párrafo.",\n` },
  { nombre: "Párrafo condicional con la empresa", codigo: `empresa
  ? \`Al ver \${empresa}, pensé que quizá te interese esto.\`
  : "Pensé que quizá te interese esto.",\n` },
  { nombre: "Botón (enlace destacado)", codigo: `<a href="https://wa.me/34600000000" style="display:inline-block;padding:10px 18px;background:#111111;color:#ffffff;text-decoration:none;border-radius:6px;">Escríbenos por WhatsApp</a>` },
  { nombre: "Enlace de baja dinámico", codigo: `const unsubscribeUrl =
  \`https://ssn8nss.affirmatechnology.com/webhook/unsubscribe2?email=\${encodeURIComponent(emailDestino)}\`;\n` },
  { nombre: "Nombre en formato título (con acentos)", codigo: `.replace(/(^|\\s)\\S/g, l => l.toUpperCase())` },
];

interface Prefs {
  tema: TemaEditor;
  fuente: number;
  vista: "ambos" | "codigo" | "previa";
}
const PREFS_DEFECTO: Prefs = { tema: "vesper", fuente: 13, vista: "ambos" };

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
  const [pestana, setPestana] = useState<"correo" | "html" | "json">("correo");
  const [prefs, setPrefs] = useState<Prefs>(PREFS_DEFECTO);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [menuInsertar, setMenuInsertar] = useState(false);
  const [menuEjemplos, setMenuEjemplos] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const secuencia = useRef(0);
  const editorRef = useRef<ManejadorEditor>(null);

  useEffect(() => {
    try {
      const g = localStorage.getItem("mails-plantilla-prefs");
      if (g) setPrefs({ ...PREFS_DEFECTO, ...(JSON.parse(g) as Partial<Prefs>) });
    } catch {
      /* sin almacenamiento: se usan los valores por defecto */
    }
  }, []);

  function cambiarPrefs(cambio: Partial<Prefs>) {
    setPrefs((p) => {
      const n = { ...p, ...cambio };
      try {
        localStorage.setItem("mails-plantilla-prefs", JSON.stringify(n));
      } catch {
        /* ignorar */
      }
      return n;
    });
  }

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/mails/tipos/${encodeURIComponent(tipo)}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      const d = data.tipo as DetalleTipoCorreo;
      const cod = (d.plantilla_js ?? "").replace(/\r\n?|\r/g, "\n");
      const dat = JSON.stringify(d.plantilla_datos_prueba ?? EJEMPLOS[0].datos, null, 2);
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
    }, 500);
    return () => clearTimeout(t);
  }, [codigo, datosParseados, detalle, recarga]);

  const sinGuardar = detalle !== null && (codigo !== guardado.codigo || datosTxt !== guardado.datos);

  useEffect(() => {
    if (!sinGuardar) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [sinGuardar]);

  const guardar = useCallback(async () => {
    if (!esSuperadmin || !sinGuardar) return;
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
  }, [esSuperadmin, sinGuardar, datosParseados, tipo, codigo, datosTxt]);

  async function copiar(texto: string, que: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(`${que} copiado`);
    } catch {
      toast.error("No se pudo copiar al portapapeles");
    }
  }

  function descargarHtml() {
    if (!resultado) return;
    const blob = new Blob([documentoCorreo(resultado.cuerpo)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tipo}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function descartar() {
    if (!window.confirm("¿Descartar los cambios y volver a la versión guardada?")) return;
    setCodigo(guardado.codigo);
    setDatosTxt(guardado.datos);
  }

  function formatearDatos() {
    if (datosParseados.ok) setDatosTxt(JSON.stringify(datosParseados.valor, null, 2));
  }

  const comprobaciones = useMemo(() => {
    if (!resultado) return [];
    const enlaces = (resultado.cuerpo.match(/<a\s[^>]*href=/gi) || []).length;
    const tieneBaja = /unsubscribe|darte de baja|dar de baja|cancelar (la )?suscripci|baja/i.test(resultado.cuerpo) && enlaces > 0;
    const kb = new Blob([resultado.cuerpo]).size / 1024;
    const largo = resultado.asunto.length;
    return [
      { ok: tieneBaja, texto: tieneBaja ? "Incluye enlace de baja" : "Falta el enlace de baja" },
      { ok: largo > 0 && largo <= 60, texto: largo === 0 ? "Sin asunto" : `Asunto: ${largo} caracteres${largo > 60 ? " (largo)" : ""}` },
      { ok: kb < 90, texto: `${kb.toFixed(1)} KB${kb >= 90 ? " (Gmail lo recorta a ~102 KB)" : ""}` },
      { ok: true, texto: `${enlaces} enlace${enlaces === 1 ? "" : "s"}` },
    ];
  }, [resultado]);

  const otrosCampos = resultado ? Object.entries(resultado.otros).filter(([, v]) => typeof v !== "object" || v === null) : [];
  const verCodigo = prefs.vista !== "previa";
  const verPrevia = prefs.vista !== "codigo";
  const alturaEditor = pantallaCompleta ? "h-[calc(100vh-17rem)]" : "h-[calc(100vh-22rem)]";
  const alturaPrevia = pantallaCompleta ? "h-[calc(100vh-19rem)]" : "h-[calc(100vh-24rem)]";

  const botonHerramienta = "h-7 gap-1.5 px-2 text-xs";

  return (
    <div className={cn("space-y-3", pantallaCompleta && "fixed inset-0 z-50 overflow-auto bg-background p-4")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link href="/mails/tipos" className="flex size-8 items-center justify-center rounded-md border hover:bg-muted/40" title="Volver a tipos de correo">
            <ArrowLeft2 className="size-4" />
          </Link>
          <Send2 className="size-6 shrink-0 text-sky-600 dark:text-sky-400" />
          <div>
            <h1 className="text-lg leading-tight font-semibold">{detalle ? detalle.nombre : "Plantilla de correo"}</h1>
            <p className="text-sm text-muted-foreground">
              {detalle
                ? `${ETIQUETA_CATEGORIA[detalle.categoria] || detalle.categoria} · ${detalle.plantilla_actualizada_en ? `guardada ${fechaHora(detalle.plantilla_actualizada_en)} por ${detalle.plantilla_actualizada_por ?? "—"}` : "sin plantilla guardada"}`
                : "Cargando…"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sinGuardar && <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Cambios sin guardar</span>}
          {sinGuardar && (
            <Button size="sm" variant="ghost" onClick={descartar}>Descartar</Button>
          )}
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
        <>
          {/* Barra de herramientas */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5">
            <div className="flex items-center gap-1 rounded-md border p-0.5" role="group" aria-label="Vista">
              {([["ambos", "Código y vista previa"], ["codigo", "Solo código"], ["previa", "Solo vista previa"]] as const).map(([k, t]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => cambiarPrefs({ vista: k })}
                  aria-pressed={prefs.vista === k}
                  className={cn("rounded px-2 py-1 text-xs", prefs.vista === k ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="relative">
              <Button type="button" variant="outline" size="sm" className={botonHerramienta} disabled={!esSuperadmin} onClick={() => { setMenuInsertar((v) => !v); setMenuEjemplos(false); }}>
                <Add className="size-3.5" /> Insertar
              </Button>
              {menuInsertar && (
                <div className="absolute left-0 z-30 mt-1 w-72 rounded-md border bg-popover p-1 shadow-md">
                  {FRAGMENTOS.map((f) => (
                    <button
                      key={f.nombre}
                      type="button"
                      className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
                      onClick={() => {
                        setMenuInsertar(false);
                        if (f.nombre === "Esqueleto completo" && codigo.trim() && !window.confirm("El esqueleto se insertará en la posición del cursor. ¿Continuar?")) return;
                        editorRef.current?.insertar(f.codigo);
                      }}
                    >
                      {f.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-0.5 rounded-md border p-0.5" role="group" aria-label="Tamaño de letra">
              <button type="button" className="rounded p-1 hover:bg-muted" onClick={() => cambiarPrefs({ fuente: Math.max(10, prefs.fuente - 1) })} title="Letra más pequeña"><MinusSquare className="size-3.5" /></button>
              <span className="w-8 text-center text-xs tabular-nums">{prefs.fuente}px</span>
              <button type="button" className="rounded p-1 hover:bg-muted" onClick={() => cambiarPrefs({ fuente: Math.min(20, prefs.fuente + 1) })} title="Letra más grande"><Add className="size-3.5" /></button>
            </div>

            <Button type="button" variant="outline" size="sm" className={botonHerramienta} onClick={() => cambiarPrefs({ tema: prefs.tema === "vesper" ? "claro" : "vesper" })} title="Cambiar el tema del editor">
              {prefs.tema === "vesper" ? <Moon className="size-3.5" /> : <Sun1 className="size-3.5" />} {prefs.tema === "vesper" ? "Vesper" : "Claro"}
            </Button>

            <Button type="button" variant="outline" size="sm" className={botonHerramienta} onClick={() => copiar(codigo, "Código")} disabled={!codigo}>
              <Copy className="size-3.5" /> Copiar código
            </Button>

            <Button type="button" variant="outline" size="sm" className={botonHerramienta} onClick={() => setRecarga((n) => n + 1)} title="Volver a ejecutar">
              <Refresh2 className={cn("size-3.5", ejecutando && "animate-spin")} /> Ejecutar
            </Button>

            <Button type="button" variant="outline" size="sm" className={cn(botonHerramienta, "ml-auto")} onClick={() => setPantallaCompleta((v) => !v)}>
              <Maximize4 className="size-3.5" /> {pantallaCompleta ? "Salir de pantalla completa" : "Pantalla completa"}
            </Button>
          </div>

          <div className={cn("grid gap-3", verCodigo && verPrevia && "lg:grid-cols-2")}>
            {verCodigo && (
              <div className="flex min-w-0 flex-col gap-3">
                <div className="overflow-hidden rounded-lg border" style={{ borderColor: prefs.tema === "vesper" ? "#2a2a2a" : undefined }}>
                  <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5" style={prefs.tema === "vesper" ? { background: "#161616", color: "#a0a0a0", borderColor: "#2a2a2a" } : undefined}>
                    <span className="text-xs font-semibold">plantilla.js</span>
                    <span className="hidden text-[11px] opacity-70 sm:inline">Tab sangra · Ctrl+/ comenta · Ctrl+S guarda</span>
                  </div>
                  <CodeEditor
                    value={codigo}
                    onChange={setCodigo}
                    tema={prefs.tema}
                    tamanoFuente={prefs.fuente}
                    soloLectura={!esSuperadmin}
                    onGuardar={guardar}
                    editorRef={editorRef}
                    placeholder="return items.map(item => { … });"
                    className={alturaEditor}
                  />
                </div>

                <div className="overflow-hidden rounded-lg border" style={{ borderColor: prefs.tema === "vesper" ? "#2a2a2a" : undefined }}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-1.5" style={prefs.tema === "vesper" ? { background: "#161616", color: "#a0a0a0", borderColor: "#2a2a2a" } : undefined}>
                    <span className="text-xs font-semibold">Datos de prueba (item de entrada)</span>
                    <div className="flex items-center gap-2">
                      {!datosParseados.ok && <span className="text-xs text-red-400">{datosParseados.error}</span>}
                      <button type="button" className="text-xs underline-offset-2 hover:underline disabled:opacity-40" disabled={!datosParseados.ok || !esSuperadmin} onClick={formatearDatos}>Formatear</button>
                      <div className="relative">
                        <button type="button" className="text-xs underline-offset-2 hover:underline disabled:opacity-40" disabled={!esSuperadmin} onClick={() => { setMenuEjemplos((v) => !v); setMenuInsertar(false); }}>
                          Cargar ejemplo ▾
                        </button>
                        {menuEjemplos && (
                          <div className="absolute right-0 z-30 mt-1 w-60 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                            {EJEMPLOS.map((ej) => (
                              <button
                                key={ej.nombre}
                                type="button"
                                className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
                                onClick={() => {
                                  setMenuEjemplos(false);
                                  setDatosTxt(JSON.stringify(ej.datos, null, 2));
                                }}
                              >
                                {ej.nombre}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <CodeEditor value={datosTxt} onChange={setDatosTxt} lenguaje="json" tema={prefs.tema} tamanoFuente={prefs.fuente} soloLectura={!esSuperadmin} numerosDeLinea={false} className="h-36" />
                </div>
              </div>
            )}

            {verPrevia && (
              <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-1.5">
                  <div className="flex items-center gap-1 rounded-md border bg-background p-0.5" role="tablist">
                    {([["correo", "Correo"], ["html", "HTML"], ["json", "Resultado"]] as const).map(([k, t]) => (
                      <button key={k} type="button" role="tab" aria-selected={pestana === k} onClick={() => setPestana(k)} className={cn("rounded px-2 py-1 text-xs", pestana === k ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("inline-flex items-center gap-1 text-xs", errorEjecucion ? "text-destructive" : "text-muted-foreground")}>
                      {ejecutando ? <Refresh2 className="size-3.5 animate-spin" /> : errorEjecucion ? <Warning2 className="size-3.5" /> : <TickCircle className="size-3.5 text-green-600" />}
                      {ejecutando ? "Ejecutando…" : errorEjecucion ? "Error" : "Ejecutado"}
                    </span>
                    {pestana === "correo" && (
                      <Button type="button" variant="outline" size="sm" className={botonHerramienta} onClick={() => setMovil((v) => !v)} aria-pressed={movil}>
                        <Monitor className="size-3.5" /> {movil ? "Móvil" : "Escritorio"}
                      </Button>
                    )}
                    <Button type="button" variant="outline" size="sm" className={botonHerramienta} disabled={!resultado} onClick={() => resultado && copiar(resultado.cuerpo, "HTML")}>
                      <Copy className="size-3.5" /> HTML
                    </Button>
                    <Button type="button" variant="outline" size="sm" className={botonHerramienta} disabled={!resultado} onClick={descargarHtml}>
                      Descargar
                    </Button>
                  </div>
                </div>

                {errorEjecucion && (
                  <pre className="whitespace-pre-wrap border-b border-destructive/30 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">{errorEjecucion}</pre>
                )}

                {resultado ? (
                  <>
                    <div className="flex items-center justify-between gap-2 border-b px-3 py-2 text-sm">
                      <span className="min-w-0 truncate">
                        <span className="text-muted-foreground">Asunto: </span>
                        <span className="font-medium">{resultado.asunto || "—"}</span>
                      </span>
                      <button type="button" className="shrink-0 text-xs text-muted-foreground hover:text-foreground" onClick={() => copiar(resultado.asunto, "Asunto")}>Copiar</button>
                    </div>

                    {pestana === "correo" && (
                      <div className={cn("overflow-auto bg-slate-100 p-3 dark:bg-slate-800", alturaPrevia, errorEjecucion && "opacity-50")}>
                        <iframe
                          title="Vista previa del correo"
                          sandbox=""
                          srcDoc={documentoCorreo(resultado.cuerpo)}
                          className={cn("mx-auto block h-full min-h-64 rounded-md border bg-white", movil ? "w-[375px] max-w-full" : "w-full")}
                        />
                      </div>
                    )}
                    {pestana === "html" && (
                      <CodeEditor value={resultado.cuerpo} onChange={() => {}} soloLectura lenguaje="html" tema={prefs.tema} tamanoFuente={prefs.fuente} className={alturaPrevia} />
                    )}
                    {pestana === "json" && (
                      <CodeEditor value={JSON.stringify(resultado.bruto, null, 2)} onChange={() => {}} soloLectura lenguaje="json" tema={prefs.tema} tamanoFuente={prefs.fuente} className={alturaPrevia} />
                    )}

                    <div className="flex flex-wrap gap-1.5 border-t px-3 py-2">
                      {comprobaciones.map((c) => (
                        <span key={c.texto} className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs", c.ok ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400")}>
                          {c.ok ? <TickCircle className="size-3" /> : <Warning2 className="size-3" />} {c.texto}
                        </span>
                      ))}
                      {otrosCampos.map(([k, v]) => (
                        <span key={k} className="max-w-full truncate rounded-md bg-muted px-2 py-0.5 text-xs" title={`${k}: ${String(v)}`}>
                          <span className="text-muted-foreground">{k}:</span> {String(v)}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  !errorEjecucion && (
                    <div className={cn("flex items-center justify-center px-6 text-center text-sm text-muted-foreground", alturaPrevia)}>
                      {codigo.trim() ? "Ejecutando el código…" : "Pega el código de tu nodo de correo a la izquierda, o usa Insertar → Esqueleto completo."}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
