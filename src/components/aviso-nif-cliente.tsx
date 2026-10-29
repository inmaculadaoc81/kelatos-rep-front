"use client";

import { useEffect, useState } from "react";
import { TickCircle, Warning2, Refresh2 } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { ResultadoNifIva } from "@/app/api/facturas-recibidas/validar-iva/route";

/**
 * Aviso (NUNCA bloqueante) al emitir una factura a un cliente: comprueba su NIF/DNI/NIE/CIF antes de emitirla para evitar rectificativas por errores de NIF o de nombre.
 * - NIF español: dígito de control (la letra del DNI/NIE, el control del CIF). Se normaliza a mayúsculas y sin espacios.
 * - NIF-IVA de otro país de la UE (con su prefijo): consulta VIES.
 * - Nombre: avisa si no parece un nombre completo para un particular o si lleva números o símbolos.
 * La comprobación del NIF contra el nombre en la Agencia Tributaria exige un certificado electrónico y no se hace aquí. Si el servicio de validación no responde, solo se informa
 * de que no se pudo comprobar: la factura se puede emitir igualmente.
 */
const UE = new Set(["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "FI", "FR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK", "XI"]);
const compacto = (n: string) => n.toUpperCase().replace(/[\s.\-_/]/g, "");

function avisosNombre(nifCompacto: string, nombre: string): string[] {
  const n = nombre.replace(/\s+/g, " ").trim();
  if (!n) return [];
  const avisos: string[] = [];
  const esParticular = /^(\d{8}[A-Z]|[XYZ]\d{7}[A-Z])$/.test(nifCompacto.replace(/^ES/, ""));
  if (esParticular && n.split(" ").length < 2) avisos.push("Un particular suele necesitar nombre y apellidos: revisa que el nombre esté completo.");
  if (/[\d@#$%^&*=+<>_]/.test(n)) avisos.push("El nombre lleva números o símbolos: revisa que no haya un error de escritura.");
  return avisos;
}

export function AvisoNifCliente({ nif, nombre = "", className }: { nif: string; nombre?: string; className?: string }) {
  const nifC = compacto(nif);
  const prefijo = nifC.slice(0, 2);
  const tipo: "nacional" | "intracomunitaria" = UE.has(prefijo) ? "intracomunitaria" : "nacional";
  const clave = `${tipo}:${nifC}`;
  const [respuesta, setRespuesta] = useState<{ clave: string; resultado: ResultadoNifIva | null } | null>(null);

  useEffect(() => {
    if (nifC.length < 5) return;
    let vigente = true;
    const t = setTimeout(() => {
      fetch("/api/facturas-recibidas/validar-iva", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nif: nifC, tipo }) })
        .then((r) => r.json())
        .then((d) => { if (vigente) setRespuesta({ clave, resultado: d.ok ? d.resultado : null }); })
        .catch(() => { if (vigente) setRespuesta({ clave, resultado: null }); });
    }, 600);
    return () => { vigente = false; clearTimeout(t); };
  }, [nifC, tipo, clave]);

  const avisosDelNombre = avisosNombre(nifC, nombre);
  if (nifC.length < 5 && !avisosDelNombre.length) return null;

  const r = respuesta?.clave === clave ? respuesta.resultado : undefined;
  const comprobando = nifC.length >= 5 && r === undefined;
  const invalido = r?.estado === "invalido";
  const valido = r?.estado === "valido";
  const sinComprobar = nifC.length >= 5 && (r === null || r?.estado === "no_verificado");
  const lowerSolo = nif.trim() !== nif.trim().toUpperCase() && valido;

  return (
    <div className={cn("space-y-1 text-xs", className)} aria-live="polite">
      {comprobando && <p className="flex items-center gap-1.5 text-muted-foreground"><Refresh2 className="size-3.5 animate-spin" /> Comprobando el NIF…</p>}
      {valido && (
        <p className="flex items-start gap-1.5 text-emerald-700 dark:text-emerald-400">
          <TickCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>NIF correcto{r?.nombre ? <> — consta a nombre de <strong className="font-medium">{r.nombre}</strong></> : ""}.{lowerSolo ? " Se emitirá en mayúsculas." : ""}</span>
        </p>
      )}
      {invalido && (
        <p className="flex items-start gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <Warning2 className="mt-0.5 size-3.5 shrink-0" />
          <span><strong className="font-medium">Revisa el NIF:</strong> {r?.mensaje || "no parece válido"}. Un NIF equivocado obliga a emitir una factura rectificativa. Puedes emitir igualmente si estás seguro.</span>
        </p>
      )}
      {sinComprobar && <p className="text-muted-foreground">No se pudo comprobar el NIF ahora mismo; puedes emitir la factura igualmente.</p>}
      {avisosDelNombre.map((a) => (
        <p key={a} className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400"><Warning2 className="mt-0.5 size-3.5 shrink-0" /> {a}</p>
      ))}
    </div>
  );
}
