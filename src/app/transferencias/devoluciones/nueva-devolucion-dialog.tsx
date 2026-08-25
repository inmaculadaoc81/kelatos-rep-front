"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TickCircle } from "@/lib/icons";

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
  const [motivo, setMotivo] = useState("");
  const [motivoDetalle, setMotivoDetalle] = useState("");
  const [numeroCuenta, setNumeroCuenta] = useState("");
  const [banco, setBanco] = useState("");
  const [nombreBeneficiario, setNombreBeneficiario] = useState("");
  const [fotos, setFotos] = useState<{ base64: string; mime: string }[]>([]);
  const [enviando, setEnviando] = useState(false);

  function reiniciar() {
    setNombreCliente(""); setEmail(""); setTelefono(""); setImporte(""); setMotivo(""); setMotivoDetalle("");
    setNumeroCuenta(""); setBanco(""); setNombreBeneficiario(""); setFotos([]);
  }

  async function onSeleccionarFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files || []);
    e.target.value = "";
    const nuevas = await Promise.all(archivos.map(leerComoBase64));
    setFotos((prev) => [...prev, ...nuevas]);
  }

  async function guardar() {
    if (!nombreCliente.trim()) return toast.error("El nombre del cliente es obligatorio");
    if (!importe || Number(importe) <= 0) return toast.error("El importe debe ser mayor que 0");

    setEnviando(true);
    try {
      const res = await fetch("/api/devoluciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreCliente, email, telefono, importe: Number(importe), motivo, motivoDetalle,
          numeroCuenta, banco, nombreBeneficiario, fotos,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva devolución</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label>Nombre del cliente *</Label>
            <Input value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Importe (€) *</Label>
            <Input type="number" step="0.01" value={importe} onChange={(e) => setImporte(e.target.value)} />
          </div>
          <div>
            <Label>Motivo</Label>
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. Reparación no realizada" />
          </div>
          <div>
            <Label>Detalle del motivo</Label>
            <Textarea rows={2} value={motivoDetalle} onChange={(e) => setMotivoDetalle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cuenta destino (IBAN)</Label>
              <Input value={numeroCuenta} onChange={(e) => setNumeroCuenta(e.target.value)} />
            </div>
            <div>
              <Label>Banco</Label>
              <Input value={banco} onChange={(e) => setBanco(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Nombre del beneficiario</Label>
            <Input value={nombreBeneficiario} onChange={(e) => setNombreBeneficiario(e.target.value)} />
          </div>
          <div>
            <Label>Fotos / comprobantes</Label>
            <Input type="file" accept="image/*,application/pdf" multiple onChange={onSeleccionarFotos} />
            {fotos.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{fotos.length} archivo(s) adjunto(s)</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={enviando}>Cancelar</Button>
          <Button className="gap-1.5" onClick={guardar} disabled={enviando}>
            <TickCircle className="size-4" /> {enviando ? "Guardando..." : "Registrar devolución"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
