"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { TickCircle, CloseCircle, Warning2, Refresh2 } from "@/lib/icons";
import type { ResultadoNifIva } from "@/app/api/facturas-recibidas/validar-iva/route";

/** Comprueba el NIF/CIF del proveedor (operación nacional: dígito de control) o su NIF-IVA (compra intracomunitaria: VIES, el servicio
    de la Comisión Europea). Un NIF no válido —o no comprobable— deja la factura «pendiente» y no se contabiliza hasta resolverlo. */
const compacto = (n: string) => n.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** `nif` es el de la ficha del proveedor (nacional) o el NIF-IVA escrito (intracomunitaria). `nifFactura`, si se pasa, es el CIF que la IA leyó
    en la propia factura: si no coincide con el de la ficha, casi seguro se ha emparejado el proveedor equivocado o la ficha tiene un dato mal. */
export function VerificacionNifIva({ nif, tipo, nifFactura }: { nif: string; tipo: "nacional" | "intracomunitaria"; nifFactura?: string | null }) {
  const discrepa = tipo === "nacional" && !!nifFactura && !!nif.trim() && compacto(nifFactura).replace(/^ES/, "") !== compacto(nif).replace(/^ES/, "");
  return (
    <div className="space-y-1.5">
      <EstadoNifIva nif={nif} tipo={tipo} />
      {discrepa && (
        <p className="flex items-start gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          <Warning2 className="mt-0.5 size-3.5 shrink-0" />
          <span>
            El CIF leído en la factura (<strong className="font-medium">{nifFactura}</strong>) no coincide con el de la ficha del proveedor (<strong className="font-medium">{nif}</strong>).
            Comprueba que sea el proveedor correcto o corrige su ficha; la validación de arriba usa el de la ficha.
          </span>
        </p>
      )}
    </div>
  );
}

function EstadoNifIva({ nif, tipo }: { nif: string; tipo: "nacional" | "intracomunitaria" }) {
  const clave = `${tipo}:${nif.trim().toUpperCase()}`;
  const [respuesta, setRespuesta] = useState<{ clave: string; resultado: ResultadoNifIva | null } | null>(null);

  useEffect(() => {
    if (!nif.trim()) return;
    let vigente = true;
    const t = setTimeout(() => {
      fetch("/api/facturas-recibidas/validar-iva", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nif, tipo }) })
        .then((r) => r.json())
        .then((d) => { if (vigente) setRespuesta({ clave, resultado: d.ok ? d.resultado : null }); })
        .catch(() => { if (vigente) setRespuesta({ clave, resultado: null }); });
    }, 600);
    return () => { vigente = false; clearTimeout(t); };
  }, [nif, tipo, clave]);

  if (!nif.trim()) {
    return tipo === "nacional" ? <p className="text-xs text-muted-foreground">El proveedor no tiene NIF/CIF en su ficha: no se puede comprobar.</p> : null;
  }
  const r = respuesta?.clave === clave ? respuesta.resultado : undefined;
  if (r === undefined) {
    return <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Refresh2 className="size-3.5 animate-spin" /> Comprobando el NIF{tipo === "intracomunitaria" ? "-IVA en VIES" : ""}…</p>;
  }
  if (r === null) return <p className="text-xs text-muted-foreground">No se pudo comprobar el NIF ahora mismo.</p>;

  const ok = r.estado === "valido";
  const mal = r.estado === "invalido";
  const Icono = ok ? TickCircle : mal ? CloseCircle : Warning2;
  return (
    <p className={cn("flex items-start gap-1.5 rounded-md border px-2.5 py-1.5 text-xs", ok && "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300", mal && "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300", !ok && !mal && "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300")}>
      <Icono className="mt-0.5 size-3.5 shrink-0" />
      <span>
        {ok ? "NIF válido" : mal ? "NIF no válido" : "No verificado"}: {r.mensaje}{r.mensaje && !/[.!?]$/.test(r.mensaje) ? "." : ""}
        {r.nombre ? <> — <strong className="font-medium">{r.nombre}</strong></> : null}
        {mal && " La factura quedará pendiente y no se contabilizará hasta corregirlo."}
      </span>
    </p>
  );
}
