"use client";

import { useEffect, useState } from "react";
import { Refresh2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CodigoAcceso } from "@/lib/formulario-acceso";

/**
 * Reproduce el bloque "Código acceso" del navbar original (navbarCodigoWrap
 * / navCodigoDisplay / navbarNuevoCodigo en Index.html): el código de 6
 * dígitos vigente del formulario en tablet, visible desde cualquier
 * pantalla sin tener que entrar en Formulario Web, con botón para
 * regenerarlo. Mismas rutas que ya usa formulario-web/page.tsx.
 */
export function NavbarCodigoAcceso() {
  const [codigo, setCodigo] = useState<CodigoAcceso | null>(null);
  const [generando, setGenerando] = useState(false);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    try {
      const res = await fetch("/api/formulario-cliente/codigo-acceso");
      const data = await res.json();
      if (data.ok) setCodigo(data.activo as CodigoAcceso | null);
    } catch {
      /* silencioso: es solo un acceso rápido, la fuente real está en Formulario Web */
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function nuevoCodigo() {
    setGenerando(true);
    try {
      const res = await fetch("/api/formulario-cliente/codigo-acceso", { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setCodigo(data.codigo as CodigoAcceso);
      toast.success("Código nuevo generado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGenerando(false);
    }
  }

  if (cargando) return null;

  return (
    <div className="hidden items-center gap-2 border-l border-primary-foreground/25 pl-3 lg:flex">
      <div className="leading-tight">
        <div className="text-[9px] font-bold tracking-wide text-primary-foreground/60 uppercase">Código acceso</div>
        <div className="font-bold tabular-nums text-primary-foreground" style={{ letterSpacing: "0.2em" }}>
          {codigo ? codigo.codigo : "—"}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
        onClick={nuevoCodigo}
        disabled={generando}
        title="Generar nuevo código de acceso"
      >
        <Refresh2 className={`size-3.5 ${generando ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
}
