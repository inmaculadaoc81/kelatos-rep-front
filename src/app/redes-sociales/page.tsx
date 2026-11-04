"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MARCAS, REDES, TIPOS, colorDeRed, etiquetaDe, type Pieza } from "@/lib/contenido";
import { NOMBRE_RED, REDES_DE, enCurso, estaSubida, fechaPieza, pendienteDeSubir, programadasProximas } from "@/lib/redes-sociales";
import { useCarruseles } from "../agentes-v2/departamentos/[key]/social/use-social";
import { useOrganizacion } from "../agentes-v2/organizacion-context";
import { PiezaDialog } from "../asistencia/contenido/pieza-dialog";

const POLL_MS = 60000;
const REDES_PRINCIPALES = ["youtube", "facebook", "instagram", "tiktok"] as const;

function Tarjeta({ titulo, valor, sub, href }: { titulo: string; valor: string; sub?: string; href?: string }) {
  const cuerpo = (
    <div className={cn("rounded-lg border bg-card p-3", href && "transition-colors hover:bg-muted/40")}>
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-2xl leading-none font-semibold tabular-nums">{valor}</p>
      {sub && <p className="mt-1.5 truncate text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{cuerpo}</Link> : cuerpo;
}

function ListaPiezas({ titulo, piezas, vacio, verTodo, onAbrir }: { titulo: string; piezas: Pieza[]; vacio: string; verTodo: string; onAbrir: (id: number) => void }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <p className="text-sm font-semibold">{titulo}</p>
        <Link href={verTodo} className="text-xs text-primary underline-offset-2 hover:underline">Ver todo</Link>
      </div>
      {piezas.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">{vacio}</p>
      ) : (
        <ul className="divide-y">
          {piezas.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onAbrir(p.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/40">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.titulo}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {etiquetaDe(MARCAS, p.marca)} · {etiquetaDe(TIPOS, p.tipo)}
                    {p.asignadoNombre ? ` · ${p.asignadoNombre}` : ""} · {fechaPieza(p)}
                  </span>
                </span>
                {p.redSocial && <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium", colorDeRed(p.redSocial))}>{etiquetaDe(REDES, p.redSocial)}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Resumen de toda la actividad: vídeos subidos y pendientes de subir, carruseles de la IA y lo programado para los próximos días. */
export default function RedesResumenPage() {
  const [piezas, setPiezas] = useState<Pieza[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionada, setSeleccionada] = useState<number | null>(null);
  const { organizacion } = useOrganizacion();
  const carruseles = useCarruseles();

  const cargar = () =>
    fetch("/api/asistencia/kiosk/contenido")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setPiezas(d.piezas as Pieza[]);
      })
      .catch(() => {})
      .finally(() => setCargando(false));

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, POLL_MS);
    return () => clearInterval(t);
  }, []);

  const datos = useMemo(() => {
    const subidos = piezas.filter(estaSubida);
    const pendientes = piezas.filter(pendienteDeSubir).sort((a, b) => String(a.programadaPara ?? a.fechaLimite ?? "9").localeCompare(String(b.programadaPara ?? b.fechaLimite ?? "9")));
    const recientes = [...subidos].sort((a, b) => String(b.programadaPara ?? b.creadoEn).localeCompare(String(a.programadaPara ?? a.creadoEn)));
    const porRed = REDES_PRINCIPALES.map((red) => {
      const deRed = piezas.filter((p) => p.redSocial && REDES_DE[p.redSocial].includes(red));
      return { red, subidos: deRed.filter(estaSubida).length, pendientes: deRed.filter(pendienteDeSubir).length };
    });
    return { subidos, pendientes, recientes, enCurso: piezas.filter(enCurso), proximas: programadasProximas(piezas), porRed };
  }, [piezas]);

  const lista = carruseles.datos?.carousels ?? [];
  const porEstado = (e: string) => lista.filter((c) => c.status === e).length;

  if (cargando) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Redes sociales</h1>
        <p className="text-sm text-muted-foreground">Toda la actividad en un solo sitio: vídeos subidos y pendientes, carruseles de la IA y lo programado.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Tarjeta titulo="Vídeos subidos" valor={String(datos.subidos.length)} sub="con su enlace de vídeo" href="/redes-sociales/contenido?vista=subidos" />
        <Tarjeta titulo="Pendientes de subir" valor={String(datos.pendientes.length)} sub="vídeos y reels sin enlace" href="/redes-sociales/contenido?vista=pendientes" />
        <Tarjeta titulo="Otras piezas en curso" valor={String(datos.enCurso.length)} sub="carruseles, posts e imágenes" href="/redes-sociales/contenido?vista=en_curso" />
        <Tarjeta titulo="Programadas · 7 días" valor={String(datos.proximas.length)} sub="próximas publicaciones" href="/asistencia/contenido/calendario" />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Por red</p>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {datos.porRed.map((r) => (
            <Link key={r.red} href={`/redes-sociales/analitica?red=${r.red}`} className="rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40">
              <p className="text-xs font-medium text-muted-foreground">{NOMBRE_RED[r.red]}</p>
              <p className="mt-1 text-sm">
                <span className="text-lg font-semibold tabular-nums">{r.subidos}</span> subidos · <span className="font-medium tabular-nums">{r.pendientes}</span> pendientes
              </p>
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Carruseles de la IA{organizacion ? ` · ${organizacion.name}` : ""}</p>
          <Link href="/redes-sociales/carruseles" className="text-xs text-primary underline-offset-2 hover:underline">Ver carruseles</Link>
        </div>
        {carruseles.cargando && !carruseles.datos ? (
          <p className="mt-2 text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
            <div><span className="text-lg font-semibold tabular-nums">{porEstado("review")}</span> <span className="text-muted-foreground">en revisión</span></div>
            <div><span className="text-lg font-semibold tabular-nums">{porEstado("approved")}</span> <span className="text-muted-foreground">aprobados</span></div>
            <div><span className="text-lg font-semibold tabular-nums">{porEstado("scheduled")}</span> <span className="text-muted-foreground">programados</span></div>
            <div><span className="text-lg font-semibold tabular-nums">{porEstado("published")}</span> <span className="text-muted-foreground">publicados</span></div>
            <div><span className="text-lg font-semibold tabular-nums">{porEstado("draft") + porEstado("generated")}</span> <span className="text-muted-foreground">borradores</span></div>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListaPiezas titulo="Pendientes de subir" piezas={datos.pendientes.slice(0, 8)} vacio="No hay vídeos pendientes de subir." verTodo="/redes-sociales/contenido?vista=pendientes" onAbrir={setSeleccionada} />
        <ListaPiezas titulo="Subidos recientemente" piezas={datos.recientes.slice(0, 8)} vacio="Todavía no hay vídeos subidos." verTodo="/redes-sociales/contenido?vista=subidos" onAbrir={setSeleccionada} />
      </div>

      <PiezaDialog piezaId={seleccionada} open={seleccionada !== null} onOpenChange={(o) => !o && setSeleccionada(null)} onCambiada={cargar} />
    </div>
  );
}
