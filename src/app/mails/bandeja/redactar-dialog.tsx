"use client";

import { useState } from "react";
import { Send2 } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { Buzon } from "@/lib/mails";

export interface BorradorCorreo {
  buzonId: number | null;
  para: string;
  cc: string;
  asunto: string;
  texto: string;
  /** id del mensaje que se responde (para encadenar la conversación). */
  respondeA: number | null;
}

/**
 * Redactar un correo nuevo o responder a uno. Se envía por SMTP con el buzón
 * elegido (solo superadmin, comprobado también en el backend). Texto plano.
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
  const [enviando, setEnviando] = useState(false);
  const esRespuesta = borrador.respondeA !== null;

  function set<K extends keyof BorradorCorreo>(campo: K, valor: BorradorCorreo[K]) {
    setF((prev) => ({ ...prev, [campo]: valor }));
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
        body: JSON.stringify({ buzonId: f.buzonId, para: f.para, cc: f.cc, asunto: f.asunto, texto: f.texto, respondeA: f.respondeA }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(esRespuesta ? "Respuesta enviada" : "Correo enviado");
      if (data.rechazados?.length) toast.warning(`El servidor rechazó: ${(data.rechazados as string[]).join(", ")}`);
      if (data.aviso) toast.warning(data.aviso);
      onOpenChange(false);
      onEnviado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
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
            <Send2 className="size-5" /> {esRespuesta ? "Responder" : "Nuevo correo"}
          </DialogTitle>
          <DialogDescription>Se envía por SMTP desde el buzón elegido, como texto sin formato. Los enviados quedan en la pestaña Enviados.</DialogDescription>
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
          <div className="space-y-1.5">
            <Label htmlFor="rcAsunto">Asunto *</Label>
            <Input id="rcAsunto" maxLength={300} value={f.asunto} onChange={(e) => set("asunto", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rcTexto">Mensaje *</Label>
            <Textarea id="rcTexto" rows={12} className="font-sans" value={f.texto} onChange={(e) => set("texto", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={enviando} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className="gap-1.5" disabled={enviando || !activos.length} onClick={enviar}>
            <Send2 className="size-4" /> {enviando ? "Enviando…" : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
