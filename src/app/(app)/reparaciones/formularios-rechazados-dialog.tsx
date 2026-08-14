"use client";

import { useEffect, useState } from "react";
import { CloseCircle, DocumentText } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { FormularioRechazado } from "@/app/api/formularios-rechazados/route";

function fechaHora(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("es-ES")} ${d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
}

/**
 * Lista de solicitudes de "Formulario Pendiente" rechazadas — capacidad
 * nueva: ni el original ni este puerto exponían en ningún sitio
 * kelatos_app.formularios_rechazados (se guardaba el motivo al rechazar
 * pero nadie podía volver a consultarlo).
 */
export function FormulariosRechazadosDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [formularios, setFormularios] = useState<FormularioRechazado[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setCargando(true);
    setError("");
    fetch("/api/formularios-rechazados")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error || "Error desconocido");
        setFormularios(d.formularios);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error desconocido"))
      .finally(() => setCargando(false));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-3xl" showCloseButton={false}>
        <header className="flex items-center gap-2 rounded-t-xl bg-destructive px-4 py-3 text-white">
          <CloseCircle className="size-4.5 shrink-0" />
          <DialogTitle className="text-sm font-semibold text-white">Formularios Rechazados</DialogTitle>
          <Button variant="ghost" size="icon-sm" className="ml-auto text-white hover:bg-white/15 hover:text-white" onClick={() => onOpenChange(false)}>
            <CloseCircle className="size-4" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {cargando ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-destructive">{error}</p>
          ) : formularios.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed py-8 text-center text-muted-foreground">
              <DocumentText className="size-6 text-muted-foreground/60" />
              <p className="text-sm">No hay formularios rechazados.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {formularios.map((f) => (
                <div key={f.id} className="rounded-xl border bg-card p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">
                      #{f.resguardo} — {f.cliente_nombre || "Sin nombre"}
                    </span>
                    <span className="text-xs text-muted-foreground">{fechaHora(f.fecha)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {f.equipo_modelo || "—"}
                    {f.cliente_telefono && <> · {f.cliente_telefono}</>}
                    {f.cliente_email && <> · {f.cliente_email}</>}
                  </p>
                  <div className="mt-2 rounded-md bg-destructive/10 px-2.5 py-1.5 text-destructive">
                    <strong>Motivo:</strong> {f.motivo || "—"}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">Rechazado por: {f.rechazado_por || "—"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
