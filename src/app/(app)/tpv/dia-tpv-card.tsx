"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Gallery, TickCircle, Warning2, CloseCircle } from "@/lib/icons";
import { resolverBlobImagen, comprimirImagen } from "@/lib/foto-captura";
import { METODOS_TPV, TpvFotoApi, TpvImporteApi } from "@/lib/tpv";

const TOLERANCIA = 0.01;

function euros(n: number): string {
  return (n || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

function etiquetaDia(dia: string): string {
  const txt = new Date(`${dia}T12:00:00Z`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

interface Props {
  dia: string;
  hoy: string;
  segunSistema: Record<string, number>;
  importes: TpvImporteApi[];
  fotos: TpvFotoApi[];
  onCambiado: () => void;
}

export function DiaTpvCard({ dia, hoy, segunSistema, importes, fotos, onCambiado }: Props) {
  const [valores, setValores] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const i of importes) init[i.metodo] = Number(i.importe_declarado) || 0;
    return init;
  });
  const [notas, setNotas] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const i of importes) init[i.metodo] = i.notas || "";
    return init;
  });
  const [guardando, setGuardando] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const importePorMetodo = new Map(importes.map((i) => [i.metodo, i]));

  function esDirty(metodo: string): boolean {
    const original = importePorMetodo.get(metodo);
    const valorOriginal = original ? Number(original.importe_declarado) || 0 : 0;
    const notaOriginal = original?.notas || "";
    return valores[metodo] !== valorOriginal || (notas[metodo] || "") !== notaOriginal || (!original && (valores[metodo] || 0) > 0);
  }

  async function guardar(metodo: string) {
    setGuardando(metodo);
    try {
      const res = await fetch("/api/tpv/importes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: dia, metodo, importe: valores[metodo] || 0, notas: notas[metodo] || "" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Importe declarado guardado");
      onCambiado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(null);
    }
  }

  async function onSeleccionarFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files || []);
    e.target.value = "";
    if (!archivos.length) return;
    setSubiendoFoto(true);
    try {
      for (const file of archivos) {
        try {
          const blob = await resolverBlobImagen(file);
          const { base64, mime } = await comprimirImagen(blob);
          const res = await fetch("/api/tpv/fotos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fecha: dia, base64, mimeType: mime, nombre: file.name }),
          });
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || "Error desconocido");
        } catch (err) {
          toast.error(`No se pudo subir "${file.name}": ${err instanceof Error ? err.message : "error desconocido"}`);
        }
      }
      onCambiado();
    } finally {
      setSubiendoFoto(false);
    }
  }

  // Un método "relevante" ese día es el que tiene algo del sistema o algo
  // declarado — un método sin ningún movimiento no cuenta para el badge de
  // cuadre (no tiene sentido pedir "declara 0 € de Bizum" si no hubo ninguno).
  const metodosRelevantes = METODOS_TPV.filter((m) => Math.abs(segunSistema[m.value] || 0) > 0 || importePorMetodo.has(m.value));
  const todosCuadran = metodosRelevantes.every((m) => {
    const sistema = segunSistema[m.value] || 0;
    const declarado = importePorMetodo.has(m.value) ? Number(importePorMetodo.get(m.value)!.importe_declarado) : null;
    return declarado !== null && Math.abs(declarado - sistema) <= TOLERANCIA;
  });
  const faltaDeclarar = metodosRelevantes.some((m) => !importePorMetodo.has(m.value));

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-3 border-b bg-muted px-4 py-2">
        <span className="text-sm font-semibold">
          {etiquetaDia(dia)} {dia === hoy && <span className="ml-1 rounded bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">Hoy</span>}
        </span>
        {metodosRelevantes.length === 0 ? (
          <span className="text-xs text-muted-foreground">Sin movimientos TPV</span>
        ) : todosCuadran ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
            <TickCircle className="size-3.5" /> Cuadra
          </span>
        ) : faltaDeclarar ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
            <Warning2 className="size-3.5" /> Falta declarar
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
            <CloseCircle className="size-3.5" /> Descuadre
          </span>
        )}
      </div>

      <div className="divide-y">
        {METODOS_TPV.map((m) => {
          const sistema = segunSistema[m.value] || 0;
          const tieneFila = importePorMetodo.has(m.value);
          const valor = valores[m.value] || 0;
          const diferencia = tieneFila ? Math.round((valor - sistema) * 100) / 100 : null;
          return (
            <div key={m.value} className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="w-36 shrink-0 text-sm font-medium">{m.label}</span>
              <span className="w-28 shrink-0 text-xs text-muted-foreground">
                Sistema: <span className="tabular-nums text-foreground">{euros(sistema)}</span>
              </span>
              <DecimalInput
                className="h-8 w-28"
                placeholder="0.00"
                value={valor}
                onChange={(n) => setValores((prev) => ({ ...prev, [m.value]: n }))}
              />
              <Input
                className="h-8 flex-1"
                placeholder="Nota (opcional)"
                maxLength={500}
                value={notas[m.value] || ""}
                onChange={(e) => setNotas((prev) => ({ ...prev, [m.value]: e.target.value }))}
              />
              {diferencia !== null && (
                <span
                  className={`shrink-0 whitespace-nowrap text-xs font-medium tabular-nums ${
                    Math.abs(diferencia) <= TOLERANCIA ? "text-green-600" : diferencia > 0 ? "text-blue-600" : "text-red-600"
                  }`}
                >
                  {Math.abs(diferencia) <= TOLERANCIA ? "Coincide" : diferencia > 0 ? `Sobran ${euros(diferencia)}` : `Faltan ${euros(Math.abs(diferencia))}`}
                </span>
              )}
              <Button
                size="sm"
                variant={esDirty(m.value) ? "default" : "outline"}
                className="h-8 shrink-0"
                disabled={guardando === m.value || !esDirty(m.value)}
                onClick={() => guardar(m.value)}
              >
                {guardando === m.value ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t px-4 py-2.5">
        {fotos.map((f) => (
          <a
            key={f.id}
            href={`/api/tpv/archivo/${f.drive_file_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block size-14 overflow-hidden rounded-md border bg-muted"
            title={f.nombre_original || "Foto de cierre"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/tpv/archivo/${f.drive_file_id}`} alt="Foto de cierre TPV" className="size-full object-cover" />
          </a>
        ))}
        <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={subiendoFoto} onClick={() => inputFotoRef.current?.click()}>
          <Gallery className="size-3.5" /> {subiendoFoto ? "Subiendo…" : "Añadir foto"}
        </Button>
        <input ref={inputFotoRef} type="file" accept="image/*" multiple onChange={onSeleccionarFotos} className="hidden" />
      </div>
    </div>
  );
}
