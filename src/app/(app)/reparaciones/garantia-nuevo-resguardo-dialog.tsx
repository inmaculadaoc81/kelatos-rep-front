"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldTick } from "@/lib/icons";
import { Camera, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatearFecha } from "@/lib/dias-entrega";
import { esHeic, resolverBlobImagen, comprimirImagen } from "@/lib/foto-captura";
import { imprimirEtiquetaResguardo } from "@/lib/imprimir-etiqueta";
import type { ReparacionDetalle } from "@/lib/reparacion-detalle";

const MAX_FOTOS = 8;

interface FotoNueva { base64: string; mime: string; name: string }

interface DatosGarantia {
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail: string;
  dniCif: string;
  direccionEnvio: string;
  equipoModelo: string;
  sintoma: string;
  dejaCargador: "" | "si" | "no";
  tipoRecepcion: "LOCAL" | "ENVIO";
}

function desdeDetalle(d: ReparacionDetalle): DatosGarantia {
  return {
    clienteNombre: d.cliente.nombre,
    clienteTelefono: d.cliente.telefono,
    clienteEmail: d.cliente.email,
    dniCif: d.dniCif,
    direccionEnvio: d.cliente.direccion,
    equipoModelo: d.equipo.modelo,
    sintoma: "",
    dejaCargador: "",
    tipoRecepcion: "LOCAL",
  };
}

function Segmento<T extends string>({ valor, opciones, onCambiar }: { valor: T; opciones: { valor: T; etiqueta: string }[]; onCambiar: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg border bg-card p-0.5">
      {opciones.map((o) => (
        <Button key={o.valor} type="button" size="sm" variant={valor === o.valor ? "default" : "ghost"} className="h-7 px-3 text-xs" onClick={() => onCambiar(o.valor)}>
          {o.etiqueta}
        </Button>
      ))}
    </div>
  );
}

/**
 * "Nuevo resguardo en garantía": abre desde una reparación ya hecha (equipo que vuelve mal reparado) un resguardo nuevo
 * con los datos del cliente y del equipo ya cargados, para no volver a rellenar el formulario. Se describe el problema
 * y se pueden añadir fotos nuevas del equipo. El resguardo nace en estado "Garantía" y enlaza con el original.
 */
interface PropsGarantia {
  detalle: ReparacionDetalle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama con el resguardo nuevo, tras crearlo. */
  onCreado?: (resguardoNuevo: string) => void;
}

export function GarantiaNuevoResguardoDialog(props: PropsGarantia) {
  // El formulario solo existe mientras está abierto: así cada apertura parte de los datos actuales de la reparación,
  // sin fotos ni texto de una apertura anterior (sin efectos que reinicien el estado).
  if (!props.open) return null;
  return <ContenidoGarantia {...props} />;
}

