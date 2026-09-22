"use client";

import { useRef, useState } from "react";
import { Send2, Paperclip2, CloseCircle, Warning2 } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Buzon, tamanoLegible } from "@/lib/mails";

export interface BorradorCorreo {
  buzonId: number | null;
  para: string;
  cc: string;
  asunto: string;
  texto: string;
  /** id del mensaje que se responde (para encadenar la conversación). */
  respondeA: number | null;
  /** Solo para el título del diálogo — un reenvío no encadena (respondeA
      va null, igual que un correo nuevo), así que hace falta distinguirlo. */
  esReenvio?: boolean;
}

interface AdjuntoNuevo {
  nombre: string;
  tipo: string;
  tamano: number;
  base64: string;
}

const MAX_ADJUNTOS = 5;
// El backend admite 8 MB; aquí se deja un margen porque el archivo viaja en base64 (+33 %).
const MAX_BYTES = 4 * 1024 * 1024;

function leerBase64(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error(`No se pudo leer "${archivo.name}"`));
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.readAsDataURL(archivo);
  });
}

/**
 * Redactar un correo nuevo o responder a uno. Se envía por SMTP con el buzón
 * elegido (solo superadmin, comprobado también en el backend). Texto plano,
 * con adjuntos opcionales (hasta 5 y 4 MB en total).
 */
