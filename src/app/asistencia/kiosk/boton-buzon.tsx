"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sms } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Icono del buzón en la vista de fichaje: siempre en color; con número rojo y animación si hay correos o comunicados pendientes. */
export function BotonBuzon() {
  const [correos, setCorreos] = useState(0);
  const [comunicados, setComunicados] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    let vivo = true;
    const mirar = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/rrhh/yo", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (!vivo || !d.ok) return;
          setComunicados(Math.max(d.pendientes.sin_leer, d.pendientes.sin_conformidad));
          if (!d.correo.conectado) return setCorreos(0);
          return fetch("/api/rrhh/correo/sin-leer", { cache: "no-store" })
            .then((r) => r.json())
            .then((c) => { if (vivo && c.ok) setCorreos(c.sinLeer); });
        })
        .catch(() => {});
    };
    mirar();
    const t = setInterval(mirar, 120_000);
    document.addEventListener("visibilitychange", mirar);
    return () => { vivo = false; clearInterval(t); document.removeEventListener("visibilitychange", mirar); };
  }, [pathname]);

  const total = correos + comunicados;
  const detalle = [
    comunicados ? `${comunicados} comunicado${comunicados > 1 ? "s" : ""} pendiente${comunicados > 1 ? "s" : ""}` : "",
    correos ? `${correos} correo${correos > 1 ? "s" : ""} sin leer` : "",
  ].filter(Boolean).join(" y ");
  const titulo = total ? `Tienes ${detalle}` : "Mi correo y comunicados";

  return (
    <Button
      variant="ghost" size="icon-sm" title={titulo} aria-label={titulo}
      className="relative mr-1 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
      render={<Link href={comunicados ? "/rrhh/comunicados" : "/rrhh/correo"} />}
    >
      <Sms className={cn("size-4", total > 0 && "buzon-aviso")} />
      {total > 0 && (
        <span className="absolute -top-1 -right-1 flex">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-60 motion-reduce:animate-none" />
          <span className="relative flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">{total > 99 ? "99+" : total}</span>
        </span>
      )}
    </Button>
  );
}
