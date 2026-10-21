"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ORIGENES, type Origen } from "@/lib/crm";

const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm";

/** Alta manual de un lead (llamada que entra, alguien que pasa por la tienda…). Si el teléfono ya existe, avisa y ofrece abrir esa ficha. */
export function NuevoLeadDialog({ onCerrar, onCreado, onAbrir }: { onCerrar: () => void; onCreado: (id: number) => void; onAbrir: (id: number) => void }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [origen, setOrigen] = useState<Origen>("llamada");
  const [valor, setValor] = useState("");
  const [accion, setAccion] = useState("");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [existente, setExistente] = useState<{ id: number; nombre: string } | null>(null);

  async function guardar() {
    if (!nombre.trim()) { toast.error("Escribe el nombre"); return; }
    if (!telefono.trim() && !email.trim()) { toast.error("Indica al menos un teléfono o un correo"); return; }
    setGuardando(true);
    setExistente(null);
    try {
      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, telefono, email, origen, valor_estimado: valor, proxima_accion: accion, notas }),
      });
      const data = await res.json();
      if (!data.ok) {
        // El servidor avisa «Ya existe un lead con ese teléfono»: se busca su ficha para ofrecer abrirla.
        if (String(data.error || "").startsWith("Ya existe") && telefono.trim()) {
          const r = await fetch(`/api/crm/leads?q=${encodeURIComponent(telefono.trim())}`, { cache: "no-store" }).then((x) => x.json()).catch(() => null);
          const encontrado = r?.ok ? (r.leads as { id: number; nombre: string }[])[0] : null;
          if (encontrado) setExistente({ id: encontrado.id, nombre: encontrado.nombre });
        }
        throw new Error(data.error || "Error desconocido");
      }
      toast.success("Lead creado");
      onCreado(data.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !guardando) onCerrar(); }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo lead</DialogTitle>
          <DialogDescription>Una persona que ha contactado y todavía no es cliente. Si ya existe con ese teléfono, te lo avisamos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="nlNombre">Nombre *</Label>
            <Input id="nlNombre" value={nombre} maxLength={160} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nlTel">Teléfono</Label>
              <Input id="nlTel" value={telefono} maxLength={40} placeholder="+34 600 000 000" onChange={(e) => setTelefono(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nlMail">Correo</Label>
              <Input id="nlMail" type="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nlOrigen">Cómo contactó</Label>
              <select id="nlOrigen" className={SELECT} value={origen} onChange={(e) => setOrigen(e.target.value as Origen)}>
                {ORIGENES.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nlValor">Valor estimado (€)</Label>
              <Input id="nlValor" type="number" min={0} value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nlAccion">Próxima acción</Label>
            <Input id="nlAccion" value={accion} maxLength={200} placeholder="Ej.: llamarle mañana por la mañana" onChange={(e) => setAccion(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nlNotas">Notas</Label>
            <Textarea id="nlNotas" rows={3} maxLength={5000} value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
          {existente && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Ya existe <strong>{existente.nombre}</strong> con ese teléfono.{" "}
              <button type="button" className="font-medium underline" onClick={() => onAbrir(existente.id)}>Abrir su ficha</button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={guardando} onClick={onCerrar}>Cancelar</Button>
          <Button disabled={guardando} onClick={guardar}>{guardando ? "Guardando…" : "Crear lead"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
