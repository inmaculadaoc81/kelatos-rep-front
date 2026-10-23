"use client";

import { useEffect, useRef, useState } from "react";

/** Un lector USB escribe los dígitos casi sin pausa (menos de ~30 ms entre teclas) y termina con Enter; una persona no baja de ~60-80 ms. */
const INTERVALO_MAX_ESCANEO_MS = 30;
const TIMEOUT_BUFER_MS = 300;

export interface DatosEquipoEscaneado { nombre: string; marca: string | null; modelo: string | null; categoria: string | null }
export type AvisoEscaneo = { tipo: "buscando" | "ok" | "vacio" | "error"; texto: string } | null;

/** Del tipo de producto del formulario según lo que diga la ficha encontrada (categoría o nombre). null si no se reconoce. */
export function tipoDesdeFicha(categoria: string | null, nombre: string): string | null {
  const t = `${categoria ?? ""} ${nombre}`.toLowerCase();
  if (/robot (de )?cocina|thermomix|mycook|kitchen/.test(t)) return "Robot de cocina";
  if (/robot.*aspirador|aspirador.*robot|roomba|conga/.test(t)) return "Robot aspirador";
  if (/aspirad|vacuum|stick/.test(t)) return "Aspirador";
  if (/secador|hair ?dryer|supersonic|airwrap|styler|multi-?styler/.test(t)) return "Secador";
  if (/port[aá]til|laptop|notebook|ordenador port/.test(t)) return "Portátil/Laptop";
  if (/sobremesa|desktop|all[- ]in[- ]one|torre/.test(t)) return "Ordenador de sobremesa";
  if (/consola|playstation|xbox|nintendo/.test(t)) return "Consola";
  if (/purificador|purifier/.test(t)) return "Purificador";
  if (/ventilador|fan\b/.test(t)) return "Ventilador";
  if (/batidora|blender/.test(t)) return "Batidora";
  return null;
}

/**
 * Paso «Equipo» del formulario: si se escanea el código de barras de la caja (12-14 dígitos, a velocidad de lector, con Enter) se consulta y se
 * rellenan marca y modelo. Funciona aunque el cursor esté dentro de un campo: los dígitos que el lector haya escrito ahí se deshacen.
 * `onRestaurar(campo, valor)` devuelve a su valor anterior el campo (marcado con data-campo) donde cayeron los dígitos.
 */
export function useEscanerEquipo({ activo, codigoAcceso, onDatos, onRestaurar }: {
  activo: boolean;
  codigoAcceso: string;
  onDatos: (d: DatosEquipoEscaneado, codigo: string) => void;
  onRestaurar: (campo: string, valor: string) => void;
}) {
  const [aviso, setAviso] = useState<AvisoEscaneo>(null);
  const buffer = useRef("");
  const ultima = useRef(0);
  const antes = useRef<{ campo: string; valor: string } | null>(null);
  const cb = useRef({ codigoAcceso, onDatos, onRestaurar });

  useEffect(() => {
    cb.current = { codigoAcceso, onDatos, onRestaurar };
  }, [codigoAcceso, onDatos, onRestaurar]);

  useEffect(() => {
    if (!activo) return;

    async function consultar(codigo: string) {
      setAviso({ tipo: "buscando", texto: "Leyendo el código de barras…" });
      try {
        const res = await fetch(`/api/formulario-cliente/equipo?ean=${encodeURIComponent(codigo)}&codigo=${encodeURIComponent(cb.current.codigoAcceso)}`, { cache: "no-store" });
        const d = (await res.json()) as { ok: boolean; error?: string; fuente?: string | null; datos: DatosEquipoEscaneado | null };
        if (!d.ok) throw new Error(d.error || "No se pudo consultar el código");
        if (!d.datos || (!d.datos.marca && !d.datos.nombre)) {
          setAviso({ tipo: "vacio", texto: "No encontramos datos de este código. Escribe la marca y el modelo a mano." });
          return;
        }
        cb.current.onDatos(d.datos, codigo);
        setAviso({ tipo: "ok", texto: `Datos rellenados desde el código de barras${d.fuente ? ` (${d.fuente})` : ""}. Revísalos antes de continuar.` });
      } catch (e) {
        setAviso({ tipo: "error", texto: `${e instanceof Error ? e.message : "No se pudo consultar el código"}. Escribe los datos a mano.` });
      }
    }

    function alPulsarTecla(e: KeyboardEvent) {
      const ahora = Date.now();
      const transcurrido = ahora - ultima.current;
      ultima.current = ahora;

      if (e.key === "Enter") {
        const codigo = buffer.current;
        buffer.current = "";
        const previo = antes.current;
        antes.current = null;
        if (/^\d{12,14}$/.test(codigo)) {
          e.preventDefault();
          e.stopPropagation();
          // Los dígitos del código ya se escribieron en el campo enfocado: se devuelve el valor que tenía antes del escaneo.
          if (previo) cb.current.onRestaurar(previo.campo, previo.valor);
          void consultar(codigo);
        }
        return;
      }

      if (transcurrido > TIMEOUT_BUFER_MS) { buffer.current = ""; antes.current = null; }
      if (/^\d$/.test(e.key)) {
        if (buffer.current.length > 0 && transcurrido > INTERVALO_MAX_ESCANEO_MS) buffer.current = e.key;
        else buffer.current += e.key;
        if (buffer.current.length === 1) {
          const el = document.activeElement as HTMLInputElement | null;
          const campo = el?.dataset?.campo;
          antes.current = campo ? { campo, valor: el?.value ?? "" } : null;
        }
      } else {
        buffer.current = "";
        antes.current = null;
      }
    }

    // Fase de captura: se ve antes que la propia escritura del campo.
    window.addEventListener("keydown", alPulsarTecla, true);
    return () => window.removeEventListener("keydown", alPulsarTecla, true);
  }, [activo]);

  return { aviso, limpiarAviso: () => setAviso(null) };
}
