"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ErrorCaja, Kpi, Vacio } from "@/components/agentes-v2/componentes";
import { useV2 } from "@/components/agentes-v2/use-v2";
import { cn } from "@/lib/utils";
import { CarruselesLista } from "./carruseles-lista";
import { EditorCarrusel } from "./editor-carrusel";
import { MarcaDialog } from "./marca-dialog";
import type { PanelSocial } from "./use-social";

type Vista = "overview" | "carruseles" | "contenido" | "calendario" | "borradores";

const NAV: { valor: Vista; texto: string; activo: boolean; ayuda?: string }[] = [
  { valor: "overview", texto: "Resumen", activo: true },
  { valor: "carruseles", texto: "Carruseles", activo: true },
  { valor: "contenido", texto: "Contenido", activo: false, ayuda: "Publicaciones sueltas, reels y stories" },
  { valor: "calendario", texto: "Calendario", activo: false, ayuda: "Planificación de publicaciones" },
  { valor: "borradores", texto: "Borradores", activo: false, ayuda: "Todo lo pendiente de revisar" },
];

function Resumen({ ir, abrirMarca }: { ir: (v: Vista) => void; abrirMarca: () => void }) {
  const { datos, error, cargando } = useV2<PanelSocial>("social/panel");
  const n = datos?.carruseles;
  return (
    <div className="space-y-5">
      {error && <ErrorCaja mensaje={error} />}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi titulo="Carruseles" valor={String(n?.total ?? 0)} cargando={cargando && !datos} />
        <Kpi titulo="Borradores" valor={String(n?.draft ?? 0)} cargando={cargando && !datos} />
        <Kpi titulo="Generados" valor={String(n?.generated ?? 0)} cargando={cargando && !datos} />
        <Kpi titulo="En revisión" valor={String(n?.review ?? 0)} cargando={cargando && !datos} />
        <Kpi titulo="Aprobados" valor={String(n?.approved ?? 0)} cargando={cargando && !datos} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-2 rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Agente de carruseles</h3>
          <p className="text-sm text-muted-foreground">Escribes el tema y la IA prepara las slides listas para Instagram (1080×1350): plan de contenido, texto, diseño y dibujo. Después lo editas, lo mandas a revisión y descargas el ZIP.</p>
          <p className="text-xs text-muted-foreground">Todavía no publica nada en redes: la publicación, los reels y las stories llegarán después.</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" onClick={() => ir("carruseles")}>Ir a Carruseles</Button>
            <Button size="sm" variant="outline" onClick={abrirMarca}>Configurar marca</Button>
          </div>
        </section>
        <section className="space-y-2 rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Estado del sistema</h3>
          <ul className="space-y-1.5 text-sm">
            <li className="flex items-center gap-2"><span className={cn("size-2 rounded-full", datos ? (datos.render.ok ? "bg-green-500" : "bg-red-500") : "bg-muted")} />Dibujado de imágenes: {datos ? (datos.render.ok ? "disponible" : `no disponible (${datos.render.motivo ?? "sin conexión"})`) : "comprobando…"}</li>
            <li className="flex items-center gap-2"><span className="size-2 rounded-full bg-green-500" />Formato disponible: Instagram vertical 1080×1350</li>
            <li className="flex items-center gap-2 text-muted-foreground"><span className="size-2 rounded-full bg-muted-foreground/40" />Cuadrado, stories y publicación automática: próximamente</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

/** Departamento «Redes sociales»: menú propio a la izquierda; por ahora solo el agente de carruseles está en marcha. */
export function SocialPanel({ cabecera }: { cabecera: ReactNode }) {
  const [vista, setVista] = useState<Vista>("overview");
  const [abierto, setAbierto] = useState<number | null>(null);
  const [marca, setMarca] = useState(false);
  const cambiar = (v: Vista) => {
    setVista(v);
    setAbierto(null);
  };
  const pendiente = NAV.find((n) => n.valor === vista && !n.activo);

  return (
    <div>
      {cabecera}
      <div className="grid gap-5 md:grid-cols-[190px_minmax(0,1fr)]">
        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible" aria-label="Redes sociales">
          {NAV.map((n) => (
            <button
              key={n.valor}
              type="button"
              onClick={() => cambiar(n.valor)}
              aria-current={vista === n.valor ? "page" : undefined}
              className={cn("flex shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors", vista === n.valor ? "bg-muted font-medium" : "hover:bg-muted/60", !n.activo && "text-muted-foreground")}
            >
              {n.texto}
              {!n.activo && <span className="rounded-full border px-1.5 text-[10px] font-normal">pronto</span>}
            </button>
          ))}
          <button type="button" onClick={() => setMarca(true)} className="mt-2 hidden rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted/60 md:block">Marca…</button>
        </nav>
        <main className="min-w-0">
          {vista === "overview" && <Resumen ir={cambiar} abrirMarca={() => setMarca(true)} />}
          {vista === "carruseles" && (abierto === null ? <CarruselesLista onAbrir={setAbierto} /> : <EditorCarrusel key={abierto} id={abierto} onVolver={() => setAbierto(null)} />)}
          {pendiente && <Vacio titulo={`${pendiente.texto}: próximamente`} texto={`${pendiente.ayuda}. Todavía no está disponible; de momento solo funciona el agente de carruseles.`} />}
        </main>
      </div>
      <MarcaDialog abierto={marca} onCerrar={() => setMarca(false)} />
    </div>
  );
}
