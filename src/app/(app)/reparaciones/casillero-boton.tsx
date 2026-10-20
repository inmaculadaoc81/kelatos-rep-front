"use client";

import { useMemo, useRef, useState } from "react";
import { Box1, Lock } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { ReparacionDetalle } from "@/lib/reparacion-detalle";
import { ZONAS, estaLleno, textoOcupacion, type Casillero } from "@/lib/casilleros";

/**
 * Desplegable "Casillero" de la fila "Estado actual" del resguardo: indica en qué casillero del local está guardado
 * el equipo. Se elige de la lista de casilleros (con su contenido y cuántos equipos caben); los que están llenos no se
 * pueden elegir. Se puede cambiar o quitar. El casillero se libera solo cuando el equipo sale del local (lo hace el
 * servidor al marcarlo como entregado). Sin valor muestra "Casillero"; con valor, "Casillero: 12".
 */
export function CasilleroBoton({
  detalle,
  onActualizado,
  bloqueado = false,
}: {
  detalle: ReparacionDetalle;
  onActualizado: () => void;
  /** Reparación entregada y facturada: el equipo ya salió, no se edita. */
  bloqueado?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState<Casillero[] | null>(null);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [guardando, setGuardando] = useState(false);
  const guardandoRef = useRef(false);

  const actual = detalle.equipo.casillero;

  async function cargarLista() {
    setErrorLista(null);
    try {
      const res = await fetch("/api/casilleros", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setLista(data.casilleros as Casillero[]);
    } catch (e) {
      setErrorLista(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  async function asignar(casilleroId: number | null, etiqueta: string) {
    if (guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true);
    try {
      const res = await fetch(`/api/reparaciones/${detalle.resguardo}/casillero`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ casilleroId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(casilleroId === null ? "Casillero quitado" : `Casillero asignado: ${etiqueta}`);
      setAbierto(false);
      onActualizado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
      void cargarLista();
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  }

  const grupos = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    const visibles = (lista ?? []).filter((c) => c.activo && (!q || c.codigo.toLowerCase().includes(q) || c.contenido.toLowerCase().includes(q)));
    return ZONAS.map((z) => ({ zona: z, casilleros: visibles.filter((c) => c.zona === z.id) })).filter((g) => g.casilleros.length > 0);
  }, [lista, filtro]);

  if (bloqueado) {
    return (
      <Button size="sm" variant="outline" className="gap-1.5" disabled title="Reparación entregada y facturada: no se puede editar el casillero">
        <Lock className="size-3.5" /> Casillero{actual ? `: ${actual}` : ""}
      </Button>
    );
  }

  return (
    <Popover
      open={abierto}
      onOpenChange={(o) => {
        if (guardando) return;
        if (o) {
          setFiltro("");
          void cargarLista();
        }
        setAbierto(o);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            className={actual ? "gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400" : "gap-1.5"}
            title={actual ? "Cambiar el casillero donde está guardado el equipo" : "Elegir en qué casillero se guarda el equipo"}
          />
        }
      >
        <Box1 className="size-3.5" /> Casillero{actual ? `: ${actual}` : ""}
      </PopoverTrigger>
      <PopoverContent className="w-96 p-3" align="start">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Casillero del equipo</p>
        <Input autoFocus placeholder="Buscar por número o contenido…" value={filtro} disabled={guardando} onChange={(e) => setFiltro(e.target.value)} />
        <div className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
          {errorLista && <p className="text-xs text-destructive">No se pudo cargar la lista: {errorLista}</p>}
          {!lista && !errorLista && <p className="text-xs text-muted-foreground">Cargando casilleros…</p>}
          {lista && grupos.length === 0 && <p className="text-xs text-muted-foreground">Ningún casillero coincide.</p>}
          {grupos.map((g) => (
            <div key={g.zona.id}>
              <p className="sticky top-0 bg-popover py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.zona.nombre}</p>
              <div className="space-y-0.5">
                {g.casilleros.map((c) => {
                  const esActual = c.codigo === actual;
                  const lleno = estaLleno(c) && !esActual;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={guardando || lleno || esActual}
                      onClick={() => asignar(c.id, c.codigo)}
                      className={`flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${esActual ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-muted"} ${lleno ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <span className="w-12 shrink-0 font-semibold">{c.codigo}</span>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground" title={c.contenido}>{c.contenido || "Sin contenido indicado"}</span>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${lleno ? "bg-red-100 text-red-800" : "bg-muted text-muted-foreground"}`}>
                        {lleno ? "Lleno" : textoOcupacion(c)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between gap-1.5 border-t pt-2">
          {actual ? (
            <Button size="sm" variant="ghost" className="text-destructive" disabled={guardando} onClick={() => asignar(null, "")}>
              Quitar casillero
            </Button>
          ) : (
            <span />
          )}
          <Button size="sm" variant="ghost" disabled={guardando} onClick={() => setAbierto(false)}>
            Cerrar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
