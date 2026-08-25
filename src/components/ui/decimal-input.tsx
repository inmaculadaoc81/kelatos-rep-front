"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

function sanear(texto: string): string {
  let v = texto.replace(",", ".").replace(/[^0-9.]/g, "");
  const primerPunto = v.indexOf(".");
  if (primerPunto !== -1) v = v.slice(0, primerPunto + 1) + v.slice(primerPunto + 1).replace(/\./g, "");
  return v;
}

function aNumero(texto: string): number {
  const n = parseFloat(texto);
  return isNaN(n) ? 0 : n;
}

/**
 * Input numérico con decimales que no pelea con el usuario mientras escribe.
 * Un <Input type="number"> controlado por un valor numérico redondea el
 * texto en cada tecla: al escribir "0." el valor sigue siendo 0, React
 * repinta el input a "0" y borra el punto recién puesto — con el pad
 * numérico (donde "." es la tecla más natural para decimales) esto hace
 * imposible escribir un importe como "12.50". Aquí se mantiene el texto tal
 * cual lo escribe el usuario (incluido el punto colgante) y solo se
 * resincroniza con el valor numérico externo cuando este cambia por otra
 * vía (reset del formulario, suma automática de una pieza de catálogo, etc).
 */
export function DecimalInput({
  value,
  onChange,
  ...props
}: {
  value: number;
  onChange: (n: number) => void;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type">) {
  const [texto, setTexto] = useState(value === 0 ? "" : String(value));

  useEffect(() => {
    if (aNumero(texto) !== value) setTexto(value === 0 ? "" : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={texto}
      onChange={(e) => {
        const v = sanear(e.target.value);
        setTexto(v);
        onChange(aNumero(v));
      }}
    />
  );
}
