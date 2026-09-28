"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { enviarV2, useV2 } from "@/components/agentes-v2/use-v2";
import { ElegirActivo } from "./activos";
import { Campo, Selector } from "./campos";
import { FUENTES, type Marca } from "./use-social";

const COLORES: { clave: keyof Marca["colors"]; texto: string; ayuda: string }[] = [
  { clave: "primary", texto: "Principal", ayuda: "Portadas y fondos de marca" },
  { clave: "secondary", texto: "Secundario", ayuda: "Apoyo y textos" },
  { clave: "accent", texto: "Acento", ayuda: "Botones y detalles que destacan" },
  { clave: "dark", texto: "Fondo oscuro", ayuda: "Slides oscuras" },
  { clave: "light", texto: "Fondo claro", ayuda: "Slides claras" },
];
const HEX = /^#[0-9a-fA-F]{6}$/;

function CampoColor({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <input type="color" value={HEX.test(valor) ? valor : "#000000"} onChange={(e) => onChange(e.target.value)} className="size-8 shrink-0 cursor-pointer rounded border bg-transparent p-0.5" />
      <Input value={valor} onChange={(e) => onChange(e.target.value)} maxLength={7} className={`h-8 font-mono text-xs uppercase ${HEX.test(valor) ? "" : "border-red-500"}`} />
    </div>
  );
}

function FormularioMarca({ inicial, alGuardar, onCerrar }: { inicial: Marca; alGuardar: () => void; onCerrar: () => void }) {
  const [m, setM] = useState<Marca>(() => structuredClone(inicial));
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!Object.values(m.colors).every((c) => HEX.test(c))) return toast.error("Revisa los colores: deben ser del tipo #1d4ed8");
    setGuardando(true);
    try {
      await enviarV2("PUT", "social/brand", m);
      toast.success("Marca guardada. Se usará en los carruseles nuevos.");
      alGuardar();
      onCerrar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar la marca");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
        <DialogHeader>
          <DialogTitle>Marca</DialogTitle>
          <DialogDescription>Colores, tipografías y logo que usa la IA al diseñar. Los carruseles ya creados conservan la marca con la que se hicieron.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Nombre de la marca"><Input value={m.name} maxLength={60} onChange={(e) => setM({ ...m, name: e.target.value })} className="h-8 text-sm" /></Campo>
              <Campo etiqueta="Usuario en redes (opcional)"><Input value={m.handle ?? ""} maxLength={60} placeholder="@tumarca" onChange={(e) => setM({ ...m, handle: e.target.value || null })} className="h-8 text-sm" /></Campo>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {COLORES.map((c) => (
                <Campo key={c.clave} etiqueta={c.texto} ayuda={c.ayuda}><CampoColor valor={m.colors[c.clave]} onChange={(v) => setM({ ...m, colors: { ...m.colors, [c.clave]: v } })} /></Campo>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Fuente de los títulos"><Selector valor={m.fonts.heading} onChange={(v) => setM({ ...m, fonts: { ...m.fonts, heading: v } })} opciones={FUENTES.map((f) => ({ valor: f, texto: f }))} /></Campo>
              <Campo etiqueta="Fuente del texto"><Selector valor={m.fonts.body} onChange={(v) => setM({ ...m, fonts: { ...m.fonts, body: v } })} opciones={FUENTES.map((f) => ({ valor: f, texto: f }))} /></Campo>
              <Campo etiqueta="Esquinas"><Selector valor={m.radius} onChange={(v) => setM({ ...m, radius: v })} opciones={[{ valor: "none", texto: "Rectas" }, { valor: "sm", texto: "Poco redondeadas" }, { valor: "md", texto: "Redondeadas" }, { valor: "lg", texto: "Muy redondeadas" }, { valor: "pill", texto: "Píldora" }]} /></Campo>
              <Campo etiqueta="Espaciado"><Selector valor={m.spacing} onChange={(v) => setM({ ...m, spacing: v })} opciones={[{ valor: "compact", texto: "Compacto" }, { valor: "normal", texto: "Normal" }, { valor: "airy", texto: "Aireado" }]} /></Campo>
              <Campo etiqueta="Estilo visual"><Selector valor={m.visualStyle} onChange={(v) => setM({ ...m, visualStyle: v })} opciones={[{ valor: "tech", texto: "Tecnológico (luces, nodos y tarjetas de cristal)" }, { valor: "editorial", texto: "Editorial (serifa, líneas finas, papel)" }, { valor: "bold", texto: "Clásico (colores planos y formas)" }]} /></Campo>
              <Campo etiqueta="Tono de voz"><Input value={m.tone} maxLength={120} onChange={(e) => setM({ ...m, tone: e.target.value })} className="h-8 text-sm" /></Campo>
            </div>
            <Campo etiqueta="Logo (opcional)" ayuda="Se muestra en la cabecera de cada slide.">
              <ElegirActivo kind="logo" valor={m.logoAssetId} onChange={(id) => setM({ ...m, logoAssetId: id })} />
            </Campo>
        </div>
        <DialogFooter>
          <Button variant="ghost" disabled={guardando} onClick={onCerrar}>Cancelar</Button>
          <Button disabled={guardando} onClick={guardar}>{guardando ? "Guardando…" : "Guardar marca"}</Button>
        </DialogFooter>
    </>
  );
}

export function MarcaDialog({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const { datos, recargar } = useV2<{ ok: boolean; brand: Marca }>(abierto ? "social/brand" : null);
  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {datos?.brand ? <FormularioMarca inicial={datos.brand} alGuardar={() => void recargar()} onCerrar={onCerrar} /> : <p className="py-6 text-sm text-muted-foreground">Cargando…</p>}
      </DialogContent>
    </Dialog>
  );
}
