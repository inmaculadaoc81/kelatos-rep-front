"use client";

import { useState } from "react";
import { Warning2, Danger, Lock, ArrowRight2 } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const PALABRA_CONFIRMACION = "RESTAURAR";

/**
 * Flujo de dos pasos para restaurar un backup — acción real y destructiva
 * (sustituye la base de datos completa), así que no basta un solo clic:
 *
 *  Paso 1 — explica exactamente qué archivo se va a restaurar y qué
 *  pasará, y exige escribir literalmente "RESTAURAR" para continuar.
 *  Paso 2 — pide la clave de confirmación; solo el backend la valida
 *  (nunca se compara en el navegador).
 *
 * El backend, antes de tocar la base de datos real, siempre hace primero
 * un backup de seguridad del estado actual y restaura en una base de
 * datos aislada para verificar que todo salió bien (ver
 * restore_kelatos_gdrive.sh en el VPS) — este diálogo solo encola la
 * solicitud, igual que "Backup ahora".
 */
export function RestaurarBackupDialog({
  archivo,
  fecha,
  open,
  onOpenChange,
  onSolicitado,
}: {
  archivo: string | null;
  fecha: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSolicitado: () => void;
}) {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [confirmacion, setConfirmacion] = useState("");
  const [clave, setClave] = useState("");
  const [enviando, setEnviando] = useState(false);

  function cerrar(o: boolean) {
    if (enviando) return;
    if (!o) {
      setPaso(1);
      setConfirmacion("");
      setClave("");
    }
    onOpenChange(o);
  }

  async function confirmar() {
    if (!archivo) return;
    if (!clave.trim()) return toast.error("Introduce la clave de confirmación");
    setEnviando(true);
    try {
      const res = await fetch("/api/admin/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombreArchivo: archivo, clave }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Restauración solicitada — puede tardar unos minutos en completarse");
      cerrar(false);
      onSolicitado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="max-w-md sm:max-w-md" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Danger className="size-5" /> Restaurar backup
          </DialogTitle>
        </DialogHeader>

        {paso === 1 ? (
          <div className="space-y-4">
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <p className="mb-2 flex items-center gap-1.5 font-semibold text-destructive">
                <Warning2 className="size-4" /> Esto sobrescribirá TODOS los datos actuales
              </p>
              <ul className="ml-5 list-disc space-y-1 text-muted-foreground">
                <li>
                  Se restaurará <strong className="text-foreground">{archivo}</strong>
                  {fecha && <> (del {fecha})</>}.
                </li>
                <li>Todo lo creado o cambiado después de esa fecha se perderá en la base de datos real.</li>
                <li>Antes de tocar nada, el sistema hace automáticamente un backup de seguridad del estado actual.</li>
                <li>La restauración se verifica en una copia aislada antes de aplicarse — si algo falla, la base de datos real no se toca.</li>
                <li>El proceso tarda unos minutos; los usuarios pueden notar una breve interrupción durante el cambio final.</li>
              </ul>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmacionTexto">
                Escribe <strong>{PALABRA_CONFIRMACION}</strong> para continuar
              </Label>
              <Input
                id="confirmacionTexto"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                placeholder={PALABRA_CONFIRMACION}
                autoComplete="off"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => cerrar(false)}>Cancelar</Button>
              <Button
                variant="destructive"
                className="gap-1.5"
                disabled={confirmacion.trim().toUpperCase() !== PALABRA_CONFIRMACION}
                onClick={() => setPaso(2)}
              >
                Continuar <ArrowRight2 className="size-4" />
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Última confirmación — introduce la clave de restauración para ejecutar la solicitud.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="clave" className="flex items-center gap-1.5">
                <Lock className="size-3.5" /> Clave de confirmación
              </Label>
              <Input
                id="clave"
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                autoComplete="off"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaso(1)} disabled={enviando}>Atrás</Button>
              <Button variant="destructive" onClick={confirmar} disabled={enviando}>
                {enviando ? "Solicitando…" : "Restaurar ahora"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
