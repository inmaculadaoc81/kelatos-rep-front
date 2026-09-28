"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { enviarV2 } from "@/components/agentes-v2/use-v2";
import { cn } from "@/lib/utils";
import { Campo, Selector } from "./campos";
import { DURACIONES_REEL, NOMBRE_PLATAFORMA_REEL, PLATAFORMAS_REEL, type DuracionReel, type PlataformaReel } from "./use-reels";

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

export function NuevoReel({ abierto, onCerrar, onCreado }: { abierto: boolean; onCerrar: () => void; onCreado: (id: number) => void }) {
  const [tema, setTema] = useState("");
  const [objetivo, setObjetivo] = useState("education");
  const [publico, setPublico] = useState("");
  const [tono, setTono] = useState("professional");
  const [duracion, setDuracion] = useState<DuracionReel>(30);
  const [plataformas, setPlataformas] = useState<PlataformaReel[]>(["instagram"]);
  const [cta, setCta] = useState("");
  const [enviando, setEnviando] = useState(false);

  const alternarPlataforma = (p: PlataformaReel) => setPlataformas((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]));

  const crear = async () => {
    if (tema.trim().length < 3) return toast.error("Escribe de qué va el reel (mínimo 3 letras)");
    if (!plataformas.length) return toast.error("Elige al menos una plataforma");
    setEnviando(true);
    try {
      const r = await enviarV2<{ id: number }>("POST", "social/reels", {
        topic: tema.trim(), objective: objetivo, audience: publico.trim() || null, tone: tono, duration: duracion, platforms: plataformas, language: "es", cta: cta.trim() || null,
      });
      toast.success("Reel creado: la IA ya está escribiendo el guion");
      setTema("");
      onCreado(r.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear el reel");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && !enviando && onCerrar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo Reel / Short</DialogTitle>
          <DialogDescription>Vídeo vertical corto. Tarda 2-3 minutos: guion, escenas y subtítulos (el vídeo final todavía no se renderiza).</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Campo etiqueta="Tema" ayuda="Cuanto más concreto, mejor. Ej.: «Cómo un taller deja de perder citas con recordatorios automáticos».">
            <Textarea rows={2} value={tema} onChange={(e) => setTema(e.target.value)} maxLength={300} className="min-h-0 text-sm" autoFocus />
          </Campo>
          <Campo etiqueta="Duración">
            <div className="flex gap-1.5">
              {DURACIONES_REEL.map((d) => (
                <button key={d} type="button" onClick={() => setDuracion(d)} className={cn("h-8 flex-1 rounded-lg border text-sm transition-colors", duracion === d ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>{d}s</button>
              ))}
            </div>
          </Campo>
          <Campo etiqueta="Plataformas">
            <div className="flex flex-wrap gap-1.5">
              {PLATAFORMAS_REEL.map((p) => (
                <button key={p} type="button" onClick={() => alternarPlataforma(p)} className={cn("h-8 rounded-full border px-3 text-sm transition-colors", plataformas.includes(p) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>{NOMBRE_PLATAFORMA_REEL[p]}</button>
              ))}
            </div>
          </Campo>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Objetivo"><Selector valor={objetivo} onChange={setObjetivo} opciones={OBJETIVOS} /></Campo>
            <Campo etiqueta="Tono"><Selector valor={tono} onChange={setTono} opciones={TONOS} /></Campo>
            <Campo etiqueta="Público (opcional)"><Input value={publico} onChange={(e) => setPublico(e.target.value)} maxLength={200} placeholder="Pequeñas empresas" className="h-8 text-sm" /></Campo>
            <Campo etiqueta="Llamada a la acción (opcional)"><Input value={cta} onChange={(e) => setCta(e.target.value)} maxLength={120} className="h-8 text-sm" /></Campo>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" disabled={enviando} onClick={onCerrar}>Cancelar</Button>
          <Button disabled={enviando} onClick={crear}>{enviando ? "Creando…" : "Generar reel"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
