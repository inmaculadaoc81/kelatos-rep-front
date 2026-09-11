"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { TickCircle, CloseCircle, Save2 } from "@/lib/icons";
import { type AppCategory, mapearCategoria } from "@/lib/remote-workers";
import { AppIcon } from "../app-icon";

const FORM_VACIO = { applicationName: "", category: "", productive: true };

/** Clasificación de aplicaciones (Fase 1 de Remote Work): qué ejecutable
    pertenece a qué categoría y si cuenta como tiempo productivo. Se usa
    para calcular "Productividad por categoría" en el detalle de cada
    dispositivo, en contraste con la "Productividad técnica"
    (active/(active+idle), que no sabe qué app se usó). */
export default function CategoriasAplicacionesPage() {
  const [categorias, setCategorias] = useState<AppCategory[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch("/api/asistencia/admin/remote-workers/categorias");
      const data = await res.json();
      if (data.ok) setCategorias((data.categorias as Record<string, unknown>[]).map(mapearCategoria));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function editar(c: AppCategory) {
    setForm({ applicationName: c.applicationName, category: c.category, productive: c.productive });
  }

  async function guardar() {
    if (!form.applicationName.trim()) return toast.error("El nombre del ejecutable es obligatorio");
    if (!form.category.trim()) return toast.error("La categoría es obligatoria");
    setGuardando(true);
    try {
      const res = await fetch("/api/asistencia/admin/remote-workers/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Categoría guardada");
      setForm(FORM_VACIO);
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Categorías de aplicaciones</h1>
        <p className="text-xs text-muted-foreground">
          Clasifica los ejecutables que ya han sincronizado (ej. &quot;chrome.exe&quot;) para calcular la productividad por categoría en el detalle de cada dispositivo.
        </p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
            <div className="space-y-1">
              <Label>Ejecutable</Label>
              <Input placeholder="chrome.exe" value={form.applicationName} onChange={(e) => setForm((f) => ({ ...f, applicationName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Categoría</Label>
              <Input placeholder="browser, development, office…" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Checkbox checked={form.productive} onCheckedChange={(v) => setForm((f) => ({ ...f, productive: v === true }))} />
              <Label className="font-normal">Cuenta como productivo</Label>
            </div>
            <Button className="gap-1.5" onClick={guardar} disabled={guardando}><Save2 className="size-3.5" /> {guardando ? "Guardando…" : "Guardar"}</Button>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ejecutable</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Productivo</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 4 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            ))}
            {!cargando && categorias.length === 0 && (
              <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Sin categorías todavía</TableCell></TableRow>
            )}
            {!cargando && categorias.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <span className="inline-flex items-center gap-2">
                    <AppIcon applicationName={c.applicationName} />
                    {c.applicationName}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.category}</TableCell>
                <TableCell className="text-sm">
                  {c.productive ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600"><TickCircle className="size-4" /> Sí</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted-foreground"><CloseCircle className="size-4" /> No</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => editar(c)}>Editar</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
