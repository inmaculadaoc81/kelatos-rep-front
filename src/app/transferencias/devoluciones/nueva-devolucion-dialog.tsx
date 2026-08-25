"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft2, Personalcard, Tag, Bank, Message, DocumentUpload, TickCircle } from "@/lib/icons";

// Puerto fiel del modal "Nueva devolución" de Transferencias-2 (index.html):
// mismas secciones, mismo motivo de radio de 5 opciones fijas + "Otro" con
// detalle libre, mismo selector de país con opción "Otro" -> texto libre.
const MOTIVOS = ["Dev Fianza", "Dev Garantía", "Depósito Errado", "Exceso de Transferencia", "Otro"] as const;

const PAISES = [
  { value: "España", label: "🇪🇸 España" },
  { value: "Peru", label: "🇵🇪 Perú" },
  { value: "Mexico", label: "🇲🇽 México" },
  { value: "Colombia", label: "🇨🇴 Colombia" },
  { value: "Argentina", label: "🇦🇷 Argentina" },
  { value: "Chile", label: "🇨🇱 Chile" },
  { value: "Ecuador", label: "🇪🇨 Ecuador" },
  { value: "Bolivia", label: "🇧🇴 Bolivia" },
  { value: "Venezuela", label: "🇻🇪 Venezuela" },
  { value: "Uruguay", label: "🇺🇾 Uruguay" },
  { value: "Paraguay", label: "🇵🇾 Paraguay" },
  { value: "Francia", label: "🇫🇷 Francia" },
  { value: "Alemania", label: "🇩🇪 Alemania" },
  { value: "Italia", label: "🇮🇹 Italia" },
  { value: "Portugal", label: "🇵🇹 Portugal" },
  { value: "Otro", label: "✏️ Otro..." },
];

function leerComoBase64(file: File): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve({ base64: dataUrl.split(",")[1] || "", mime: file.type || "image/jpeg" });
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

function SeccionTitulo({ icon: Icono, children }: { icon: typeof Bank; children: React.ReactNode }) {
  return (
    <div className="mt-4 mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase first:mt-0">
      <Icono className="size-3.5" /> {children}
    </div>
  );
}

