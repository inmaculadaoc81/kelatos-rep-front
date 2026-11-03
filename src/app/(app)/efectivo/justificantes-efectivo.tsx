"use client";

import { useRef, useState } from "react";
import { DocumentUpload, CloseCircle } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/confirm-provider";
import { resolverBlobImagen, comprimirImagen } from "@/lib/foto-captura";
import { JustificanteEfectivo, MovimientoEfectivo } from "@/lib/efectivo";
import { toast } from "sonner";

const TAMANO_MAXIMO_PDF = 8 * 1024 * 1024;

function leerComoBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result).split(",")[1] || "");
    lector.onerror = () => reject(new Error("No se pudo leer el archivo"));
    lector.readAsDataURL(file);
  });
}

/** Sube un justificante (PDF o foto) a una retirada ya registrada. Lanza si falla. */
export async function subirJustificante(retiradaId: number, file: File): Promise<JustificanteEfectivo> {
  let base64: string;
  let mimeType: string;
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    if (file.size > TAMANO_MAXIMO_PDF) throw new Error(`"${file.name}" pesa demasiado (máximo 8 MB)`);
    base64 = await leerComoBase64(file);
    mimeType = "application/pdf";
  } else {
    const comprimida = await comprimirImagen(await resolverBlobImagen(file));
    base64 = comprimida.base64;
    mimeType = comprimida.mime;
  }
  const res = await fetch(`/api/efectivo/retiradas/${retiradaId}/justificantes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64, mimeType, nombre: file.name }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Error desconocido");
  return data.justificante as JustificanteEfectivo;
}

/** Ver, añadir y quitar los justificantes (factura o ticket de compra) de una retirada de caja. */
export function JustificantesEfectivoDialog({
  movimiento,
  puedeEditar,
  onOpenChange,
  onCambiado,
}: {
  movimiento: MovimientoEfectivo | null;
  puedeEditar: boolean;
  onOpenChange: (open: boolean) => void;
  onCambiado: () => void;
}) {
  const confirmar = useConfirm();
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [quitando, setQuitando] = useState<number | null>(null);
  const lista = movimiento?.justificantes ?? [];

  async function onSeleccionar(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files || []);
    e.target.value = "";
    if (!archivos.length || movimiento?.retiradaId === undefined) return;
    setSubiendo(true);
    try {
      for (const f of archivos) {
        try {
          await subirJustificante(movimiento.retiradaId, f);
        } catch (err) {
          toast.error(`No se pudo subir "${f.name}": ${err instanceof Error ? err.message : "error desconocido"}`);
        }
      }
      onCambiado();
    } finally {
      setSubiendo(false);
    }
  }

  async function quitar(j: JustificanteEfectivo) {
    const ok = await confirmar("¿Quitar este justificante?", { titulo: "Quitar justificante", detalle: "Se borra también el archivo. No se puede deshacer." });
    if (!ok) return;
    setQuitando(j.id);
    try {
      const res = await fetch(`/api/efectivo/justificantes/${j.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Justificante quitado");
      onCambiado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setQuitando(null);
    }
  }

  return (
    <Dialog open={!!movimiento} onOpenChange={(o) => !subiendo && onOpenChange(o)}>
      <DialogContent className="max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Justificantes de la retirada</DialogTitle>
          <DialogDescription>
            Factura o ticket de compra que sustenta este gasto. Si la retirada es un ingreso en el banco, su sustento es el movimiento bancario.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {lista.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay ningún justificante.</p>}
          {lista.map((j) => (
            <div key={j.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
              <a href={`/api/tpv/archivo/${encodeURIComponent(j.driveFileId)}`} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate underline-offset-2 hover:underline">
                {j.nombre || "Justificante"}
              </a>
              {puedeEditar && (
                <Button size="sm" variant="ghost" className="h-7 text-destructive" disabled={quitando === j.id} onClick={() => quitar(j)} title="Quitar">
                  <CloseCircle className="size-3.5" />
                </Button>
              )}
            </div>
          ))}
          {puedeEditar && (
            <>
              <input ref={entrada} type="file" multiple accept="application/pdf,image/*,.heic,.heif" className="hidden" onChange={onSeleccionar} />
              <Button variant="outline" className="gap-2" disabled={subiendo} onClick={() => entrada.current?.click()}>
                <DocumentUpload className="size-4" /> {subiendo ? "Subiendo…" : "Añadir justificante (PDF o foto)"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
