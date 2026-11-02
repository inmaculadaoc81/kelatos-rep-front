"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MARCAS, etiquetaDe, type CoincidenciaVideo, type Empleado, type Marca } from "@/lib/contenido";

export const SIN_VALOR = "__ninguno__";

/** Marca de la pieza: Tech4you, Dyson, Kelatos… */
export function SelectMarca({ id, valor, onChange }: { id: string; valor: Marca | ""; onChange: (v: Marca | "") => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>¿Qué marca?</Label>
      <Select value={valor || SIN_VALOR} onValueChange={(v) => onChange((v && v !== SIN_VALOR ? v : "") as Marca | "")}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue>{(v: string) => (v === SIN_VALOR ? "—" : etiquetaDe(MARCAS, v as Marca))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SIN_VALOR}>—</SelectItem>
          {MARCAS.map((x) => <SelectItem key={x.valor} value={x.valor}>{x.etiqueta}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Persona a la que se asigna la pieza (empleados activos). */
export function SelectAsignado({ id, valor, onChange, empleados }: { id: string; valor: string; onChange: (v: string) => void; empleados: Empleado[] }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Asignada a</Label>
      <Select value={valor || SIN_VALOR} onValueChange={(v) => onChange(v && v !== SIN_VALOR ? v : "")}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue>{(v: string) => (v === SIN_VALOR ? "Sin asignar" : empleados.find((e) => String(e.id) === v)?.nombre ?? v)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SIN_VALOR}>Sin asignar</SelectItem>
          {[...empleados].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).map((x) => (
            <SelectItem key={x.id} value={String(x.id)}>{x.nombre}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Empleados activos para el selector de asignación. */
export function useEmpleados(abierto: boolean) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  useEffect(() => {
    if (!abierto) return;
    let activo = true;
    fetch("/api/asistencia/kiosk/contenido/empleados")
      .then((r) => r.json())
      .then((d) => { if (activo && d.ok) setEmpleados(d.empleados as Empleado[]); })
      .catch(() => {});
    return () => { activo = false; };
  }, [abierto]);
  return empleados;
}

/** Enlace del video ya subido, con aviso si otra pieza tiene el mismo video. */
export function CampoEnlaceVideo({ id, valor, onChange, excluirId }: { id: string; valor: string; onChange: (v: string) => void; excluirId?: number | null }) {
  const [coincidencias, setCoincidencias] = useState<CoincidenciaVideo[]>([]);

  useEffect(() => {
    const enlace = valor.trim();
    if (!/^https?:\/\//i.test(enlace)) { setCoincidencias([]); return; }
    let activo = true;
    const t = setTimeout(() => {
      const q = new URLSearchParams({ enlace });
      if (excluirId) q.set("excluir", String(excluirId));
      fetch(`/api/asistencia/kiosk/contenido/coincidencias?${q}`)
        .then((r) => r.json())
        .then((d) => { if (activo) setCoincidencias(d.ok ? (d.coincidencias as CoincidenciaVideo[]) : []); })
        .catch(() => {});
    }, 500);
    return () => { activo = false; clearTimeout(t); };
  }, [valor, excluirId]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Enlace del video</Label>
      <Input id={id} value={valor} onChange={(e) => onChange(e.target.value)} placeholder="https://… (cuando ya esté subido)" />
      {coincidencias.length > 0 && (
        <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-semibold">⚠ Este video ya está registrado</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {coincidencias.map((c) => (
              <li key={c.id}>«{c.titulo}»{c.marca ? ` · ${etiquetaDe(MARCAS, c.marca)}` : ""}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
