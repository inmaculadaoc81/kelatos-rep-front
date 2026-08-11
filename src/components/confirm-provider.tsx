"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { MessageQuestion, CloseCircle, TickCircle } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Reproduce mostrarConfirmacion() del original — un modal de confirmación
 * genérico (cabecera amarilla, "Confirmación") que devuelve una Promise<boolean>,
 * en vez del window.confirm() nativo del navegador que se usaba como
 * sustituto provisional en varios sitios de este puerto.
 */
type ConfirmFn = (mensaje: string, opciones?: { titulo?: string; detalle?: string }) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm() debe usarse dentro de <ConfirmProvider>");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<{ mensaje: string; titulo: string; detalle?: string } | null>(null);
  const resolverRef = useRef<(v: boolean) => void>(null);

  const confirmar = useCallback<ConfirmFn>((mensaje, opciones) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setEstado({ mensaje, titulo: opciones?.titulo || "Confirmación", detalle: opciones?.detalle });
    });
  }, []);

  function resolver(valor: boolean) {
    resolverRef.current?.(valor);
    resolverRef.current = null;
    setEstado(null);
  }

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      <Dialog open={estado !== null} onOpenChange={(o) => !o && resolver(false)}>
        <DialogContent className="gap-0 p-0 sm:max-w-sm" showCloseButton={false}>
          <header className="flex items-center gap-2 rounded-t-xl bg-amber-400 px-4 py-3 text-amber-950">
            <MessageQuestion className="size-4.5 shrink-0" />
            <DialogTitle className="text-sm font-semibold text-amber-950">{estado?.titulo}</DialogTitle>
            <Button variant="ghost" size="icon-sm" className="ml-auto text-amber-950 hover:bg-black/10" onClick={() => resolver(false)}>
              <CloseCircle className="size-4" />
            </Button>
          </header>
          <div className="p-4 text-sm whitespace-pre-wrap">
            {estado?.mensaje}
            {estado?.detalle && <p className="mt-1.5 text-xs text-muted-foreground">{estado.detalle}</p>}
          </div>
          <footer className="flex justify-end gap-2 border-t bg-muted/50 px-4 py-3">
            <Button variant="secondary" className="gap-1.5" onClick={() => resolver(false)}>
              <CloseCircle className="size-3.5" /> Cancelar
            </Button>
            <Button className="gap-1.5" onClick={() => resolver(true)}>
              <TickCircle className="size-3.5" /> Aceptar
            </Button>
          </footer>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
