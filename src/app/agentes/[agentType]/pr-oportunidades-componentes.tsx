"use client";

export interface ItemOportunidad {
  nombre: string;
  porQue: string;
  comoContactar: string;
}

export interface Oportunidades {
  medios: ItemOportunidad[];
  blogsEspecializados: ItemOportunidad[];
  podcasts: ItemOportunidad[];
  entrevistas: ItemOportunidad[];
  directoriosRelevantes: ItemOportunidad[];
  eventos: ItemOportunidad[];
  publicacionesSectoriales: ItemOportunidad[];
}

const CATEGORIAS: { clave: keyof Oportunidades; titulo: string }[] = [
  { clave: "medios", titulo: "Medios" },
  { clave: "blogsEspecializados", titulo: "Blogs especializados" },
  { clave: "podcasts", titulo: "Podcasts" },
  { clave: "entrevistas", titulo: "Entrevistas" },
  { clave: "directoriosRelevantes", titulo: "Directorios relevantes" },
  { clave: "eventos", titulo: "Eventos" },
  { clave: "publicacionesSectoriales", titulo: "Publicaciones sectoriales" },
];

function TarjetaItem({ item }: { item: ItemOportunidad }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-sm font-semibold">{item.nombre}</p>
      <p className="mt-1 text-sm text-muted-foreground">{item.porQue}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Cómo acercarse: </span>
        {item.comoContactar}
      </p>
    </div>
  );
}

function SeccionCategoria({ titulo, items }: { titulo: string; items?: ItemOportunidad[] }) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b bg-muted/30 px-4 py-2.5">
        <h3 className="text-sm font-semibold">{titulo}</h3>
      </div>
      <div className="space-y-2 p-4">
        {items?.length ? (
          items.map((it, i) => <TarjetaItem key={i} item={it} />)
        ) : (
          <p className="text-sm text-muted-foreground">Sin oportunidades todavía.</p>
        )}
      </div>
    </section>
  );
}

/** Panel único reutilizado por el dashboard y por el canvas del run —
    siempre con el aviso de fiabilidad arriba: son ideas de IA a partir
    de conocimiento general, SIN búsqueda en tiempo real (decisión
    explícita del usuario, 2026-10-07 — no hay ninguna API de noticias/
    búsqueda web configurada en el backend). */
export function PanelOportunidades({ oportunidades }: { oportunidades?: Oportunidades }) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
        Ideas generadas por IA a partir de conocimiento general, sin búsqueda en tiempo real — comprueba que cada medio/contacto/URL sigue vigente antes de usarlo.
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {CATEGORIAS.map((c) => (
          <SeccionCategoria key={c.clave} titulo={c.titulo} items={oportunidades?.[c.clave]} />
        ))}
      </div>
    </div>
  );
}
