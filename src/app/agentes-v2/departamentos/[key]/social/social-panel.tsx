"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  GalleryHorizontal,
  Image as ImageIcon,
  Film,
  ListTodo,
  Target,
  Clock,
  Tag,
  type LucideIcon,
} from "lucide-react";
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

// `liveTipo` enlaza con el `type` que devuelve GET /live/tasks
// (marketing/actividad.js: "social.carrusel"/"social.post"/"social.reel")
// — mismo endpoint que ya usa agentes-v2/sidebar.tsx para el punto azul de
// «En vivo», aquí filtrado por tipo para marcar la opción concreta que
// está generando algo en vez de un aviso genérico. Petición del usuario,
// 2026-10-01.
const NAV: { valor: Vista; texto: string; activo: boolean; ayuda?: string; icon: LucideIcon; liveTipo?: string }[] = [
  { valor: "overview", texto: "Resumen", activo: true, icon: LayoutDashboard },
  { valor: "carruseles", texto: "Carruseles", activo: true, icon: GalleryHorizontal, liveTipo: "social.carrusel" },
  { valor: "posts", texto: "Posts", activo: true, icon: ImageIcon, liveTipo: "social.post" },
  { valor: "reels", texto: "Reels / Shorts", activo: true, ayuda: "Vídeo vertical corto — todavía sin render de vídeo real", icon: Film, liveTipo: "social.reel" },
  { valor: "temas", texto: "Temas y cola", activo: true, icon: ListTodo },
  { valor: "estrategia", texto: "Estrategia", activo: true, icon: Target },
  { valor: "horario", texto: "Horario", activo: true, icon: Clock },
  { valor: "calendario", texto: "Calendario", activo: false, ayuda: "Calendario de publicación (lo hará tu workflow de n8n)", icon: Clock },
  { valor: "borradores", texto: "Borradores", activo: false, ayuda: "Todo lo pendiente de revisar", icon: ListTodo },
];

/** Departamento «Redes sociales»: agente de carruseles (manual y automático) con su estrategia, cola de temas y horario. */
export function SocialPanel({ d, recargar, cabecera }: { d: DetalleDepartamento; recargar: () => void; cabecera: ReactNode }) {
  const [vista, setVista] = useState<Vista>("overview");
  const [abierto, setAbierto] = useState<number | null>(null);
  const [abiertoPost, setAbiertoPost] = useState<number | null>(null);
  const [abiertoReel, setAbiertoReel] = useState<number | null>(null);
  const [marca, setMarca] = useState(false);
  const [tiposEnVivo, setTiposEnVivo] = useState<Set<string>>(new Set());

  // Mismo patrón y endpoint que agentes-v2/sidebar.tsx (punto azul de «En
  // vivo»), consultado cada 6s — aquí agrupado por tipo para saber qué
  // opción concreta (Carruseles/Posts/Reels) tiene algo generándose.
  useEffect(() => {
    let vivo = true;
    const tick = () =>
      fetch("/api/agentes-v2/live/tasks", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          if (!vivo || !data.ok) return;
          const tipos = (data.tasks as { type: string; state: string }[])
            .filter((t) => t.state === "running")
            .map((t) => t.type);
          setTiposEnVivo(new Set(tipos));
        })
        .catch(() => {});
    tick();
    const t = setInterval(tick, 6000);
    return () => { vivo = false; clearInterval(t); };
  }, []);

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
    <div className="-m-6 grid items-stretch md:min-h-[calc(100vh-3.5rem)] md:grid-cols-[260px_minmax(0,1fr)]">
      <div className="min-w-0 space-y-5 bg-white p-6">
        {cabecera}
        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible" aria-label="Redes sociales">
          {NAV.map((n, i) => {
            const generando = !!n.liveTipo && tiposEnVivo.has(n.liveTipo);
            return (
              <button
                key={n.valor}
                type="button"
                onClick={() => cambiar(n.valor)}
                aria-current={vista === n.valor ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  vista === n.valor ? "bg-muted font-medium" : "hover:bg-muted/60",
                  !n.activo && "text-muted-foreground",
                  !n.activo && NAV[i - 1]?.activo && "md:mt-3",
                )}
              >
                <n.icon className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{n.texto}</span>
                {generando && (
                  <span className="size-2 shrink-0 animate-pulse rounded-full bg-blue-500" title="Generando ahora mismo" />
                )}
                {!n.activo && <span className="shrink-0 rounded-full border px-1.5 text-[10px] font-normal">pronto</span>}
              </button>
            );
          })}
          <button type="button" onClick={() => setMarca(true)} className="mt-2 hidden items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted/60 md:flex">
            <Tag className="size-4 shrink-0" />
            Marca…
          </button>
        </nav>
      </div>
      <main className="min-w-0 border-t bg-gray-50 p-6 md:border-t-0 md:border-l">
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
