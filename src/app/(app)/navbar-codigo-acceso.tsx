"use client";

import { Refresh2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCodigoAcceso } from "./codigo-acceso-context";

/**
 * Reproduce el bloque "Código acceso" del navbar original (navbarCodigoWrap
 * / navCodigoDisplay / navbarNuevoCodigo en Index.html): el código de 6
 * dígitos vigente del formulario en tablet, visible desde cualquier
 * pantalla sin tener que entrar en Formulario Web, con botón para
 * regenerarlo. Comparte estado con formulario-web/page.tsx vía
 * CodigoAccesoProvider — ver ese archivo para el porqué.
 */
export function NavbarCodigoAcceso() {
  const { codigo, cargando, generando, generarNuevo } = useCodigoAcceso();

  async function nuevoCodigo() {
    try {
      await generarNuevo();
      toast.success("Código nuevo generado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
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
