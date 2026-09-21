"use client";

import { useMemo, useRef, useState } from "react";
import { DocumentUpload, TickCircle } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { parsearCsv } from "@/lib/csv";
import { CAMPOS_LEAD, DestinoColumna, adivinarMapeo, filasParaImportar } from "@/lib/leads-importar";
import type { ResultadoImportacion } from "@/lib/mails";

const TANDA = 500;
const MAX_FILAS = 50_000;

/**
 * Importar leads desde un CSV: se elige el archivo, se revisa a qué campo va
 * cada columna (ya viene adivinado) y se sube por tandas. Un lead se
 * identifica por su email: los que ya existen se omiten o, si se marca, se
 * completan sus datos (sin tocar su estado).
 */
export function ImportarLeadsDialog({ open, onOpenChange, onImportado }: { open: boolean; onOpenChange: (o: boolean) => void; onImportado: () => void }) {
  const [archivo, setArchivo] = useState<string>("");
  const [cabeceras, setCabeceras] = useState<string[]>([]);
  const [filas, setFilas] = useState<string[][]>([]);
  const [mapeo, setMapeo] = useState<DestinoColumna[]>([]);
  const [grupo, setGrupo] = useState("");
  const [actualizar, setActualizar] = useState(false);
  const [importando, setImportando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function elegir(f: File | undefined) {
    if (!f) return;
    try {
      const texto = await f.text();
      const todas = parsearCsv(texto);
      if (todas.length < 2) throw new Error("El archivo no tiene filas (la primera fila debe ser la cabecera)");
      if (todas.length - 1 > MAX_FILAS) throw new Error(`Demasiadas filas (máximo ${MAX_FILAS.toLocaleString("es-ES")}). Divide el archivo.`);
      const [cab, ...resto] = todas;
      setArchivo(f.name);
      setCabeceras(cab.map((c) => c.trim()));
      setFilas(resto);
      setMapeo(adivinarMapeo(cab));
      setResultado(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo leer el archivo");
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  const tieneNombre = mapeo.includes("nombre");
  const tieneEmail = mapeo.includes("email");
  const duplicados = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const d of mapeo) if (d !== "extra" && d !== "ignorar") cuenta.set(d, (cuenta.get(d) || 0) + 1);
    return [...cuenta.entries()].filter(([, n]) => n > 1).map(([d]) => d);
  }, [mapeo]);

  function cambiar(i: number, destino: DestinoColumna) {
    setMapeo((prev) => prev.map((d, j) => (j === i ? destino : d)));
  }

  async function importar() {
    if (!tieneNombre && !tieneEmail) return toast.error("Elige al menos la columna del nombre de la empresa o la del email");
    if (duplicados.length) return toast.error("Hay dos columnas asignadas al mismo campo");
    setImportando(true);
    setProgreso(0);
    const total: ResultadoImportacion = { creados: 0, actualizados: 0, omitidos: 0, sin_datos: 0, sin_email: 0 };
    try {
      const todas = filasParaImportar(cabeceras, filas, mapeo).map((f) => (grupo.trim() && !f.grupo_envio ? { ...f, grupo_envio: grupo.trim() } : f));
      for (let i = 0; i < todas.length; i += TANDA) {
        const res = await fetch("/api/mails/leads/importar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filas: todas.slice(i, i + TANDA), origen: archivo, actualizar }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(`${data.error || "Error desconocido"} (se importaron ${(total.creados + total.actualizados).toLocaleString("es-ES")} antes del fallo)`);
        for (const k of Object.keys(total) as (keyof ResultadoImportacion)[]) total[k] += data[k] || 0;
        setProgreso(Math.min(100, Math.round(((i + TANDA) / todas.length) * 100)));
      }
      setResultado(total);
      toast.success(`${total.creados.toLocaleString("es-ES")} leads nuevos`);
      onImportado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
      if (total.creados + total.actualizados > 0) onImportado();
    } finally {
      setImportando(false);
    }
  }

  function cerrar(o: boolean) {
    if (importando) return;
    if (!o) {
      setArchivo("");
      setCabeceras([]);
      setFilas([]);
      setMapeo([]);
      setResultado(null);
      setGrupo("");
    }
    onOpenChange(o);
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto sm:max-w-3xl" showCloseButton={!importando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DocumentUpload className="size-5" /> Importar leads
          </DialogTitle>
          <DialogDescription>
            Sube un CSV (desde Excel o Google Sheets: Archivo → Descargar → CSV). La primera fila debe ser la cabecera. Cada lead se identifica por su email.
          </DialogDescription>
        </DialogHeader>

        {!filas.length && (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <input ref={input} type="file" accept=".csv,.tsv,.txt,text/csv" className="hidden" onChange={(e) => elegir(e.target.files?.[0])} />
            <Button onClick={() => input.current?.click()} className="gap-1.5">
              <DocumentUpload className="size-4" /> Elegir archivo CSV
            </Button>
          </div>
        )}

        {filas.length > 0 && !resultado && (
          <div className="space-y-4">
            <p className="text-sm">
              <strong>{archivo}</strong> · {filas.length.toLocaleString("es-ES")} filas y {cabeceras.length} columnas
              <button type="button" className="ml-3 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground" onClick={() => { setFilas([]); setCabeceras([]); }}>
                Elegir otro archivo
              </button>
            </p>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Columna del archivo</th>
                    <th className="px-3 py-2 font-medium">Ejemplo</th>
                    <th className="px-3 py-2 font-medium">Se importa como</th>
                  </tr>
                </thead>
                <tbody>
                  {cabeceras.map((c, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-1.5 font-medium">{c || `(columna ${i + 1})`}</td>
                      <td className="max-w-56 truncate px-3 py-1.5 text-muted-foreground">{filas.find((f) => (f[i] || "").trim())?.[i] || "—"}</td>
                      <td className="px-3 py-1.5">
                        <select
                          className="h-8 w-full rounded-md border bg-background px-2 text-sm"
                          value={mapeo[i]}
                          onChange={(e) => cambiar(i, e.target.value as DestinoColumna)}
                          aria-label={`Destino de ${c}`}
                        >
                          {CAMPOS_LEAD.map((f) => (
                            <option key={f.campo} value={f.campo}>
                              {f.etiqueta}
                            </option>
                          ))}
                          <option value="extra">Guardar como dato extra</option>
                          <option value="ignorar">No importar</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {duplicados.length > 0 && <p className="text-sm text-destructive">Hay dos columnas asignadas al mismo campo. Cambia una de ellas.</p>}
            {!tieneNombre && !tieneEmail && <p className="text-sm text-destructive">Elige al menos la columna de la empresa o la del email.</p>}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ilGrupo">Grupo / oleada para todos (opcional)</Label>
                <Input id="ilGrupo" placeholder="Ej.: oleada 1" value={grupo} onChange={(e) => setGrupo(e.target.value)} />
              </div>
              <label className="flex cursor-pointer items-start gap-2 pt-6 text-sm">
                <input type="checkbox" className="mt-0.5 size-4" checked={actualizar} onChange={(e) => setActualizar(e.target.checked)} />
                <span>
                  Completar los datos de los leads que ya existen
                  <span className="block text-xs text-muted-foreground">Sin marcar, los repetidos se omiten. En ningún caso se cambia su estado.</span>
                </span>
              </label>
            </div>

            {importando && (
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${progreso}%` }} />
              </div>
            )}
          </div>
        )}

        {resultado && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <TickCircle className="size-5 text-green-600" /> Importación terminada
            </p>
            <ul className="grid gap-1 sm:grid-cols-2">
              <li>Nuevos: <strong>{resultado.creados.toLocaleString("es-ES")}</strong></li>
              <li>Actualizados: <strong>{resultado.actualizados.toLocaleString("es-ES")}</strong></li>
              <li>Repetidos omitidos: <strong>{resultado.omitidos.toLocaleString("es-ES")}</strong></li>
              <li>Sin nombre ni email (descartados): <strong>{resultado.sin_datos.toLocaleString("es-ES")}</strong></li>
              <li>Importados sin email: <strong>{resultado.sin_email.toLocaleString("es-ES")}</strong></li>
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={importando} onClick={() => cerrar(false)}>
            {resultado ? "Cerrar" : "Cancelar"}
          </Button>
          {filas.length > 0 && !resultado && (
            <Button disabled={importando || (!tieneNombre && !tieneEmail) || duplicados.length > 0} onClick={importar}>
              {importando ? `Importando… ${progreso}%` : `Importar ${filas.length.toLocaleString("es-ES")} filas`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
