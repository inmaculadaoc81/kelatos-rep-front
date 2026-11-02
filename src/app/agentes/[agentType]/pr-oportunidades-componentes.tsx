"use client";

export interface ItemOportunidad {
  nombre: string;
  web?: string | null;
  porQue: string;
  comoContactar?: string;
  impacto?: "alto" | "medio" | "bajo";
  necesitaAlta?: string;
  quePublicar?: string;
  modo?: "automatico" | "semiautomatico" | "manual";
}

export interface WebVerificada {
  nombre: string;
  estado: "ok" | "no_responde" | "sin_web";
  web?: string;
  titulo?: string;
  urlContacto?: string | null;
  codigo?: number;
}
export type Verificacion = Partial<Record<keyof Oportunidades, WebVerificada[]>>;

export interface Oportunidades {
  // Formato nuevo (2026-11-02): sitios donde publicar uno mismo.
  googleYDirectorios?: ItemOportunidad[];
  articulos?: ItemOportunidad[];
  foros?: ItemOportunidad[];
  // Formato antiguo (ejecuciones anteriores): dónde podría aparecer la empresa.
  medios?: ItemOportunidad[];
  blogsEspecializados?: ItemOportunidad[];
  podcasts?: ItemOportunidad[];
  entrevistas?: ItemOportunidad[];
  directoriosRelevantes?: ItemOportunidad[];
  eventos?: ItemOportunidad[];
  publicacionesSectoriales?: ItemOportunidad[];
}

const CATEGORIAS_NUEVAS: { clave: keyof Oportunidades; titulo: string }[] = [
  { clave: "googleYDirectorios", titulo: "Google y directorios de negocio" },
  { clave: "articulos", titulo: "Plataformas de artículos" },
  { clave: "foros", titulo: "Foros y comunidades" },
];

const CATEGORIAS: { clave: keyof Oportunidades; titulo: string }[] = [
  { clave: "medios", titulo: "Medios" },
  { clave: "blogsEspecializados", titulo: "Blogs especializados" },
  { clave: "podcasts", titulo: "Podcasts" },
  { clave: "entrevistas", titulo: "Entrevistas" },
  { clave: "directoriosRelevantes", titulo: "Directorios relevantes" },
  { clave: "eventos", titulo: "Eventos" },
  { clave: "publicacionesSectoriales", titulo: "Publicaciones sectoriales" },
];

function TarjetaItem({ item, ver }: { item: ItemOportunidad; ver?: WebVerificada }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-sm font-semibold">{item.nombre}</p>
      <p className="mt-1 text-sm text-muted-foreground">{item.porQue}</p>
      {item.quePublicar ? (
        <div className="mt-1.5 space-y-1 text-xs text-muted-foreground">
          <p className="flex flex-wrap gap-1.5">
            {item.impacto && <span className={`rounded-full px-2 py-0.5 ${item.impacto === "alto" ? "bg-emerald-100 text-emerald-800" : item.impacto === "medio" ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground"}`}>Impacto {item.impacto}</span>}
            {item.modo && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-800">{item.modo === "automatico" ? "Se puede automatizar" : item.modo === "semiautomatico" ? "El agente redacta, una persona publica" : "A mano"}</span>}
          </p>
          <p><span className="font-medium text-foreground">Qué publicar: </span>{item.quePublicar}</p>
          {item.necesitaAlta && <p><span className="font-medium text-foreground">Antes de publicar: </span>{item.necesitaAlta}</p>}
        </div>
      ) : item.comoContactar ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Cómo acercarse: </span>
          {item.comoContactar}
        </p>
      ) : null}
      {ver && (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {ver.estado === "ok" && ver.web ? (
            <>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">Web verificada</span>
              <a href={ver.web} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">Abrir web</a>
              {ver.urlContacto ? <a href={ver.urlContacto} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">Página de contacto</a> : <span className="text-muted-foreground">No se encontró página de contacto</span>}
            </>
          ) : ver.estado === "no_responde" ? (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-800">La web no responde{ver.codigo ? ` (${ver.codigo})` : ""}: compruébala a mano</span>
          ) : (
            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">Sin web que comprobar</span>
          )}
        </p>
      )}
    </div>
  );
}

function SeccionCategoria({ titulo, items, ver }: { titulo: string; items?: ItemOportunidad[]; ver?: WebVerificada[] }) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b bg-muted/30 px-4 py-2.5">
        <h3 className="text-sm font-semibold">{titulo}</h3>
      </div>
      <div className="space-y-2 p-4">
        {items?.length ? (
          items.map((it, i) => <TarjetaItem key={i} item={it} ver={ver?.[i]} />)
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
export function PanelOportunidades({ oportunidades, verificacion }: { oportunidades?: Oportunidades; verificacion?: Verificacion }) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
        Ideas generadas por IA a partir de conocimiento general. {verificacion ? "Cada web se ha comprobado automáticamente (responde y se ha buscado su página de contacto); aun así, revisa que el medio y el contacto siguen vigentes antes de usarlos." : "Sin búsqueda en tiempo real: comprueba que cada medio, contacto y URL sigue vigente antes de usarlo."}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {(oportunidades?.foros || oportunidades?.googleYDirectorios ? CATEGORIAS_NUEVAS : CATEGORIAS).map((c) => (
          <SeccionCategoria key={c.clave} titulo={c.titulo} items={oportunidades?.[c.clave]} ver={verificacion?.[c.clave]} />
        ))}
      </div>
    </div>
  );
}
