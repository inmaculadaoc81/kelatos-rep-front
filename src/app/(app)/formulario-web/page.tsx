"use client";

import { useEffect, useState } from "react";
import {
  ScanBarcode,
  Copy,
  TickCircle,
  Refresh2,
  Monitor,
  InfoCircle,
  Call,
  Sms,
  Personalcard,
  Hashtag,
  DocumentText,
  AddCircle,
  ShieldTick,
  Send2,
  Clock,
  SearchNormal1,
  Gallery,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CodigoAcceso } from "@/lib/formulario-acceso";
import { ArchivoFormulario } from "@/app/api/formulario-cliente/archivos/route";

function formatearExpiracion(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function FormularioWebPage() {
  const [codigo, setCodigo] = useState<CodigoAcceso | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [busquedaArchivos, setBusquedaArchivos] = useState("");
  const [archivos, setArchivos] = useState<ArchivoFormulario[] | null>(null);
  const [cargandoArchivos, setCargandoArchivos] = useState(false);
  const [errorArchivos, setErrorArchivos] = useState<string | null>(null);
  // Date.now() no puede llamarse en el cuerpo del render (regla de pureza
  // de React) — el backend ya filtra los caducados al leer el código
  // activo, así que esto solo importa si la pestaña se queda abierta más
  // de 24h sin recargar; se recalcula cuando cambia `codigo`.
  const [caducado, setCaducado] = useState(false);

  async function cargarQr() {
    try {
      const res = await fetch("/api/formulario-cliente/qr");
      const data = await res.json();
      if (data.ok) {
        setUrl(data.url);
        setQr(data.dataUrl);
      }
    } catch {
      /* el QR es un extra visual; si falla, la URL de abajo sigue siendo utilizable */
    }
  }

  async function cargarCodigo() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/formulario-cliente/codigo-acceso");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setCodigo(data.activo as CodigoAcceso | null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarQr();
    cargarCodigo();
    buscarArchivos("");
  }, []);

  useEffect(() => {
    setCaducado(codigo ? new Date(codigo.expiraEn).getTime() < Date.now() : false);
  }, [codigo]);

  async function generarNuevoCodigo() {
    setGenerando(true);
    try {
      const res = await fetch("/api/formulario-cliente/codigo-acceso", { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setCodigo(data.codigo as CodigoAcceso);
      toast.success("Código nuevo generado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGenerando(false);
    }
  }

  async function buscarArchivos(q: string) {
    setCargandoArchivos(true);
    setErrorArchivos(null);
    try {
      const res = await fetch(`/api/formulario-cliente/archivos?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setArchivos(data.items as ArchivoFormulario[]);
    } catch (e) {
      setErrorArchivos(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargandoArchivos(false);
    }
  }

  function copiarUrl() {
    navigator.clipboard.writeText(url);
    setCopiado(true);
    toast.success("Enlace copiado");
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Monitor className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold">Formulario en Tablet</h1>
          <p className="text-sm text-muted-foreground">
            URL que se abre en la tablet de la tienda. El cliente rellena sus datos y la reparación aparece automáticamente en el sistema.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar: {error}
        </div>
      )}

      {/* Código de acceso + QR */}
      <div className="mb-4 overflow-hidden rounded-xl border-2 border-primary shadow-sm">
        <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
          <span className="flex items-center gap-2 font-semibold">
            <ScanBarcode className="size-5" /> Código de acceso al formulario
          </span>
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5"
            disabled={generando}
            onClick={generarNuevoCodigo}
          >
            <Refresh2 className={`size-3.5 ${generando ? "animate-spin" : ""}`} />
            Nuevo código
          </Button>
        </div>

        <div className="p-4">
          {cargando && (
            <div className="flex gap-4">
              <Skeleton className="size-44 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          )}

          {!cargando && !codigo && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <ScanBarcode className="size-8 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                No hay ningún código activo. Genera uno para que los clientes puedan acceder al formulario.
              </p>
              <Button className="gap-1.5" disabled={generando} onClick={generarNuevoCodigo}>
                <AddCircle className="size-4" /> Generar código
              </Button>
            </div>
          )}

          {!cargando && codigo && (
            <div className="flex flex-wrap items-start gap-4">
              {qr && (
                <div className="shrink-0 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt="QR del formulario" className="size-44 rounded-lg border-2 bg-muted p-2" />
                  <p className="mt-1.5 text-[11px] text-muted-foreground">Escanear con el móvil del cliente</p>
                </div>
              )}

              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-center">
                    <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">ID visita</p>
                    <p className="text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">#{codigo.visitaId}</p>
                  </div>
                  <div className="flex-1 rounded-lg bg-primary/5 px-3 py-2 text-center">
                    <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Código de acceso</p>
                    <p className="text-3xl font-black tracking-[0.3em] tabular-nums text-primary">{codigo.codigo}</p>
                    <p className={`mt-0.5 text-xs ${caducado ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                      {caducado ? "Caducado" : `Válido hasta ${formatearExpiracion(codigo.expiraEn)}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-md bg-sky-500/5 p-2.5 text-xs text-muted-foreground">
                  <InfoCircle className="mt-0.5 size-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
                  <div>
                    <strong className="text-foreground">Pasos:</strong> 1. El cliente escanea el QR con su móvil. 2. Dile el código{" "}
                    <strong className="text-primary">{codigo.codigo}</strong> verbalmente. 3. Lo introduce en la pantalla de inicio y
                    accede al formulario. 4. El ID <strong className="text-emerald-600 dark:text-emerald-400">#{codigo.visitaId}</strong>{" "}
                    quedará registrado en la reparación.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* URL de la tablet */}
      <div className="mb-4 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Monitor className="size-4 text-primary" /> URL del formulario para la tablet
        </h2>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase">Abrir esta URL en la tablet</label>
        <div className="flex gap-2">
          <Input readOnly value={url} className="font-mono text-xs" placeholder="Cargando URL..." />
          <Button variant="outline" size="icon" onClick={copiarUrl} title="Copiar" disabled={!url}>
            {copiado ? <TickCircle className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
          </Button>
          <Button variant="outline" className="gap-1.5" disabled={!url} onClick={() => window.open(url, "_blank")}>
            Abrir
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Esta URL sirve el formulario sin necesidad de iniciar sesión. Ponla como página de inicio en el navegador de la tablet.
        </p>
      </div>

      {/* Galería de fotos y firmas recibidas */}
      <div className="mb-4 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Gallery className="size-4 text-primary" /> Fotos y firmas recibidas
        </h2>
        <form
          className="mb-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            buscarArchivos(busquedaArchivos);
          }}
        >
          <div className="relative flex-1">
            <SearchNormal1 className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busquedaArchivos}
              onChange={(e) => setBusquedaArchivos(e.target.value)}
              placeholder="Buscar por nombre o DNI/CIF del cliente..."
              className="pl-8 text-sm"
            />
          </div>
          <Button type="submit" variant="outline" disabled={cargandoArchivos}>
            Buscar
          </Button>
        </form>

        {errorArchivos && (
          <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Error al cargar: {errorArchivos}
          </div>
        )}

        {cargandoArchivos && (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {!cargandoArchivos && archivos && archivos.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Gallery className="size-7 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              {busquedaArchivos ? "Ningún cliente coincide con esa búsqueda." : "Todavía no se ha recibido ninguna foto o firma."}
            </p>
          </div>
        )}

        {!cargandoArchivos && archivos && archivos.length > 0 && (
          <div className="space-y-3">
            {archivos.map((a) => (
              <div key={a.resguardo} className="rounded-lg border p-3">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-primary">#{a.resguardo}</span>
                    <span className="text-sm font-medium">{a.clienteNombre || "—"}</span>
                    {a.dniCif && <span className="text-xs text-muted-foreground">{a.dniCif}</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {a.equipoModelo} · {new Date(a.fechaRecepcion).toLocaleDateString("es-ES")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {a.fotos.map((nombre, i) => {
                    const src = `/api/formulario-cliente/archivo/${encodeURIComponent(nombre)}`;
                    return (
                      <a key={nombre} href={src} target="_blank" rel="noopener noreferrer" title={`Foto ${i + 1}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`Foto ${i + 1} de #${a.resguardo}`} className="size-16 rounded-md border object-cover" />
                      </a>
                    );
                  })}
                  {a.firmaNombre && (
                    <a
                      href={`/api/formulario-cliente/archivo/${encodeURIComponent(a.firmaNombre)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Firma"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/formulario-cliente/archivo/${encodeURIComponent(a.firmaNombre)}`}
                        alt={`Firma de #${a.resguardo}`}
                        className="size-16 rounded-md border bg-white object-contain p-1"
                      />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info: campos y flujo */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <DocumentText className="size-4 text-sky-600 dark:text-sky-400" /> El cliente rellena
          </h3>
          <ul className="space-y-1.5 text-sm">
            <CampoFormulario icono={Personalcard} label="Nombre completo" obligatorio />
            <CampoFormulario icono={Sms} label="Email" />
            <CampoFormulario icono={Call} label="Teléfono" obligatorio />
            <CampoFormulario icono={Monitor} label="Modelo del equipo" obligatorio />
            <CampoFormulario icono={Hashtag} label="Número de serie" />
            <CampoFormulario icono={DocumentText} label="Descripción de la avería" obligatorio />
            <CampoFormulario icono={ShieldTick} label="¿Quiere presupuesto previo?" obligatorio />
          </ul>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <TickCircle className="size-4 text-emerald-600 dark:text-emerald-400" /> Qué ocurre al pulsar &quot;Registrar&quot;
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <AddCircle className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              Se crea la reparación en el sistema con número de resguardo
            </li>
            <li className="flex items-start gap-2">
              <ShieldTick className="mt-0.5 size-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
              Estado: <strong className="text-foreground">Presupuesto Pendiente</strong>
            </li>
            <li className="flex items-start gap-2">
              <Send2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
              Si dio email: recibe confirmación con su número de referencia
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              El formulario se resetea en unos segundos, listo para el siguiente cliente
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function CampoFormulario({ icono: Icono, label, obligatorio }: { icono: typeof Call; label: string; obligatorio?: boolean }) {
  return (
    <li className="flex items-center gap-2 border-b py-1 last:border-0">
      <Icono className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1">{label}</span>
      <span
        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
          obligatorio ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
        }`}
      >
        {obligatorio ? "obligatorio" : "opcional"}
      </span>
    </li>
  );
}
