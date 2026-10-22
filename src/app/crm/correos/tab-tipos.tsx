"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIAS_TIPO, chipCategoriaTipo, llamarCorreos, nombreCategoriaTipo, type CategoriaTipo, type TipoCorreo } from "@/lib/crm-correos";
import { useApi } from "../use-api";

const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm";
const EJEMPLO: Record<string, string> = { "{{nombre}}": "María", "{{web}}": "Kelatos" };
const rellenar = (t: string) => Object.entries(EJEMPLO).reduce((s, [k, v]) => s.split(k).join(v), t);

export function TabTipos() {
  const [recarga, setRecarga] = useState(0);
  const { datos, error } = useApi<{ ok: boolean; tipos: TipoCorreo[] }>("/api/crm/correos/tipos", recarga);
  const [editando, setEditando] = useState<TipoCorreo | "nuevo" | null>(null);

  async function alternar(t: TipoCorreo, activo: boolean) {
    try {
      await llamarCorreos(`tipos/${t.id}`, "PATCH", { activo });
      setRecarga((n) => n + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-muted-foreground">Las plantillas de correo que se podrán enviar: una promoción, un seguimiento, una bienvenida… Cada campaña usa uno de estos tipos. Escribe {"{{nombre}}"} donde quieras el nombre de la persona.</p>
        <Button className="gap-1.5" onClick={() => setEditando("nuevo")}><Plus className="size-4" /> Nuevo tipo</Button>
      </div>
      {error && <p className="text-sm text-destructive">No se pudo cargar: {error}</p>}
      {!datos && !error && <Skeleton className="h-48 w-full" />}
      {datos && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {datos.tipos.map((t) => (
            <Card key={t.id} className={t.activo ? "" : "opacity-60"}>
              <CardContent className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{t.nombre}</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${chipCategoriaTipo(t.categoria)}`}>{nombreCategoriaTipo(t.categoria)}</span>
                  </div>
                  <Switch checked={t.activo} onCheckedChange={(v) => alternar(t, v === true)} aria-label={`Activar ${t.nombre}`} />
                </div>
                {t.descripcion && <p className="text-xs text-muted-foreground">{t.descripcion}</p>}
                <div className="rounded-md border bg-muted/30 p-2 text-xs">
                  <p className="font-medium">{rellenar(t.asunto)}</p>
                  <p className="mt-1 line-clamp-3 whitespace-pre-line text-muted-foreground">{rellenar(t.cuerpo)}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditando(t)}>Editar y ver</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {editando !== null && <EditorTipo tipo={editando === "nuevo" ? null : editando} onCerrar={() => setEditando(null)} onGuardado={() => { setEditando(null); setRecarga((n) => n + 1); }} />}
    </div>
  );
}

function EditorTipo({ tipo, onCerrar, onGuardado }: { tipo: TipoCorreo | null; onCerrar: () => void; onGuardado: () => void }) {
  const [nombre, setNombre] = useState(tipo?.nombre ?? "");
  const [categoria, setCategoria] = useState<CategoriaTipo>(tipo?.categoria ?? "promocion");
  const [descripcion, setDescripcion] = useState(tipo?.descripcion ?? "");
  const [asunto, setAsunto] = useState(tipo?.asunto ?? "");
  const [cuerpo, setCuerpo] = useState(tipo?.cuerpo ?? "");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!nombre.trim() || !asunto.trim() || !cuerpo.trim()) { toast.error("Rellena nombre, asunto y mensaje"); return; }
    setGuardando(true);
    try {
      const datos = { nombre, categoria, descripcion, asunto, cuerpo };
      if (tipo) await llamarCorreos(`tipos/${tipo.id}`, "PATCH", datos);
      else await llamarCorreos("tipos", "POST", datos);
      toast.success("Tipo de correo guardado");
      onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !guardando) onCerrar(); }}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{tipo ? "Editar tipo de correo" : "Nuevo tipo de correo"}</DialogTitle>
          <DialogDescription>A la derecha ves cómo quedaría con un nombre de ejemplo. No se envía nada.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nombre</Label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={120} /></div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <select className={SELECT} value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaTipo)}>{CATEGORIAS_TIPO.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
            </div>
            <div className="space-y-1.5"><Label>Para qué sirve (opcional)</Label><Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={300} /></div>
            <div className="space-y-1.5"><Label>Asunto</Label><Input value={asunto} onChange={(e) => setAsunto(e.target.value)} maxLength={200} /></div>
            <div className="space-y-1.5"><Label>Mensaje</Label><Textarea rows={10} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} maxLength={8000} /></div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p className="text-xs text-muted-foreground">Vista previa</p>
            <p className="mt-2 font-semibold">{rellenar(asunto) || "(sin asunto)"}</p>
            <p className="mt-3 whitespace-pre-line">{rellenar(cuerpo) || "(sin mensaje)"}</p>
            <p className="mt-4 border-t pt-2 text-[11px] text-muted-foreground">Al final de cada correo se añadirá el enlace de baja.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={guardando} onClick={onCerrar}>Cancelar</Button>
          <Button disabled={guardando} onClick={guardar}>{guardando ? "Guardando…" : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
