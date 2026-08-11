"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  DatosFormularioCliente,
  datosVacios,
  FotoFormulario,
  OPCIONES_TIPO_PRODUCTO,
  SiNo,
  SiNoAVeces,
} from "@/lib/formulario-cliente";
import { categoriaDeCondiciones, CONDICIONES_POR_CATEGORIA } from "@/lib/condiciones-legales";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Personalcard,
  Call,
  Monitor,
  DocumentText,
  ShieldTick,
  Camera,
  Lock,
  TickCircle,
  CloseCircle,
} from "@/lib/icons";

const PASOS = [
  { titulo: "Datos", icono: Personalcard },
  { titulo: "Contacto", icono: Call },
  { titulo: "Equipo", icono: Monitor },
  { titulo: "Síntoma", icono: DocumentText },
  { titulo: "Condiciones", icono: ShieldTick },
  { titulo: "Foto y firma", icono: Camera },
];

/**
 * Chip blanco fijo alrededor del logo (igual que sidebar.tsx): el PNG
 * lleva el texto en azul oscuro sobre transparente, ilegible sobre el
 * degradado de marca en móvil/tablet; en escritorio el chip se funde con
 * el fondo claro, así que el mismo componente sirve en los dos casos.
 */
function EncabezadoLogo() {
  return (
    <header className="mb-4 flex justify-center lg:mb-10 lg:justify-start">
      <span className="flex h-10 items-center rounded-md bg-white px-3 shadow-sm">
        <Image src="/logos/kelatos.png" alt="Kelatos" width={290} height={82} priority className="h-6 w-auto" />
      </span>
    </header>
  );
}

/** Fondo de marca en móvil/tablet (la tarjeta "flota" encima); en escritorio, fondo plano y sin tarjeta — la propia página hace de lienzo, como el resto de la app. */
function FondoPagina({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary/60 p-4 sm:p-6 lg:bg-none lg:bg-background lg:p-10">
      <div className="mx-auto w-full max-w-5xl">
        <EncabezadoLogo />
        {children}
      </div>
    </div>
  );
}

function PuntoEscalon({ completado, actual }: { completado: boolean; actual: boolean }) {
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        completado
          ? "border-primary bg-primary text-primary-foreground"
          : actual
            ? "border-primary bg-primary text-primary-foreground ring-4 ring-primary/20"
            : "border-border bg-background"
      )}
    >
      {completado && <TickCircle className="size-3.5" />}
      {actual && !completado && <span className="size-2 rounded-full bg-primary-foreground" />}
    </span>
  );
}

/** Progreso horizontal — visible por debajo de lg (tablet/móvil): un segmento (Progress de shadcn) por paso, en vez de puntos con líneas conectoras. */
function EscalonHorizontal({ paso }: { paso: number }) {
  return (
    <div className="mb-5 lg:hidden">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span className="text-foreground">
          Paso {paso} de {PASOS.length}
        </span>
        <span>{PASOS[paso - 1].titulo}</span>
      </div>
      <div className="flex gap-1.5">
        {PASOS.map((p, i) => {
          const num = i + 1;
          return <Progress key={p.titulo} value={num <= paso ? 100 : 0} />;
        })}
      </div>
    </div>
  );
}

