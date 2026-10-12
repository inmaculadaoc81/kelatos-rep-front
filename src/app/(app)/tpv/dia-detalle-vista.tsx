"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft2, MoneyRecive, Gallery, Bank } from "@/lib/icons";
import { resolverBlobImagen, comprimirImagen } from "@/lib/foto-captura";
import { METODOS_TPV, TpvFotoApi, TpvImporteApi } from "@/lib/tpv";

function euros(n: number): string {
  return (n || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

function etiquetaDia(dia: string): string {
  const txt = new Date(`${dia}T12:00:00Z`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

/**
 * Desglose de un día — vista de página normal (no modal: petición del
 * usuario, 2026-10-12, "no tiene que ser un modal, tiene que ser una
 * vista"). KPI arriba (Vendido/Confirmado/Diferencia), una fila por CADA
 * tipo de pago (tarjeta, tarjeta virtual, bizum, transferencia, efectivo
 * — todos juntos, ver METODOS_TPV en lib/tpv.ts) con lo que calcula el
 * sistema y una celda para confirmar lo que dice el banco, y una columna
 * de la derecha con el total CONFIRMADO acumulado fila a fila (misma
 * mecánica que la columna "Saldo" de Efectivo) terminando en una fila
 * "Total" al final.
 */
export function DiaDetalleVista({
  dia,
  segunSistemaDia,
  importesDia,
  fotosDia,
  onVolver,
  onCambiado,
}: {
  dia: string;
  segunSistemaDia: Record<string, number>;
  importesDia: TpvImporteApi[];
  fotosDia: TpvFotoApi[];
  onVolver: () => void;
  onCambiado: () => void;
}) {
  const [declarado, setDeclarado] = useState<Record<string, { importe: number; notas: string }>>({});
  const [guardando, setGuardando] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement | null>(null);

  const importePorMetodo = new Map(importesDia.map((i) => [i.metodo, i]));

  function valorDeclarado(metodo: string): { importe: number; notas: string } {
    if (declarado[metodo]) return declarado[metodo];
    const guardado = importePorMetodo.get(metodo);
    return { importe: Number(guardado?.importe_declarado) || 0, notas: guardado?.notas || "" };
  }

  function esDirty(metodo: string): boolean {
    if (!declarado[metodo]) return false;
    const guardado = importePorMetodo.get(metodo);
    const importeGuardado = Number(guardado?.importe_declarado) || 0;
    const notasGuardadas = guardado?.notas || "";
    return declarado[metodo].importe !== importeGuardado || declarado[metodo].notas !== notasGuardadas;
  }

  async function guardarDeclaracion(metodo: string) {
    const v = valorDeclarado(metodo);
    setGuardando(metodo);
    try {
      const res = await fetch("/api/tpv/importes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: dia, metodo, importe: v.importe, notas: v.notas }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Importe confirmado guardado");
      setDeclarado((prev) => {
        const resto = { ...prev };
        delete resto[metodo];
        return resto;
      });
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

  const metodosRelevantes = METODOS_TPV.filter(
    (m) => Math.abs(segunSistemaDia[m.value] || 0) > 0.009 || importePorMetodo.has(m.value)
  );
  const vendido = METODOS_TPV.reduce((acc, m) => acc + (segunSistemaDia[m.value] || 0), 0);

  const filas = metodosRelevantes.reduce<{ metodo: (typeof METODOS_TPV)[number]; sistema: number; confirmado: number; totalAcumulado: number }[]>(
    (acc, m) => {
      const sistema = segunSistemaDia[m.value] || 0;
      const v = valorDeclarado(m.value);
      const previo = acc.length ? acc[acc.length - 1].totalAcumulado : 0;
      const totalAcumulado = Math.round((previo + v.importe) * 100) / 100;
      return [...acc, { metodo: m, sistema, confirmado: v.importe, totalAcumulado }];
    },
    []
  );
  const confirmadoTotal = filas.length ? filas[filas.length - 1].totalAcumulado : 0;
  const diferencia = Math.round((vendido - confirmadoTotal) * 100) / 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="size-8" onClick={onVolver} title="Volver al calendario">
          <ArrowLeft2 className="size-4" />
        </Button>
        <h2 className="text-lg font-semibold">{etiquetaDia(dia)}</h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-3">
          <p className="mb-1 text-xs text-muted-foreground">Vendido</p>
          <p className="text-xl font-bold tabular-nums">{euros(vendido)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground"><Bank className="size-3.5" /> Confirmado</p>
          <p className="text-xl font-bold tabular-nums">{euros(confirmadoTotal)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="mb-1 text-xs text-muted-foreground">Diferencia</p>
          <p className={`text-xl font-bold tabular-nums ${Math.abs(diferencia) <= 0.01 ? "text-green-600" : "text-amber-600"}`}>{euros(diferencia)}</p>
        </div>
      </div>

      {filas.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Sin movimientos este día.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Sistema</TableHead>
                <TableHead>Confirmado</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map(({ metodo, sistema, confirmado, totalAcumulado }) => {
                const dirty = esDirty(metodo.value);
                const v = valorDeclarado(metodo.value);
                return (
                  <TableRow key={metodo.value}>
                    <TableCell className="whitespace-nowrap text-sm font-medium">{metodo.label}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">{euros(sistema)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <DecimalInput
                          className="h-8 w-24"
                          placeholder="0,00"
                          value={confirmado}
                          onChange={(n) => setDeclarado((prev) => ({ ...prev, [metodo.value]: { importe: n, notas: v.notas } }))}
                        />
                        <Input
                          className="h-8 min-w-32 flex-1"
                          placeholder="Nota (opcional)"
                          maxLength={500}
                          value={v.notas}
                          onChange={(e) => setDeclarado((prev) => ({ ...prev, [metodo.value]: { importe: v.importe, notas: e.target.value } }))}
                        />
                        <Button
                          size="sm"
                          variant={dirty ? "default" : "outline"}
                          className="h-8 shrink-0"
                          disabled={guardando === metodo.value || !dirty}
                          onClick={() => guardarDeclaracion(metodo.value)}
                        >
                          {guardando === metodo.value ? "Guardando…" : "Guardar"}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-medium tabular-nums">{euros(totalAcumulado)}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={3} className="text-right text-sm">Total</TableCell>
                <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">{euros(confirmadoTotal)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><MoneyRecive className="size-3.5" /> Ticket de cierre:</span>
        {fotosDia.map((f) => (
          <a key={f.id} href={`/api/tpv/archivo/${f.drive_file_id}`} target="_blank" rel="noopener noreferrer" className="block size-10 overflow-hidden rounded-md border bg-background" title={f.nombre_original || "Foto de cierre"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/tpv/archivo/${f.drive_file_id}`} alt="Foto de cierre TPV" className="size-full object-cover" />
          </a>
        ))}
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" disabled={subiendoFoto} onClick={() => inputFotoRef.current?.click()}>
          <Gallery className="size-3.5" /> {subiendoFoto ? "Subiendo…" : "Añadir foto"}
        </Button>
        <input ref={inputFotoRef} type="file" accept="image/*" multiple className="hidden" onChange={onSeleccionarFotos} />
      </div>
    </div>
  );
}
