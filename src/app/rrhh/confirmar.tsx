"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Opciones {
  titulo: string;
  texto: string;
  boton: string;
  /** botón rojo para acciones que quitan algo */
  peligro?: boolean;
}

/**
 * Confirmación en un modal del dashboard (en lugar del aviso del navegador).
 * `if (!(await confirmar({...}))) return;` y hay que pintar `modal` en el componente.
 */
export function useConfirmar() {
  const [pendiente, setPendiente] = useState<(Opciones & { resolver: (ok: boolean) => void }) | null>(null);
  const [abierto, setAbierto] = useState(false);

  const confirmar = useCallback((opciones: Opciones) => new Promise<boolean>((resolver) => {
    setPendiente({ ...opciones, resolver });
    setAbierto(true);
  }), []);

  // el texto se conserva al cerrar para que no se vacíe durante la animación de salida
  const responder = (ok: boolean) => {
    setAbierto(false);
    pendiente?.resolver(ok);
  };

  const modal = (
    <Dialog open={abierto} onOpenChange={(o) => { if (!o) responder(false); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-6">{pendiente?.titulo}</DialogTitle>
          <DialogDescription>{pendiente?.texto}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => responder(false)}>Cancelar</Button>
          <Button variant={pendiente?.peligro ? "destructive" : "default"} onClick={() => responder(true)}>{pendiente?.boton}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirmar, modal };
}