export function NuevaDevolucionDialog({
  open,
  onOpenChange,
  onCreada,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreada: () => void;
}) {
  const [nombreCliente, setNombreCliente] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [importe, setImporte] = useState("");
  const [motivo, setMotivo] = useState<string>("");
  const [motivoDetalle, setMotivoDetalle] = useState("");
  const [numeroCuenta, setNumeroCuenta] = useState("");
  const [banco, setBanco] = useState("");
  const [nombreBeneficiario, setNombreBeneficiario] = useState("");
  const [paisSelect, setPaisSelect] = useState("España");
  const [paisOtro, setPaisOtro] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [fotos, setFotos] = useState<{ base64: string; mime: string; nombre: string }[]>([]);
  const [enviando, setEnviando] = useState(false);

  function reiniciar() {
    setNombreCliente(""); setEmail(""); setTelefono(""); setImporte(""); setMotivo(""); setMotivoDetalle("");
    setNumeroCuenta(""); setBanco(""); setNombreBeneficiario(""); setPaisSelect("España"); setPaisOtro("");
    setComentarios(""); setFotos([]);
  }

  async function onSeleccionarFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files || []);
    e.target.value = "";
    const nuevas = await Promise.all(archivos.map(async (f) => ({ ...(await leerComoBase64(f)), nombre: f.name })));
    setFotos((prev) => [...prev, ...nuevas]);
  }

  async function guardar() {
    if (!nombreCliente.trim()) return toast.error("El nombre del cliente es obligatorio");
    if (!importe || Number(importe) <= 0) return toast.error("El importe debe ser mayor que 0");
    if (!motivo) return toast.error("Selecciona el motivo de la devolución");
    if (motivo === "Otro" && !motivoDetalle.trim()) return toast.error("Especifica el motivo");
    if (!numeroCuenta.trim()) return toast.error("El número de cuenta es obligatorio");
    if (!nombreBeneficiario.trim()) return toast.error("El nombre del beneficiario es obligatorio");

    const pais = paisSelect === "Otro" ? paisOtro.trim() || "Otro" : paisSelect;

    setEnviando(true);
    try {
      const res = await fetch("/api/devoluciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreCliente, email, telefono, importe: Number(importe), motivo,
          motivoDetalle: motivo === "Otro" ? motivoDetalle.trim() : "",
          numeroCuenta, banco, nombreBeneficiario, pais, comentarios,
          fotos: fotos.map(({ base64, mime }) => ({ base64, mime })),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Devolución #${data.id} registrada`);
      reiniciar();
      onOpenChange(false);
      onCreada();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!enviando) { if (!o) reiniciar(); onOpenChange(o); } }}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
              <ArrowLeft2 className="size-4" />
            </span>
            Nueva devolución
          </DialogTitle>
        </DialogHeader>

        <div>
          <SeccionTitulo icon={Personalcard}>Datos del cliente</SeccionTitulo>
          <div className="grid gap-3">
            <div>
              <Label>Nombre del cliente *</Label>
              <Input value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} placeholder="Nombre completo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" />
              </div>
              <div>
                <Label>Teléfono <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+34 600 000 000" />
              </div>
            </div>
            <div>
              <Label>Importe *</Label>
              <div className="relative">
                <Input type="number" step="0.01" min="0" value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="0.00" className="pr-8" />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">€</span>
              </div>
            </div>
          </div>

          <SeccionTitulo icon={Tag}>Motivo de la devolución *</SeccionTitulo>
          <RadioGroup value={motivo} onValueChange={setMotivo} className="flex flex-col gap-2">
            {MOTIVOS.map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm">
                <RadioGroupItem value={m} />
                {m}
              </label>
            ))}
          </RadioGroup>
          {motivo === "Otro" && (
            <Input className="mt-2" value={motivoDetalle} onChange={(e) => setMotivoDetalle(e.target.value)} placeholder="Especifica el motivo..." />
          )}

          <SeccionTitulo icon={Bank}>Datos bancarios</SeccionTitulo>
          <div className="grid gap-3">
            <div>
              <Label>Número de cuenta *</Label>
              <Input value={numeroCuenta} onChange={(e) => setNumeroCuenta(e.target.value)} placeholder="ES00 0000 0000 0000 0000 0000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Banco <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                <Input value={banco} onChange={(e) => setBanco(e.target.value)} placeholder="Nombre del banco" />
              </div>
              <div>
                <Label>Nombre beneficiario *</Label>
                <Input value={nombreBeneficiario} onChange={(e) => setNombreBeneficiario(e.target.value)} placeholder="Titular de la cuenta" />
              </div>
            </div>
            <div>
              <Label>País de destino</Label>
              <div className="flex gap-2">
                <Select value={paisSelect} onValueChange={(v) => v && setPaisSelect(v)}>
                  <SelectTrigger className="max-w-50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAISES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {paisSelect === "Otro" && (
                  <Input className="flex-1" value={paisOtro} onChange={(e) => setPaisOtro(e.target.value)} placeholder="Escribe el país" />
                )}
              </div>
            </div>
          </div>

          <SeccionTitulo icon={Message}>Comentarios <span className="font-normal normal-case text-muted-foreground">(opcional)</span></SeccionTitulo>
          <Textarea rows={2} value={comentarios} onChange={(e) => setComentarios(e.target.value)} placeholder="Notas adicionales sobre esta devolución..." />

          <SeccionTitulo icon={DocumentUpload}>Adjuntar comprobantes <span className="font-normal normal-case text-muted-foreground">(opcional)</span></SeccionTitulo>
          <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed p-5 text-center hover:bg-muted/50">
            <DocumentUpload className="size-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Haz clic para seleccionar imágenes o PDFs</span>
            <span className="text-[11px] text-muted-foreground/70">JPG, PNG, PDF — múltiples archivos permitidos</span>
            <input type="file" accept="image/*,.pdf" multiple className="hidden" onChange={onSeleccionarFotos} />
          </label>
          {fotos.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {fotos.map((f, i) => <li key={i}>{f.nombre}</li>)}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={enviando}>Cancelar</Button>
          <Button className="gap-1.5 bg-violet-600 text-white hover:bg-violet-700" onClick={guardar} disabled={enviando}>
            <TickCircle className="size-4" /> {enviando ? "Guardando..." : "Guardar devolución"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
