"use client";

import { useMemo, useState } from "react";
import { SearchNormal1, Sms } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Buzon } from "@/lib/mails";

/** Modal para elegir un buzón entre todos los disponibles, con búsqueda —
    la tarjeta "Buzones" del Centro de mails solo enseña los primeros para no
    crecer sin límite cuando hay muchos buzones dados de alta. */
export function SeleccionarBuzonDialog({
  buzones,
  open,
  onOpenChange,
  onElegir,
}: {
  buzones: Buzon[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onElegir: (id: number | null) => void;
}) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return buzones;
    return buzones.filter((b) => b.nombre.toLowerCase().includes(q) || b.email.toLowerCase().includes(q));
  }, [buzones, busqueda]);

  function elegir(id: number | null) {
    onElegir(id);
    onOpenChange(false);
    setBusqueda("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sms className="size-5" /> Elegir buzón
          </DialogTitle>
          <DialogDescription>Busca entre los {buzones.length} buzones disponibles.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus placeholder="Buscar por nombre o correo…" className="pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <div className="-mx-1 max-h-[50vh] overflow-y-auto px-1">
          <button
            type="button"
            onClick={() => elegir(null)}
            className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
          >
            <span className="font-medium">Todos los buzones</span>
          </button>
          {filtrados.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => elegir(b.id)}
              className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted ${b.activo ? "" : "opacity-60"}`}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{b.nombre}</span>
                <span className="block truncate text-xs text-muted-foreground">{b.email}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {b.ultimo_error && <span className="size-1.5 rounded-full bg-red-500" title={b.ultimo_error} />}
                {b.sin_leer > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{b.sin_leer}</span>}
              </span>
            </button>
          ))}
          {!filtrados.length && <p className="p-4 text-center text-sm text-muted-foreground">Ningún buzón coincide con la búsqueda</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
