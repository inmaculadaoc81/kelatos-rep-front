"use client";

import { useState, type ReactNode } from "react";
import { Vacio } from "@/components/agentes-v2/componentes";
import type { DetalleDepartamento } from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";
import { PestanaHorario } from "../bloques-departamento";
import { CarruselesLista } from "./carruseles-lista";
import { EditorCarrusel } from "./editor-carrusel";
import { EditorPost } from "./editor-post";
import { EditorReel } from "./editor-reel";
import { Estrategia } from "./estrategia";
import { MarcaDialog } from "./marca-dialog";
import { PostsLista } from "./posts-lista";
import { ReelsLista } from "./reels-lista";
import { Resumen } from "./resumen";
import { Temas } from "./temas";

type Vista = "overview" | "carruseles" | "posts" | "temas" | "estrategia" | "horario" | "reels" | "calendario" | "borradores";

const NAV: { valor: Vista; texto: string; activo: boolean; ayuda?: string }[] = [
  { valor: "overview", texto: "Resumen", activo: true },
  { valor: "carruseles", texto: "Carruseles", activo: true },
  { valor: "posts", texto: "Posts", activo: true },
  { valor: "reels", texto: "Reels / Shorts", activo: true, ayuda: "Vídeo vertical corto — todavía sin render de vídeo real" },
  { valor: "temas", texto: "Temas y cola", activo: true },
  { valor: "estrategia", texto: "Estrategia", activo: true },
  { valor: "horario", texto: "Horario", activo: true },
  { valor: "calendario", texto: "Calendario", activo: false, ayuda: "Calendario de publicación (lo hará tu workflow de n8n)" },
  { valor: "borradores", texto: "Borradores", activo: false, ayuda: "Todo lo pendiente de revisar" },
];

/** Departamento «Redes sociales»: agente de carruseles (manual y automático) con su estrategia, cola de temas y horario. */
export function SocialPanel({ d, recargar, cabecera }: { d: DetalleDepartamento; recargar: () => void; cabecera: ReactNode }) {
  const [vista, setVista] = useState<Vista>("overview");
  const [abierto, setAbierto] = useState<number | null>(null);
  const [abiertoPost, setAbiertoPost] = useState<number | null>(null);
  const [abiertoReel, setAbiertoReel] = useState<number | null>(null);
  const [marca, setMarca] = useState(false);
  const cambiar = (v: Vista) => {
    setVista(v);
    setAbierto(null);
    setAbiertoPost(null);
    setAbiertoReel(null);
  };
  const abrirCarrusel = (id: number) => {
    setVista("carruseles");
    setAbierto(id);
  };
  const pendiente = NAV.find((n) => n.valor === vista && !n.activo);

  return (
    <div className="-m-6 grid items-stretch md:min-h-[calc(100vh-3.5rem)] md:grid-cols-[220px_minmax(0,1fr)]">
      <div className="min-w-0 space-y-5 p-6">
        {cabecera}
        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible" aria-label="Redes sociales">
          {NAV.map((n, i) => (
            <button
              key={n.valor}
              type="button"
              onClick={() => cambiar(n.valor)}
              aria-current={vista === n.valor ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                vista === n.valor ? "bg-muted font-medium" : "hover:bg-muted/60",
                !n.activo && "text-muted-foreground",
                !n.activo && NAV[i - 1]?.activo && "md:mt-3",
              )}
            >
              {n.texto}
              {!n.activo && <span className="rounded-full border px-1.5 text-[10px] font-normal">pronto</span>}
            </button>
          ))}
          <button type="button" onClick={() => setMarca(true)} className="mt-2 hidden rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted/60 md:block">Marca…</button>
        </nav>
      </div>
      <main className="min-w-0 border-t bg-muted p-6 md:border-t-0 md:border-l">
        {vista === "overview" && <Resumen d={d} recargar={recargar} ir={cambiar} />}
        {vista === "carruseles" && (abierto === null ? <CarruselesLista onAbrir={setAbierto} /> : <EditorCarrusel key={abierto} id={abierto} onVolver={() => setAbierto(null)} />)}
        {vista === "posts" && (abiertoPost === null ? <PostsLista onAbrir={setAbiertoPost} /> : <EditorPost key={abiertoPost} id={abiertoPost} onVolver={() => setAbiertoPost(null)} />)}
        {vista === "reels" && (abiertoReel === null ? <ReelsLista onAbrir={setAbiertoReel} /> : <EditorReel key={abiertoReel} id={abiertoReel} onVolver={() => setAbiertoReel(null)} />)}
        {vista === "temas" && <Temas onAbrirCarrusel={abrirCarrusel} />}
        {vista === "estrategia" && <Estrategia />}
        {vista === "horario" && <PestanaHorario d={d} recargar={recargar} />}
        {pendiente && <Vacio titulo={`${pendiente.texto}: próximamente`} texto={`${pendiente.ayuda}. Todavía no está disponible.`} />}
      </main>
      <MarcaDialog abierto={marca} onCerrar={() => setMarca(false)} />
    </div>
  );
}