export function RedactarDialog({
  buzones,
  borrador,
  open,
  onOpenChange,
  onEnviado,
}: {
  buzones: Buzon[];
  borrador: BorradorCorreo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnviado: () => void;
}) {
  const activos = buzones.filter((b) => b.activo);
  const [f, setF] = useState<BorradorCorreo>({ ...borrador, buzonId: borrador.buzonId ?? activos[0]?.id ?? null });
  const [adjuntos, setAdjuntos] = useState<AdjuntoNuevo[]>([]);
  const [enviando, setEnviando] = useState(false);
  // Direcciones que ya rebotaron: el backend avisa y hace falta confirmar para enviar igualmente.
  const [rebotadas, setRebotadas] = useState<string | null>(null);
  const [forzar, setForzar] = useState(false);
  const inputArchivo = useRef<HTMLInputElement>(null);
  const esRespuesta = borrador.respondeA !== null;
  const esReenvio = borrador.esReenvio === true;

  function set<K extends keyof BorradorCorreo>(campo: K, valor: BorradorCorreo[K]) {
    setF((prev) => ({ ...prev, [campo]: valor }));
    if (campo === "para" || campo === "cc") {
      setRebotadas(null);
      setForzar(false);
    }
  }

  async function elegirArchivos(lista: FileList | null) {
    if (!lista?.length) return;
    try {
      const nuevos: AdjuntoNuevo[] = [];
      let total = adjuntos.reduce((a, x) => a + x.tamano, 0);
      for (const archivo of Array.from(lista)) {
        if (adjuntos.length + nuevos.length >= MAX_ADJUNTOS) {
          toast.error(`Máximo ${MAX_ADJUNTOS} adjuntos`);
          break;
        }
        if (total + archivo.size > MAX_BYTES) {
          toast.error(`"${archivo.name}" no cabe: los adjuntos no pueden pasar de ${tamanoLegible(MAX_BYTES)} en total`);
          continue;
        }
        total += archivo.size;
        nuevos.push({ nombre: archivo.name, tipo: archivo.type || "application/octet-stream", tamano: archivo.size, base64: await leerBase64(archivo) });
      }
      if (nuevos.length) setAdjuntos((prev) => [...prev, ...nuevos]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo leer el archivo");
    } finally {
      if (inputArchivo.current) inputArchivo.current.value = "";
    }
  }

  async function enviar() {
    if (!f.buzonId) return toast.error("Elige el buzón desde el que enviar");
    if (!f.para.trim()) return toast.error("Indica al menos un destinatario");
    if (!f.asunto.trim()) return toast.error("Escribe el asunto");
    if (!f.texto.trim()) return toast.error("Escribe el mensaje");
    setEnviando(true);
    try {
      const res = await fetch("/api/mails/mensajes/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buzonId: f.buzonId,
          para: f.para,
          cc: f.cc,
          asunto: f.asunto,
          texto: f.texto,
          respondeA: f.respondeA,
          adjuntos: adjuntos.map(({ nombre, tipo, base64 }) => ({ nombre, tipo, base64 })),
          forzar,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(esRespuesta ? "Respuesta enviada" : "Correo enviado");
      if (data.rechazados?.length) toast.warning(`El servidor rechazó: ${(data.rechazados as string[]).join(", ")}`);
      if (data.aviso) toast.warning(data.aviso);
      onOpenChange(false);
      onEnviado();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      if (msg.startsWith("Direcciones que rebotaron")) setRebotadas(msg.replace(/^Direcciones que rebotaron antes y no existen:\s*/, ""));
      else toast.error(msg);
    } finally {
      setEnviando(false);
    }
  }

  const buzonElegido = activos.find((b) => b.id === f.buzonId);

  return (
    <Dialog open={open} onOpenChange={(o) => !enviando && onOpenChange(o)}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto sm:max-w-2xl" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send2 className="size-5" /> {esRespuesta ? "Responder" : esReenvio ? "Reenviar" : "Nuevo correo"}
          </DialogTitle>
          <DialogDescription>
            Se envía por SMTP desde el buzón elegido, como texto sin formato. Los enviados quedan en la carpeta Enviados.
            {esReenvio && " Los adjuntos originales no se incluyen: descárgalos y vuelve a adjuntarlos si hacen falta."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Desde *</Label>
            <Select value={f.buzonId ? String(f.buzonId) : ""} onValueChange={(v) => set("buzonId", v ? Number(v) : null)}>
              <SelectTrigger className="w-full">
                <SelectValue>{() => (buzonElegido ? `${buzonElegido.nombre} <${buzonElegido.email}>` : "Elige un buzón…")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {activos.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.nombre} &lt;{b.email}&gt;
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rcPara">Para *</Label>
              <Input id="rcPara" placeholder="correo@ejemplo.com (varios separados por coma)" value={f.para} onChange={(e) => set("para", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rcCc">CC</Label>
              <Input id="rcCc" value={f.cc} onChange={(e) => set("cc", e.target.value)} />
            </div>
          </div>
          {rebotadas && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
              <Warning2 className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-1.5">
                <p>
                  Estas direcciones ya rebotaron y no existen: <strong>{rebotadas}</strong>. Quítalas o confirma que quieres enviar igualmente.
                </p>
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input type="checkbox" className="size-3.5" checked={forzar} onChange={(e) => setForzar(e.target.checked)} />
                  Enviar igualmente
                </label>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="rcAsunto">Asunto *</Label>
            <Input id="rcAsunto" maxLength={300} value={f.asunto} onChange={(e) => set("asunto", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rcTexto">Mensaje *</Label>
            <Textarea id="rcTexto" rows={11} className="font-sans" value={f.texto} onChange={(e) => set("texto", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <input ref={inputArchivo} type="file" multiple className="hidden" onChange={(e) => elegirArchivos(e.target.files)} />
              <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={adjuntos.length >= MAX_ADJUNTOS} onClick={() => inputArchivo.current?.click()}>
                <Paperclip2 className="size-4" /> Adjuntar archivos
              </Button>
              <span className="text-xs text-muted-foreground">Hasta {MAX_ADJUNTOS} archivos y {tamanoLegible(MAX_BYTES)} en total</span>
            </div>
            {adjuntos.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {adjuntos.map((a, i) => (
                  <li key={`${a.nombre}-${i}`} className="inline-flex items-center gap-1.5 rounded bg-muted px-2 py-1 text-xs">
                    {a.nombre} <span className="text-muted-foreground">· {tamanoLegible(a.tamano)}</span>
                    <button type="button" aria-label={`Quitar ${a.nombre}`} className="text-muted-foreground hover:text-destructive" onClick={() => setAdjuntos((prev) => prev.filter((_, j) => j !== i))}>
                      <CloseCircle className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={enviando} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className="gap-1.5" disabled={enviando || !activos.length || (!!rebotadas && !forzar)} onClick={enviar}>
            <Send2 className="size-4" /> {enviando ? "Enviando…" : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