function ContenidoGarantia({ detalle, open, onOpenChange, onCreado }: PropsGarantia) {
  const router = useRouter();
  const [datos, setDatos] = useState<DatosGarantia>(() => desdeDetalle(detalle));
  const [fotos, setFotos] = useState<FotoNueva[]>([]);
  const [procesandoFotos, setProcesandoFotos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const inputFotos = useRef<HTMLInputElement>(null);

  function actualizar<K extends keyof DatosGarantia>(campo: K, valor: DatosGarantia[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  async function añadirFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files || []);
    e.target.value = "";
    if (archivos.length === 0) return;
    if (fotos.length + archivos.length > MAX_FOTOS) { toast.error(`Máximo ${MAX_FOTOS} fotos`); return; }
    setProcesandoFotos(true);
    const nuevas: FotoNueva[] = [];
    // Una a una: procesar varias fotos grandes a la vez puede ir lento en un PC modesto.
    for (const file of archivos) {
      try {
        const blob = esHeic(file) ? await resolverBlobImagen(file) : file;
        const { base64, mime } = await comprimirImagen(blob);
        nuevas.push({ base64, mime, name: file.name });
      } catch {
        toast.error(`No se pudo procesar «${file.name}»`);
      }
    }
    setFotos((prev) => [...prev, ...nuevas]);
    setProcesandoFotos(false);
  }

  async function crear() {
    if (!datos.clienteNombre.trim()) return toast.error("El nombre del cliente es obligatorio");
    if (!datos.equipoModelo.trim()) return toast.error("El modelo del equipo es obligatorio");
    if (!datos.sintoma.trim()) return toast.error("Describe el problema por el que vuelve el equipo");

    setEnviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${encodeURIComponent(detalle.resguardo)}/garantia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...datos, fotos: fotos.map((f) => ({ base64: f.base64, mime: f.mime })) }),
      });
      const data = await res.json().catch(() => ({ ok: false, error: "Respuesta no válida del servidor" }));
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Resguardo ${data.resguardo} creado en garantía`);
      if (fotos.length > 0 && data.fotosSubidas === false) toast.warning("El resguardo se creó, pero no se pudieron guardar las fotos: vuelve a subirlas más tarde");
      // Etiqueta física del resguardo nuevo, como en "Nueva Reparación": si el puente de impresión no está en este PC, no pasa nada.
      imprimirEtiquetaResguardo(data.resguardo);
      onOpenChange(false);
      onCreado?.(data.resguardo);
      router.push(`/reparaciones?resguardo=${encodeURIComponent(data.resguardo)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!enviando) onOpenChange(o); }}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto sm:max-w-2xl" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldTick className="size-5" /> Nuevo resguardo en garantía</DialogTitle>
          <DialogDescription>
            Del resguardo {detalle.resguardo}{detalle.fechaEntrega ? `, entregado el ${formatearFecha(detalle.fechaEntrega)}` : ""}. Los datos ya están cargados: revísalos, describe el problema y añade fotos si hace falta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="gaNombre">Cliente *</Label>
              <Input id="gaNombre" value={datos.clienteNombre} onChange={(e) => actualizar("clienteNombre", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gaTel">Teléfono</Label>
              <Input id="gaTel" value={datos.clienteTelefono} onChange={(e) => actualizar("clienteTelefono", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gaEmail">Email</Label>
              <Input id="gaEmail" type="email" value={datos.clienteEmail} onChange={(e) => actualizar("clienteEmail", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gaDni">DNI / CIF</Label>
              <Input id="gaDni" value={datos.dniCif} onChange={(e) => actualizar("dniCif", e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="gaDir">Dirección</Label>
              <Textarea id="gaDir" rows={2} value={datos.direccionEnvio} onChange={(e) => actualizar("direccionEnvio", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gaEquipo">Equipo *</Label>
            <Input id="gaEquipo" value={datos.equipoModelo} onChange={(e) => actualizar("equipoModelo", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gaSintoma">¿Qué le pasa ahora? *</Label>
            <Textarea id="gaSintoma" rows={3} placeholder="Describe el problema por el que el equipo vuelve en garantía…" value={datos.sintoma} onChange={(e) => actualizar("sintoma", e.target.value)} />
            {detalle.equipo.sintoma && (
              <p className="text-xs text-muted-foreground">Síntoma de la reparación original: {detalle.equipo.sintoma}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Recepción</Label>
              <Segmento valor={datos.tipoRecepcion} onCambiar={(v) => actualizar("tipoRecepcion", v)} opciones={[{ valor: "LOCAL", etiqueta: "En el local" }, { valor: "ENVIO", etiqueta: "Por envío" }]} />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">¿Deja cargador?</Label>
              <Segmento valor={datos.dejaCargador} onCambiar={(v) => actualizar("dejaCargador", v)} opciones={[{ valor: "", etiqueta: "—" }, { valor: "si", etiqueta: "Sí" }, { valor: "no", etiqueta: "No" }]} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Fotos del equipo (nuevas)</Label>
              <span className="text-xs text-muted-foreground">{fotos.length}/{MAX_FOTOS}</span>
            </div>
            <input ref={inputFotos} type="file" accept="image/*,.heic,.heif" multiple className="hidden" onChange={añadirFotos} />
            <div className="flex flex-wrap gap-2">
              {fotos.map((f, i) => (
                <div key={`${f.name}-${i}`} className="relative size-20 overflow-hidden rounded-md border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`data:${f.mime};base64,${f.base64}`} alt={f.name} className="size-full object-cover" />
                  <button
                    type="button"
                    aria-label={`Quitar ${f.name}`}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                    onClick={() => setFotos((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {fotos.length < MAX_FOTOS && (
                <button
                  type="button"
                  disabled={procesandoFotos}
                  onClick={() => inputFotos.current?.click()}
                  className="flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-muted disabled:opacity-60"
                >
                  <Camera className="size-5" />
                  {procesandoFotos ? "Procesando…" : "Añadir"}
                </button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={enviando} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={enviando || procesandoFotos} onClick={crear} className="gap-1.5">
            <ShieldTick className="size-4" /> {enviando ? "Creando…" : "Crear resguardo en garantía"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
