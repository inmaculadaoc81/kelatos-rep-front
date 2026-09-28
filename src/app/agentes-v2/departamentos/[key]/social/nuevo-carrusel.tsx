"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { enviarV2 } from "@/components/agentes-v2/use-v2";
import { Campo, Selector } from "./campos";

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
const FORMATOS = [
  { valor: "portrait", texto: "Instagram vertical 1080×1350 (4:5)" },
  { valor: "square", texto: "Cuadrado 1080×1080 — próximamente", off: true },
  { valor: "story", texto: "Story 1080×1920 — próximamente", off: true },
];

export function NuevoCarrusel({ abierto, onCerrar, onCreado }: { abierto: boolean; onCerrar: () => void; onCreado: (id: number) => void }) {
  const [tema, setTema] = useState("");
  const [objetivo, setObjetivo] = useState("education");
  const [publico, setPublico] = useState("");
  const [tono, setTono] = useState("professional");
  const [formato, setFormato] = useState("portrait");
  const [n, setN] = useState(7);
  const [cta, setCta] = useState("");
  const [url, setUrl] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  const crear = async () => {
    if (tema.trim().length < 3) return toast.error("Escribe de qué va el carrusel (mínimo 3 letras)");
    setEnviando(true);
    try {
      const r = await enviarV2<{ id: number }>("POST", "social/carousels", {
        topic: tema.trim(), objective: objetivo, audience: publico.trim() || null, tone: tono, format: formato, slideCount: n, platform: "instagram", language: "es",
        cta: cta.trim() || null, sourceUrl: url.trim() || null, sourceText: texto.trim() || null,
      });
      toast.success("Carrusel creado: la IA ya está trabajando en él");
      setTema("");
      onCreado(r.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear el carrusel");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && !enviando && onCerrar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo carrusel</DialogTitle>
          <DialogDescription>Cuéntale a la IA de qué va. Tarda unos 3-5 minutos: primero planifica el contenido, después diseña cada slide y por último las dibuja.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Campo etiqueta="Tema" ayuda="Cuanto más concreto, mejor. Ej.: «5 errores de marketing que hacen perder clientes».">
            <Textarea rows={2} value={tema} onChange={(e) => setTema(e.target.value)} maxLength={300} className="min-h-0 text-sm" autoFocus />
          </Campo>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Objetivo"><Selector valor={objetivo} onChange={setObjetivo} opciones={OBJETIVOS} /></Campo>
            <Campo etiqueta="Tono"><Selector valor={tono} onChange={setTono} opciones={TONOS} /></Campo>
            <Campo etiqueta="Público (opcional)"><Input value={publico} onChange={(e) => setPublico(e.target.value)} maxLength={200} placeholder="Pequeñas empresas" className="h-8 text-sm" /></Campo>
            <Campo etiqueta="Formato"><Selector valor={formato} onChange={setFormato} opciones={FORMATOS} /></Campo>
          </div>
          <Campo etiqueta={`Número de slides: ${n}`}>
            <input type="range" min={3} max={12} value={n} onChange={(e) => setN(Number(e.target.value))} className="w-full accent-primary" />
          </Campo>
          <Campo etiqueta="Llamada a la acción final (opcional)" ayuda="Lo que quieres que haga quien lo lea. Ej.: «Escríbenos por mensaje directo».">
            <Input value={cta} onChange={(e) => setCta(e.target.value)} maxLength={120} className="h-8 text-sm" />
          </Campo>
          <details className="rounded-lg border p-2.5 text-sm">
            <summary className="cursor-pointer text-xs font-medium">Basarse en un artículo o un texto (opcional)</summary>
            <div className="mt-2.5 space-y-3">
              <Campo etiqueta="Enlace"><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="h-8 text-sm" /></Campo>
              <Campo etiqueta="Texto de partida" ayuda="La IA solo usará datos que aparezcan aquí; no se inventa cifras."><Textarea rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={6000} className="min-h-0 text-sm" /></Campo>
            </div>
          </details>
        </div>
        <DialogFooter>
          <Button variant="ghost" disabled={enviando} onClick={onCerrar}>Cancelar</Button>
          <Button disabled={enviando} onClick={crear}>{enviando ? "Creando…" : "Generar carrusel"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
