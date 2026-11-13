"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DocumentUpload } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiComercial, type AgenteComercial, type ListaComercial } from "@/lib/comercial";
import { cn } from "@/lib/utils";
import { CAMPOS, adivinarMapa, construirFilas, decodificar, parsearTabla, type CampoImportacion } from "./importar";

const NINGUNO = "__ninguno";
const TANDA = 500;

/** Listas de empresas: importar un CSV (o pegar desde Excel), repartir cada lista a un agente y ver cómo avanza. */
export default function ListasPage() {
  const [listas, setListas] = useState<ListaComercial[] | null>(null);
  const [agentes, setAgentes] = useState<AgenteComercial[]>([]);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [l, a] = await Promise.all([apiComercial<{ listas: ListaComercial[] }>("listas"), apiComercial<{ agentes: AgenteComercial[] }>("agentes")]);
      setListas(l.listas); setAgentes(a.agentes); setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void cargar(), 0);
    return () => clearTimeout(t);
  }, [cargar]);

  async function cambiarAsignacion(l: ListaComercial, valor: string) {
    try {
      await apiComercial(`listas/${l.id}`, { metodo: "PATCH", cuerpo: { asignadoA: valor === NINGUNO ? null : valor } });
      toast.success("Lista reasignada");
      void cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo reasignar");
    }
  }

  async function alternarActiva(l: ListaComercial) {
    try {
      await apiComercial(`listas/${l.id}`, { metodo: "PATCH", cuerpo: { activa: !l.activa } });
      toast.success(l.activa ? "Lista archivada: deja de salir en las colas" : "Lista activada");
      void cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar");
    }
  }

  const activos = agentes.filter((a) => a.activo);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Listas e importación</h1>
        <p className="text-sm text-muted-foreground">Importa las bases de datos de empresas, asigna cada lista a un agente y sigue su avance.</p>
      </div>

      <Importador agentes={activos} onImportada={() => void cargar()} />

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      {!listas && !error && <Skeleton className="h-40 w-full" />}
      {listas && listas.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Todavía no hay listas. Importa la primera arriba.</p>}
      {listas && listas.length > 0 && (
        <ul className="space-y-3">
          {listas.map((l) => (
            <li key={l.id} className={cn("rounded-xl border bg-card p-4 shadow-sm", !l.activa && "opacity-60")}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{l.nombre}{!l.activa && <span className="ml-2 text-xs font-normal text-muted-foreground">(archivada)</span>}</div>
                  <div className="text-xs text-muted-foreground">{l.total.toLocaleString("es-ES")} empresas · creada el {new Date(l.creada_en).toLocaleDateString("es-ES")}</div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">Asignada a</label>
                  <Select value={l.asignado_a || NINGUNO} onValueChange={(v) => v && cambiarAsignacion(l, v)}>
                    <SelectTrigger className="h-9 w-56" aria-label="Asignada a"><SelectValue>{(v: string) => (v === NINGUNO ? "Sin asignar" : agentes.find((a) => a.email === v)?.nombre ?? v)}</SelectValue></SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectItem value={NINGUNO}>Sin asignar</SelectItem>
                      {activos.map((a) => <SelectItem key={a.email} value={a.email}>{a.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="sm" onClick={() => alternarActiva(l)}>{l.activa ? "Archivar" : "Activar"}</Button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
                {[
                  ["Pendientes", l.pendientes], ["En curso", l.en_curso], ["Interesados", l.interesados],
                  ["Reuniones", l.reuniones], ["Ventas", l.ganados], ["Descartados", l.descartados],
                ].map(([t, v]) => (
                  <div key={t as string} className="rounded-lg bg-muted/40 px-2 py-1.5">
                    <div className="text-[11px] text-muted-foreground">{t}</div>
                    <div className="font-semibold tabular-nums">{v}</div>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Importador({ agentes, onImportada }: { agentes: AgenteComercial[]; onImportada: () => void }) {
  const [texto, setTexto] = useState("");
  const [tieneCabecera, setTieneCabecera] = useState(true);
  const [mapa, setMapa] = useState<Record<CampoImportacion, number> | null>(null);
  const [nombre, setNombre] = useState("");
  const [asignado, setAsignado] = useState(NINGUNO);
  const [progreso, setProgreso] = useState<{ hechas: number; total: number } | null>(null);
  const [resultado, setResultado] = useState<{ nuevos: number; duplicados: number; invalidos: number } | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  const tabla = useMemo(() => (texto.trim() ? parsearTabla(texto) : []), [texto]);
  const cabecera = tieneCabecera && tabla.length ? tabla[0] : null;
  const filasDatos = tieneCabecera ? tabla.slice(1) : tabla;
  const columnas = Math.max(0, ...tabla.slice(0, 50).map((f) => f.length));
  const mapaFinal = useMemo(() => mapa ?? adivinarMapa(cabecera ?? []), [mapa, cabecera]);
  const etiquetaColumna = (i: number) => (cabecera && cabecera[i] ? cabecera[i] : `Columna ${i + 1}`);
  const listo = filasDatos.length > 0 && mapaFinal.empresa >= 0 && mapaFinal.telefono >= 0 && nombre.trim().length > 0;

  async function leerArchivo(f: File | undefined) {
    if (!f) return;
    if (/\.xlsx?$/i.test(f.name)) return toast.error("De Excel, guarda el archivo como CSV o copia las celdas y pégalas en el cuadro de abajo.");
    setTexto(decodificar(await f.arrayBuffer()));
    setMapa(null); setResultado(null);
    if (!nombre.trim()) setNombre(f.name.replace(/\.[^.]+$/, ""));
  }

  async function importar() {
    const filas = construirFilas(filasDatos, cabecera, mapaFinal);
    setProgreso({ hechas: 0, total: filas.length }); setResultado(null);
    let listaId: number | undefined;
    const suma = { nuevos: 0, duplicados: 0, invalidos: 0 };
    try {
      for (let i = 0; i < filas.length; i += TANDA) {
        const d = await apiComercial<{ listaId: number; nuevos: number; duplicados: number; invalidos: number }>("listas/importar", {
          metodo: "POST",
          cuerpo: { nombre: nombre.trim(), asignadoA: asignado === NINGUNO ? undefined : asignado, listaId, filas: filas.slice(i, i + TANDA) },
        });
        listaId = d.listaId;
        suma.nuevos += d.nuevos; suma.duplicados += d.duplicados; suma.invalidos += d.invalidos;
        setProgreso({ hechas: Math.min(i + TANDA, filas.length), total: filas.length });
      }
      setResultado(suma);
      toast.success(`Importadas ${suma.nuevos} empresas`);
      setTexto(""); setMapa(null); setNombre("");
      onImportada();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "La importación se interrumpió");
      if (listaId) onImportada();
    } finally {
      setProgreso(null);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-primary"><DocumentUpload className="size-4" /> Importar una lista</h2>
      <div className="flex flex-wrap items-center gap-3">
        <input ref={entrada} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={(e) => { void leerArchivo(e.target.files?.[0]); e.target.value = ""; }} />
        <Button variant="outline" onClick={() => entrada.current?.click()}>Elegir archivo CSV</Button>
        <span className="text-sm text-muted-foreground">o pega aquí las filas copiadas desde Excel (con la fila de títulos):</span>
      </div>
      <Textarea value={texto} onChange={(e) => { setTexto(e.target.value); setMapa(null); setResultado(null); }} placeholder={"Empresa\tTeléfono\tCiudad\nClínica Sol\t912345678\tMadrid"} className="min-h-24 font-mono text-xs" />

      {tabla.length > 0 && (
        <>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={tieneCabecera} onChange={(e) => { setTieneCabecera(e.target.checked); setMapa(null); }} /> La primera fila son los títulos de las columnas</label>
          <div>
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">Qué es cada dato ({filasDatos.length.toLocaleString("es-ES")} filas detectadas)</div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {CAMPOS.map((c) => (
                <div key={c.campo}>
                  <label className="mb-0.5 block text-[11px] text-muted-foreground">{c.etiqueta}{c.obligatorio ? " *" : ""}</label>
                  <Select value={String(mapaFinal[c.campo])} onValueChange={(v) => v !== null && setMapa({ ...mapaFinal, [c.campo]: Number(v) })}>
                    <SelectTrigger className={cn("h-8 w-full text-xs", c.obligatorio && mapaFinal[c.campo] < 0 && "border-amber-400")}><SelectValue>{(v: string) => (Number(v) < 0 ? "— no importar —" : etiquetaColumna(Number(v)))}</SelectValue></SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectItem value="-1">— no importar —</SelectItem>
                      {Array.from({ length: columnas }).map((_, i) => <SelectItem key={i} value={String(i)}>{etiquetaColumna(i)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground"><tr>{CAMPOS.filter((c) => mapaFinal[c.campo] >= 0).map((c) => <th key={c.campo} className="px-2 py-1 text-left font-medium">{c.etiqueta}</th>)}</tr></thead>
              <tbody>
                {filasDatos.slice(0, 5).map((f, i) => (
                  <tr key={i} className="border-t">{CAMPOS.filter((c) => mapaFinal[c.campo] >= 0).map((c) => <td key={c.campo} className="max-w-48 truncate px-2 py-1">{f[mapaFinal[c.campo]] || ""}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Nombre de la lista *</label>
              <Input className="w-64" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Clínicas Madrid noviembre" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Asignar a</label>
              <Select value={asignado} onValueChange={(v) => v && setAsignado(v)}>
                <SelectTrigger className="h-9 w-56" aria-label="Asignar a"><SelectValue>{(v: string) => (v === NINGUNO ? "Sin asignar todavía" : agentes.find((a) => a.email === v)?.nombre ?? v)}</SelectValue></SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value={NINGUNO}>Sin asignar todavía</SelectItem>
                  {agentes.map((a) => <SelectItem key={a.email} value={a.email}>{a.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={importar} disabled={!listo || !!progreso}>{progreso ? `Importando… ${progreso.hechas}/${progreso.total}` : `Importar ${filasDatos.length.toLocaleString("es-ES")} empresas`}</Button>
          </div>
          <p className="text-xs text-muted-foreground">Los teléfonos repetidos dentro de la lista se ignoran, y los de 9 cifras se completan con +34. Las columnas que no asignes se guardan como datos extra de la ficha.</p>
        </>
      )}

      {resultado && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
          Importadas {resultado.nuevos} empresas · {resultado.duplicados} repetidas ignoradas · {resultado.invalidos} sin teléfono válido o sin nombre.
        </div>
      )}
    </section>
  );
}
