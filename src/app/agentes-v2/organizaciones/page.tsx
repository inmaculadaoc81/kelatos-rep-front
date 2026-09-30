"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Add, ArrowRight2, Building } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useV2, enviarV2 } from "@/components/agentes-v2/use-v2";
import { Cabecera, CargandoFilas, ErrorCaja, Vacio } from "@/components/agentes-v2/componentes";
import { useOrganizacion } from "../organizacion-context";
import { COLOR_ESTADO_ORGANIZACION, ETIQUETA_ESTADO_ORGANIZACION, type Organizacion } from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";

const CLAVE_RE = /^[a-z][a-z0-9_]{1,40}$/;

function DialogoNuevaOrganizacion({ open, onOpenChange, onCreada }: { open: boolean; onOpenChange: (o: boolean) => void; onCreada: () => void }) {
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [enviando, setEnviando] = useState(false);

  const limpiar = () => { setKey(""); setName(""); setDescription(""); };

  async function crear() {
    if (!name.trim()) return toast.error("El nombre es obligatorio");
    if (!CLAVE_RE.test(key)) return toast.error("La clave debe empezar por una letra y usar solo minúsculas, números y guion bajo (p. ej. dyson_reparaciones)");
    setEnviando(true);
    try {
      await enviarV2("POST", "organizations", { key, name: name.trim(), description: description.trim() });
      toast.success(`Organización «${name.trim()}» creada`);
      onOpenChange(false);
      limpiar();
      onCreada();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!enviando) { onOpenChange(o); if (!o) limpiar(); } }}>
      <DialogContent className="max-w-lg" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Building className="size-5" /> Nueva organización</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Nombre *</Label>
            <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="p. ej. Dyson Reparaciones" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-key">Clave *</Label>
            <Input id="org-key" value={key} onChange={(e) => setKey(e.target.value.toLowerCase())} placeholder="dyson_reparaciones" />
            <p className="text-xs text-muted-foreground">Identificador interno, no se muestra al público. Solo minúsculas, números y guion bajo.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-desc">Descripción</Label>
            <Textarea id="org-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Reparación de electrodomésticos Dyson" />
          </div>
          <p className="text-xs text-muted-foreground">Las credenciales de Instagram y el sitio SEO se configuran después, desde la ficha de la organización.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>Cancelar</Button>
          <Button onClick={crear} disabled={enviando}>{enviando ? "Creando…" : "Crear organización"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function OrganizacionesPage() {
  const { datos, error, cargando, recargar } = useV2<{ ok: boolean; organizations: Organizacion[] }>("organizations");
  const { recargar: recargarSelector } = useOrganizacion();
  const [dialogoAbierto, setDialogoAbierto] = useState(false);

  const alCrear = () => {
    recargar();
    recargarSelector();
  };

  return (
    <div>
      <Cabecera
        titulo="Organizaciones"
        descripcion="Cada organización es una mini-empresa o marca independiente: su propia web, su propio Instagram y su propio contenido, nunca mezclados con los de otra."
        acciones={<Button onClick={() => setDialogoAbierto(true)}><Add className="size-4" /> Nueva organización</Button>}
      />
      {error && <ErrorCaja mensaje={error} />}
      {cargando && !datos ? (
        <CargandoFilas n={3} />
      ) : datos && datos.organizations.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {datos.organizations.map((o) => (
            <Link key={o.id} href={`/agentes-v2/organizaciones/${o.id}`} className="group flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/40">
              <div className="flex items-start justify-between gap-2">
                <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary"><Building className="size-5" /></span>
                <span className={cn("inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium", COLOR_ESTADO_ORGANIZACION[o.status])}>{ETIQUETA_ESTADO_ORGANIZACION[o.status]}</span>
              </div>
              <div>
                <p className="font-medium">{o.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{o.key}</p>
                {o.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{o.description}</p>}
              </div>
              <div className="mt-auto flex items-center justify-end text-xs text-muted-foreground">
                <ArrowRight2 className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Vacio titulo="Todavía no hay ninguna organización" texto="Crea la primera para empezar a separar sus carruseles, posts, blog e Instagram del resto." />
      )}
      <DialogoNuevaOrganizacion open={dialogoAbierto} onOpenChange={setDialogoAbierto} onCreada={alCrear} />
    </div>
  );
}
