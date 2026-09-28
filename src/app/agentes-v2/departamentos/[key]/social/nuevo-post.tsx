"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { enviarV2 } from "@/components/agentes-v2/use-v2";
import { Campo, Selector } from "./campos";
import { LAYOUTS, type LayoutTipo } from "./use-posts";

const OBJETIVOS = [
  { valor: "education", texto: "Educar (enseñar algo útil)" },
  { valor: "awareness", texto: "Darse a conocer" },
  { valor: "conversion", texto: "Conseguir clientes" },
  { valor: "engagement", texto: "Generar interacción" },
  { valor: "authority", texto: "Mostrar autoridad" },
];
const TONOS = [
  { valor: "professional", texto: "Profesional" },
  { valor: "friendly", texto: "Cercano" },
  { valor: "inspiring", texto: "Inspirador" },
  { valor: "direct", texto: "Directo" },
  { valor: "playful", texto: "Divertido" },
];

export function NuevoPost({ abierto, onCerrar, onCreado }: { abierto: boolean; onCerrar: () => void; onCreado: (id: number) => void }) {
  const [tema, setTema] = useState("");
  const [objetivo, setObjetivo] = useState("education");
  const [publico, setPublico] = useState("");
  const [tono, setTono] = useState("professional");
  const [layout, setLayout] = useState<LayoutTipo>("educational_card");
  const [cta, setCta] = useState("");
  const [url, setUrl] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  const crear = async () => {
    if (tema.trim().length < 3) return toast.error("Escribe de qué va el post (mínimo 3 letras)");
    setEnviando(true);
    try {
      const r = await enviarV2<{ id: number }>("POST", "social/posts", {
        topic: tema.trim(), objective: objetivo, audience: publico.trim() || null, tone: tono, layoutType: layout, language: "es",
        cta: cta.trim() || null, sourceUrl: url.trim() || null, sourceText: texto.trim() || null,
      });
      toast.success("Post creado: la IA ya está trabajando en él");
      setTema("");
      onCreado(r.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear el post");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && !enviando && onCerrar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo post</DialogTitle>
          <DialogDescription>Una sola imagen, con su propio tema (no reutiliza el de ningún carrusel). Tarda 1-2 minutos: copy, diseño, dibujo y adaptación a cada red.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Campo etiqueta="Tema" ayuda="Cuanto más concreto, mejor. Ej.: «Recordatorios automáticos de citas para clínicas».">
            <Textarea rows={2} value={tema} onChange={(e) => setTema(e.target.value)} maxLength={300} className="min-h-0 text-sm" autoFocus />
          </Campo>
          <Campo etiqueta="Formato de la pieza">
            <Selector valor={layout} onChange={setLayout} opciones={LAYOUTS.map((l) => ({ valor: l.valor, texto: l.texto }))} />
            <p className="text-[11px] text-muted-foreground">{LAYOUTS.find((l) => l.valor === layout)?.ayuda}</p>
          </Campo>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Objetivo"><Selector valor={objetivo} onChange={setObjetivo} opciones={OBJETIVOS} /></Campo>
            <Campo etiqueta="Tono"><Selector valor={tono} onChange={setTono} opciones={TONOS} /></Campo>
            <Campo etiqueta="Público (opcional)"><Input value={publico} onChange={(e) => setPublico(e.target.value)} maxLength={200} placeholder="Pequeñas empresas" className="h-8 text-sm" /></Campo>
            <Campo etiqueta="Llamada a la acción (opcional)"><Input value={cta} onChange={(e) => setCta(e.target.value)} maxLength={120} className="h-8 text-sm" /></Campo>
          </div>
          {(layout === "quote" || layout === "testimonial" || layout === "statistic") && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-amber-800 dark:text-amber-300">
              {layout === "statistic" ? "Este formato necesita una cifra real: escríbela abajo en «Texto de partida» o la IA usará un formato genérico." : "Este formato necesita una cita real: escríbela abajo en «Texto de partida» o la IA usará un formato genérico."}
            </p>
          )}
          <details className="rounded-lg border p-2.5 text-sm">
            <summary className="cursor-pointer text-xs font-medium">Basarse en un artículo o un texto (opcional)</summary>
            <div className="mt-2.5 space-y-3">
              <Campo etiqueta="Enlace"><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="h-8 text-sm" /></Campo>
              <Campo etiqueta="Texto de partida" ayuda="La IA solo usará datos que aparezcan aquí; no se inventa cifras ni citas."><Textarea rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={6000} className="min-h-0 text-sm" /></Campo>
            </div>
          </details>
        </div>
        <DialogFooter>
          <Button variant="ghost" disabled={enviando} onClick={onCerrar}>Cancelar</Button>
          <Button disabled={enviando} onClick={crear}>{enviando ? "Creando…" : "Generar post"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