/** Stepper vertical — barra lateral fija en escritorio (lg+), como el patrón de referencia de onboarding. */
function EscalonVertical({ paso }: { paso: number }) {
  return (
    <nav className="hidden lg:block lg:w-56 lg:shrink-0">
      <ol>
        {PASOS.map((p, i) => {
          const num = i + 1;
          const completado = num < paso;
          const actual = num === paso;
          return (
            <li key={p.titulo} className="flex gap-3">
              <div className="flex flex-col items-center">
                <PuntoEscalon completado={completado} actual={actual} />
                {i < PASOS.length - 1 && <div className={cn("my-1 w-0.5 flex-1 rounded-full", completado ? "bg-primary" : "bg-border")} />}
              </div>
              <span
                className={cn(
                  "pb-8 text-sm",
                  actual ? "font-semibold text-foreground" : completado ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {p.titulo}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Campo({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <Label className="mb-1.5 text-sm font-semibold text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function OpcionBoton({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className={cn("h-12 flex-1 text-sm", activo && "border-primary bg-primary/10 font-semibold text-primary hover:bg-primary/15")}
    >
      {children}
    </Button>
  );
}

export default function FormularioClientePage() {
  // El código de acceso es solo una puerta de entrada (evita que alguien
  // ajeno a la tienda rellene el formulario sin más que la URL) — el
  // envío en sí ya es idempotente por requestId/UUID, así que el
  // visitaId no viaja en el payload, es puramente informativo para el
  // personal (ver formulario-web/page.tsx).
  const [accesoConcedido, setAccesoConcedido] = useState(false);

  const [paso, setPaso] = useState(1);
  const [datos, setDatos] = useState<DatosFormularioCliente>(datosVacios());
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ resguardo: string } | null>(null);
  const [errorEnvio, setErrorEnvio] = useState("");

  if (!accesoConcedido) {
    return <PantallaCodigoAcceso onAcceso={() => setAccesoConcedido(true)} />;
  }

  function actualizar<K extends keyof DatosFormularioCliente>(campo: K, valor: DatosFormularioCliente[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  const esCintas = datos.tipoProducto === "Conversión de cintas";
  const esOtro = datos.tipoProducto === "Otro";
  const categoria = datos.tipoProducto ? categoriaDeCondiciones(datos.tipoProducto) : null;

  function validarPasoActual(): boolean {
    const err: Record<string, string> = {};
    if (paso === 1) {
      if (!datos.dniCif.trim()) err.dniCif = "Introduce tu DNI, NIF, Pasaporte o CIF.";
      if (!datos.nombre.trim()) err.nombre = "Introduce tu nombre o empresa.";
    }
    if (paso === 2) {
      if (!datos.telefono.trim()) err.telefono = "Introduce tu teléfono.";
      if (!datos.noTieneEmail) {
        if (!datos.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) err.email = "Email obligatorio o no válido.";
      }
      if (!datos.viaTipo) err.viaTipo = "Selecciona el tipo de vía.";
      if (!datos.viaNombre.trim()) err.viaNombre = "Introduce el nombre de la vía.";
      if (!datos.cp.trim()) err.cp = "Introduce el código postal.";
      if (!datos.localidad.trim()) err.localidad = "Introduce la localidad.";
      if (!datos.provincia.trim()) err.provincia = "Introduce la provincia.";
    }
    if (paso === 3) {
      if (!datos.tipoProducto) err.tipoProducto = "Selecciona el tipo de producto.";
      if (esOtro && !datos.tipoOtro.trim()) err.tipoOtro = "Describe el tipo de producto.";
      if (!esCintas) {
        if (!datos.marca.trim()) err.marca = "Indica la marca.";
        if (!datos.modelo.trim()) err.modelo = "Indica el modelo.";
      } else if (Object.values(datos.cintas).every((n) => n === 0)) {
        err.cintas = "Indica al menos una cinta.";
      }
    }
    if (paso === 4 && !esCintas) {
      if (!datos.sintoma.trim()) err.sintoma = "Describe la avería.";
      if (!datos.enciende) err.enciende = "Selecciona una opción.";
      if (!datos.golpe) err.golpe = "Selecciona una opción.";
      if (!datos.humedad) err.humedad = "Selecciona una opción.";
      if (!datos.reparacionAnterior) err.reparacionAnterior = "Selecciona una opción.";
    }
    if (paso === 5) {
      if (!datos.aceptaCondiciones) err.aceptaCondiciones = "Debes aceptar las condiciones del servicio.";
    }
    if (paso === 6) {
      if (datos.fotos.length === 0) err.fotos = "Debes adjuntar al menos una foto del equipo.";
      if (!datos.firmaBase64) err.firma = "Debes firmar el resguardo.";
    }
    setErrores(err);
    return Object.keys(err).length === 0;
  }

  function siguiente() {
    if (!validarPasoActual()) return;
    setPaso((p) => Math.min(p + 1, PASOS.length));
  }
  function anterior() {
    setErrores({});
    setPaso((p) => Math.max(p - 1, 1));
  }

  async function enviar() {
    if (!validarPasoActual()) return;
    setEnviando(true);
    setErrorEnvio("");
    try {
      const res = await fetch("/api/formulario-cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No se pudo registrar la solicitud.");
      setResultado({ resguardo: data.resguardo });
    } catch (e) {
      setErrorEnvio(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) {
    return (
      <FondoPagina>
        <div className="mx-auto h-fit w-full max-w-xl rounded-2xl bg-card p-8 shadow-lg lg:mt-16 lg:shadow-sm lg:ring-1 lg:ring-border">
          <div className="flex flex-col items-center py-8 text-center">
            <span className="mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TickCircle className="size-9" />
            </span>
            <h1 className="mb-2 text-lg font-semibold text-emerald-600 dark:text-emerald-400">Solicitud registrada</h1>
            <p className="text-sm text-muted-foreground">
              Nuestro equipo se pondrá en contacto contigo pronto.
              <br />
              <br />
              <strong className="text-primary">Referencia: #{resultado.resguardo}</strong>
            </p>
          </div>
        </div>
      </FondoPagina>
    );
  }

  const pasoActual = PASOS[paso - 1];

  return (
    <FondoPagina>
      <div className="lg:flex lg:items-start lg:gap-12">
        <div className="lg:pt-1">
          <EscalonVertical paso={paso} />
        </div>

        <div className="mx-auto w-full max-w-xl rounded-2xl bg-card p-6 shadow-lg lg:mx-0 lg:max-w-none lg:flex-1 lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
          <EscalonHorizontal paso={paso} />

          <h1 className="mb-5 hidden text-2xl font-semibold lg:block">{pasoActual.titulo}</h1>

          {paso === 1 && (
          <>
            <div className="mb-4 flex items-start gap-2 rounded-md bg-sky-500/5 p-3 text-xs text-sky-700 dark:text-sky-400">
              <DocumentText className="mt-0.5 size-3.5 shrink-0" />
              <span>Estos datos son los que aparecerán en la factura.</span>
            </div>
            <Campo label="DNI / NIF / Pasaporte / CIF" required error={errores.dniCif}>
              <Input className="h-11 text-base" value={datos.dniCif} onChange={(e) => actualizar("dniCif", e.target.value)} />
            </Campo>
            <Campo label="Nombre, apellidos o empresa" required error={errores.nombre}>
              <Input className="h-11 text-base" value={datos.nombre} onChange={(e) => actualizar("nombre", e.target.value)} />
            </Campo>
          </>
        )}

        {paso === 2 && (
          <>
            <Campo label="Teléfono" required error={errores.telefono}>
              <div className="flex gap-2">
                <Select value={datos.telPrefijo} onValueChange={(v) => actualizar("telPrefijo", v || "+34")}>
                  <SelectTrigger className="h-11 w-28 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+34">🇪🇸 +34</SelectItem>
                    <SelectItem value="+33">🇫🇷 +33</SelectItem>
                    <SelectItem value="+351">🇵🇹 +351</SelectItem>
                    <SelectItem value="+44">🇬🇧 +44</SelectItem>
                    <SelectItem value="+1">🇺🇸 +1</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="h-11 flex-1 text-base"
                  value={datos.telefono}
                  onChange={(e) => actualizar("telefono", e.target.value.replace(/[^\d]/g, ""))}
                />
              </div>
            </Campo>
            <Campo label="Email" required={!datos.noTieneEmail} error={errores.email}>
              <Input
                className="mb-2 h-11 text-base"
                type="email"
                value={datos.email}
                disabled={datos.noTieneEmail}
                onChange={(e) => actualizar("email", e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox checked={datos.noTieneEmail} onCheckedChange={(v) => actualizar("noTieneEmail", v === true)} />
                No tiene email
              </label>
            </Campo>
            <div className="flex gap-3">
              <div className="flex-1">
                <Campo label="Tipo de vía" required error={errores.viaTipo}>
                  <Select value={datos.viaTipo} onValueChange={(v) => actualizar("viaTipo", v || "")}>
                    <SelectTrigger className="h-11 w-full text-base">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Calle", "Avenida", "Plaza", "Paseo", "Carretera", "Camino", "Urbanización", "Otra"].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Campo>
              </div>
              <div className="flex-2">
                <Campo label="Nombre de la vía" required error={errores.viaNombre}>
                  <Input className="h-11 text-base" value={datos.viaNombre} onChange={(e) => actualizar("viaNombre", e.target.value)} />
                </Campo>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Campo label="Número / Piso (opcional)">
                  <Input className="h-11 text-base" value={datos.viaNumero} onChange={(e) => actualizar("viaNumero", e.target.value)} />
                </Campo>
              </div>
              <div className="flex-1">
                <Campo label="Código postal" required error={errores.cp}>
                  <Input className="h-11 text-base" value={datos.cp} onChange={(e) => actualizar("cp", e.target.value)} />
                </Campo>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Campo label="Localidad" required error={errores.localidad}>
                  <Input className="h-11 text-base" value={datos.localidad} onChange={(e) => actualizar("localidad", e.target.value)} />
                </Campo>
              </div>
              <div className="flex-1">
                <Campo label="Provincia" required error={errores.provincia}>
                  <Input className="h-11 text-base" value={datos.provincia} onChange={(e) => actualizar("provincia", e.target.value)} />
                </Campo>
              </div>
            </div>
          </>
        )}

        {paso === 3 && (
          <>
            <Campo label="Tipo de producto" required error={errores.tipoProducto}>
              <Select value={datos.tipoProducto} onValueChange={(v) => actualizar("tipoProducto", v || "")}>
                <SelectTrigger className="h-11 w-full text-base">
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  {OPCIONES_TIPO_PRODUCTO.map((g) => (
                    <SelectGroup key={g.grupo}>
                      <SelectLabel>{g.grupo}</SelectLabel>
                      {g.opciones.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            {esOtro && (
              <Campo label="Describe el tipo de producto" required error={errores.tipoOtro}>
                <Input className="h-11 text-base" value={datos.tipoOtro} onChange={(e) => actualizar("tipoOtro", e.target.value)} />
              </Campo>
            )}
            {!esCintas && datos.tipoProducto && (
              <>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Campo label="Marca" required error={errores.marca}>
                      <Input className="h-11 text-base" value={datos.marca} onChange={(e) => actualizar("marca", e.target.value)} />
                    </Campo>
                  </div>
                  <div className="flex-1">
                    <Campo label="Modelo" required error={errores.modelo}>
                      <Input className="h-11 text-base" value={datos.modelo} onChange={(e) => actualizar("modelo", e.target.value)} />
                    </Campo>
                  </div>
                </div>
                <Campo label="Número de serie (opcional — únicamente para portátiles)">
                  <Input className="h-11 text-base" value={datos.serie} onChange={(e) => actualizar("serie", e.target.value)} />
                </Campo>
              </>
            )}
            {esCintas && (
              <Campo label="Indica cuántas cintas tienes de cada tipo" error={errores.cintas}>
                <div className="grid grid-cols-3 gap-2.5">
                  {(Object.keys(datos.cintas) as (keyof typeof datos.cintas)[]).map((k) => (
                    <div key={k}>
                      <Label className="mb-1 text-xs text-muted-foreground uppercase">{k}</Label>
                      <Input
                        type="number"
                        min={0}
                        className="h-11 text-base"
                        value={datos.cintas[k]}
                        onChange={(e) => actualizar("cintas", { ...datos.cintas, [k]: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  ))}
                </div>
              </Campo>
            )}
          </>
        )}

        {paso === 4 && (
          <>
            {esCintas ? (
              <p className="text-sm text-muted-foreground">La digitalización y conversión de cintas no requiere descripción de avería.</p>
            ) : (
              <>
                <Campo label="Describe el síntoma de la avería" required error={errores.sintoma}>
                  <Textarea
                    className="min-h-24 text-base"
                    value={datos.sintoma}
                    onChange={(e) => actualizar("sintoma", e.target.value)}
                    placeholder="Explica qué le ocurre al equipo con el mayor detalle posible…"
                  />
                </Campo>
                <Campo label="Contraseña/PIN del equipo (opcional)">
                  <Input className="h-11 text-base" value={datos.obs} onChange={(e) => actualizar("obs", e.target.value)} />
                </Campo>
                <Campo label="¿El equipo enciende?" required error={errores.enciende}>
                  <div className="flex gap-2">
                    <OpcionBoton activo={datos.enciende === "Sí"} onClick={() => actualizar("enciende", "Sí" as SiNoAVeces)}>
                      Sí
                    </OpcionBoton>
                    <OpcionBoton activo={datos.enciende === "No"} onClick={() => actualizar("enciende", "No" as SiNoAVeces)}>
                      No
                    </OpcionBoton>
                    <OpcionBoton activo={datos.enciende === "A veces"} onClick={() => actualizar("enciende", "A veces" as SiNoAVeces)}>
                      A veces
                    </OpcionBoton>
                  </div>
                </Campo>
                <Campo label="¿Ha sufrido golpe?" required error={errores.golpe}>
                  <div className="flex gap-2">
                    <OpcionBoton activo={datos.golpe === "Sí"} onClick={() => actualizar("golpe", "Sí" as SiNo)}>
                      Sí
                    </OpcionBoton>
                    <OpcionBoton activo={datos.golpe === "No"} onClick={() => actualizar("golpe", "No" as SiNo)}>
                      No
                    </OpcionBoton>
                  </div>
                </Campo>
                <Campo label="¿Ha sufrido humedad?" required error={errores.humedad}>
                  <div className="flex gap-2">
                    <OpcionBoton activo={datos.humedad === "Sí"} onClick={() => actualizar("humedad", "Sí" as SiNo)}>
                      Sí
                    </OpcionBoton>
                    <OpcionBoton activo={datos.humedad === "No"} onClick={() => actualizar("humedad", "No" as SiNo)}>
                      No
                    </OpcionBoton>
                  </div>
                </Campo>
                <Campo label="¿Ha tenido reparación anterior?" required error={errores.reparacionAnterior}>
                  <div className="flex gap-2">
                    <OpcionBoton activo={datos.reparacionAnterior === "Sí"} onClick={() => actualizar("reparacionAnterior", "Sí" as SiNo)}>
                      Sí
                    </OpcionBoton>
                    <OpcionBoton activo={datos.reparacionAnterior === "No"} onClick={() => actualizar("reparacionAnterior", "No" as SiNo)}>
                      No
                    </OpcionBoton>
                  </div>
                </Campo>
              </>
            )}
          </>
        )}

        {paso === 5 && (
          <>
            {categoria && (
              <div className="mb-3 max-h-64 overflow-y-auto rounded-md border p-3 text-xs text-foreground">
                <ol className="list-decimal space-y-2 pl-4">
                  {CONDICIONES_POR_CATEGORIA[categoria].map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ol>
              </div>
            )}
            <label className="mb-1.5 flex items-start gap-2 text-sm">
              <Checkbox
                className="mt-0.5"
                checked={datos.aceptaCondiciones}
                onCheckedChange={(v) => actualizar("aceptaCondiciones", v === true)}
              />
              <span>
                He leído y acepto las condiciones del resguardo de recepción. <span className="text-destructive">*</span>
              </span>
            </label>
            {errores.aceptaCondiciones && <p className="mb-3 text-xs text-destructive">{errores.aceptaCondiciones}</p>}
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <Checkbox
                className="mt-0.5"
                checked={datos.aceptaMarketing}
                onCheckedChange={(v) => actualizar("aceptaMarketing", v === true)}
              />
              <span>Deseo recibir promociones, descuentos y novedades por correo electrónico, WhatsApp u otros medios electrónicos.</span>
            </label>
          </>
        )}

        {paso === 6 && (
          <PasoFotoFirma
            fotos={datos.fotos}
            firmaBase64={datos.firmaBase64}
            errorFotos={errores.fotos}
            errorFirma={errores.firma}
            onFotosChange={(fotos) => actualizar("fotos", fotos)}
            onFirmaChange={(firmaBase64) => actualizar("firmaBase64", firmaBase64)}
          />
        )}

        {errorEnvio && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <CloseCircle className="mt-0.5 size-3.5 shrink-0" />
            <span>{errorEnvio}</span>
          </div>
        )}

          <div className="mt-6 flex justify-between border-t pt-5 lg:border-t-0 lg:pt-8">
            <Button type="button" variant="outline" onClick={anterior} className={cn("h-11 px-5", paso === 1 && "invisible")}>
              ← Anterior
            </Button>
            {paso < PASOS.length ? (
              <Button type="button" onClick={siguiente} className="h-11 px-5">
                Siguiente →
              </Button>
            ) : (
              <Button type="button" onClick={enviar} disabled={enviando} className="h-11 px-5">
                {enviando ? "Enviando…" : "Enviar solicitud"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </FondoPagina>
  );
}

function PasoFotoFirma({
  fotos,
  firmaBase64,
  errorFotos,
  errorFirma,
  onFotosChange,
  onFirmaChange,
}: {
  fotos: FotoFormulario[];
  firmaBase64: string;
  errorFotos?: string;
  errorFirma?: string;
  onFotosChange: (fotos: FotoFormulario[]) => void;
  onFirmaChange: (firmaBase64: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onSeleccionarFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files || []);
    e.target.value = "";
    archivos.forEach((file) => {
      if (fotos.some((f) => f.name === file.name && f.size === file.size)) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        const base64 = dataUrl.split(",")[1] || "";
        if (!base64) return;
        onFotosChange([...fotos, { base64, mime: file.type || "image/jpeg", name: file.name, size: file.size }]);
      };
      reader.readAsDataURL(file);
    });
  }

  function eliminarFoto(i: number) {
    onFotosChange(fotos.filter((_, idx) => idx !== i));
  }

  return (
    <>
      <Campo label="Foto del equipo / problema" required error={errorFotos}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-lg border border-dashed border-input bg-muted/30 px-4 py-6 text-center transition-colors hover:bg-muted/50"
        >
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onSeleccionarFotos} className="hidden" />
          <Camera className="mx-auto mb-1.5 size-7 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            {fotos.length === 0 ? "Toca para hacer o seleccionar una foto" : fotos.length === 1 ? fotos[0].name : `${fotos.length} fotos seleccionadas`}
          </div>
        </button>
        {fotos.length > 0 && (
          <div className="mt-2.5 grid grid-cols-4 gap-2">
            {fotos.map((f, i) => (
              <div key={f.name + f.size} className="relative aspect-square overflow-hidden rounded-md border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`data:${f.mime};base64,${f.base64}`} alt={`foto ${i + 1}`} className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => eliminarFoto(i)}
                  title="Eliminar"
                  className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <CloseCircle className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Campo>

      <Campo label="Firma del cliente" required error={errorFirma}>
        <CanvasFirma value={firmaBase64} onChange={onFirmaChange} />
      </Campo>
    </>
  );
}

function CanvasFirma({ value, onChange }: { value: string; onChange: (base64: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dibujandoRef = useRef(false);
  const tieneTrazoRef = useRef(!!value);
  const [tieneTrazo, setTieneTrazo] = useState(!!value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.offsetWidth) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }, []);

  function posición(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const r = canvas.getBoundingClientRect();
    const punto = "touches" in e ? e.touches[0] : e;
    return { x: punto.clientX - r.left, y: punto.clientY - r.top };
  }

  function iniciar(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    dibujandoRef.current = true;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = posición(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function mover(e: React.MouseEvent | React.TouchEvent) {
    if (!dibujandoRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = posición(e, canvas);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!tieneTrazoRef.current) {
      tieneTrazoRef.current = true;
      setTieneTrazo(true);
    }
  }

  function detener() {
    if (!dibujandoRef.current) return;
    dibujandoRef.current = false;
    const canvas = canvasRef.current;
    if (canvas && tieneTrazoRef.current) {
      onChange(canvas.toDataURL("image/png").split(",")[1] || "");
    }
  }

  function limpiar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    tieneTrazoRef.current = false;
    setTieneTrazo(false);
    onChange("");
  }

  return (
    <div className="relative overflow-hidden rounded-lg border">
      <canvas
        ref={canvasRef}
        className="block h-36 w-full cursor-crosshair touch-none"
        onMouseDown={iniciar}
        onMouseMove={mover}
        onMouseUp={detener}
        onMouseLeave={detener}
        onTouchStart={iniciar}
        onTouchMove={mover}
        onTouchEnd={detener}
      />
      {!tieneTrazo && (
        <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          Firme aquí con el dedo o el ratón
        </span>
      )}
      <Button type="button" variant="outline" size="sm" onClick={limpiar} className="absolute top-2 right-2 bg-card">
        Borrar
      </Button>
    </div>
  );
}

function PantallaCodigoAcceso({ onAcceso }: { onAcceso: () => void }) {
  const [codigo, setCodigo] = useState("");
  const [validando, setValidando] = useState(false);
  const [error, setError] = useState("");

  async function validar(e: React.FormEvent) {
    e.preventDefault();
    if (!codigo.trim()) return;
    setValidando(true);
    setError("");
    try {
      const res = await fetch("/api/formulario-cliente/validar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      const data = await res.json();
      if (!data.ok || !data.valido) throw new Error(data.error || "Código incorrecto.");
      onAcceso();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Error desconocido");
    } finally {
      setValidando(false);
    }
  }

  return (
    <FondoPagina>
      <form onSubmit={validar} className="mx-auto h-fit w-full max-w-sm rounded-2xl bg-card p-8 text-center shadow-lg lg:mt-16 lg:shadow-sm lg:ring-1 lg:ring-border">
        <span className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Lock className="size-7" />
        </span>
        <h1 className="mb-1 text-base font-semibold">Código de acceso</h1>
        <p className="mb-5 text-sm text-muted-foreground">Pide el código de 6 dígitos al personal de la tienda.</p>
        <Input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
          inputMode="numeric"
          autoFocus
          className="h-14 text-center text-2xl font-bold tracking-[0.3em]"
          placeholder="000000"
        />
        {error && (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-sm text-destructive">
            <CloseCircle className="size-3.5" />
            {error}
          </div>
        )}
        <Button type="submit" disabled={validando || codigo.length < 6} className="mt-4 h-11 w-full">
          {validando ? "Comprobando…" : "Continuar"}
        </Button>
      </form>
    </FondoPagina>
  );
}
