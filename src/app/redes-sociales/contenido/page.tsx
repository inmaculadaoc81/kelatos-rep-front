"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ESTADOS, MARCAS, REDES, TIPOS, colorDeRed, etiquetaDe, type Pieza } from "@/lib/contenido";
import { FILTROS_VISTA, fechaPieza, type VistaContenido } from "@/lib/redes-sociales";
import { PiezaDialog } from "../../asistencia/contenido/pieza-dialog";
import { NuevaPiezaDialog } from "../../asistencia/contenido/nueva-pieza-dialog";

const POLL_MS = 30000;
const VISTAS: { valor: VistaContenido; etiqueta: string }[] = [
  { valor: "pendientes", etiqueta: "Pendientes de subir" },
  { valor: "subidos", etiqueta: "Subidos" },
  { valor: "en_curso", etiqueta: "Otras en curso" },
  { valor: "todas", etiqueta: "Todas" },
];

function Contenido() {
  const router = useRouter();
  const params = useSearchParams();
  const vistaParam = params.get("vista");
  const vista: VistaContenido = VISTAS.some((v) => v.valor === vistaParam) ? (vistaParam as VistaContenido) : "pendientes";

  const [piezas, setPiezas] = useState<Pieza[]>([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState("");
  const [red, setRed] = useState("");
  const [marca, setMarca] = useState("");
  const [seleccionada, setSeleccionada] = useState<number | null>(null);
  const [nueva, setNueva] = useState(false);

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

  const conteo = useMemo(() => Object.fromEntries(VISTAS.map((v) => [v.valor, piezas.filter(FILTROS_VISTA[v.valor]).length])) as Record<VistaContenido, number>, [piezas]);

  const filas = useMemo(() => {
    const buscado = q.trim().toLowerCase();
    return piezas
      .filter(FILTROS_VISTA[vista])
      .filter((p) => !red || p.redSocial === red)
      .filter((p) => !marca || p.marca === marca)
      .filter((p) => !buscado || `${p.titulo} ${p.asignadoNombre ?? ""} ${etiquetaDe(MARCAS, p.marca)} ${p.enlaceVideo ?? ""}`.toLowerCase().includes(buscado))
      .sort((a, b) => String(b.programadaPara ?? b.creadoEn).localeCompare(String(a.programadaPara ?? a.creadoEn)));
  }, [piezas, vista, red, marca, q]);

  if (cargando) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Contenido</h1>
          <p className="text-sm text-muted-foreground">Vídeos, reels, carruseles y posts: lo que ya está subido y lo que falta por subir.</p>
        </div>
        <Button size="sm" onClick={() => setNueva(true)}>Nueva pieza</Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {VISTAS.map((v) => (
          <button
            key={v.valor}
            type="button"
            aria-pressed={vista === v.valor}
            onClick={() => router.replace(`/redes-sociales/contenido?vista=${v.valor}`)}
            className={cn("rounded-full border px-3 py-1 text-xs transition-colors", vista === v.valor ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground hover:text-foreground")}
          >
            {v.etiqueta} <span className="tabular-nums text-muted-foreground">({conteo[v.valor]})</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título, marca o persona" className="pl-8" />
        </div>
        <select aria-label="Red social" className="h-9 rounded-md border bg-background px-2 text-sm" value={red} onChange={(e) => setRed(e.target.value)}>
          <option value="">Todas las redes</option>
          {REDES.map((r) => (
            <option key={r.valor} value={r.valor}>{r.etiqueta}</option>
          ))}
        </select>
        <select aria-label="Marca" className="h-9 rounded-md border bg-background px-2 text-sm" value={marca} onChange={(e) => setMarca(e.target.value)}>
          <option value="">Todas las marcas</option>
          {MARCAS.map((m) => (
            <option key={m.valor} value={m.valor}>{m.etiqueta}</option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Red</TableHead>
              <TableHead>Asignada a</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vídeo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No hay piezas en esta vista.</TableCell>
              </TableRow>
            )}
            {filas.map((p) => {
              const estado = ESTADOS.find((e) => e.valor === p.estado);
              return (
                <TableRow key={p.id} className={cn("cursor-pointer", p.videoRepetido && "bg-amber-50 dark:bg-amber-950/30")} onClick={() => setSeleccionada(p.id)}>
                  <TableCell className="max-w-xs whitespace-normal font-medium">
                    {p.titulo}
                    {p.videoRepetido && <span className="ml-1.5 rounded-full bg-amber-200 px-1.5 text-[11px] font-normal text-amber-900">Repetido</span>}
                  </TableCell>
                  <TableCell>{etiquetaDe(MARCAS, p.marca)}</TableCell>
                  <TableCell>{etiquetaDe(TIPOS, p.tipo)}</TableCell>
                  <TableCell>{p.redSocial ? <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", colorDeRed(p.redSocial))}>{etiquetaDe(REDES, p.redSocial)}</span> : "—"}</TableCell>
                  <TableCell>{p.asignadoNombre ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{fechaPieza(p)}</TableCell>
                  <TableCell>{estado && <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", estado.color)}>{estado.etiqueta}</span>}</TableCell>
                  <TableCell>
                    {p.enlaceVideo ? (
                      <a href={p.enlaceVideo} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-sm text-primary underline-offset-2 hover:underline">Abrir</a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin subir</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <PiezaDialog piezaId={seleccionada} open={seleccionada !== null} onOpenChange={(o) => !o && setSeleccionada(null)} onCambiada={cargar} />
      <NuevaPiezaDialog open={nueva} onOpenChange={setNueva} onCreada={(id) => { setNueva(false); cargar(); setSeleccionada(id); }} />
    </div>
  );
}

export default function RedesContenidoPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Contenido />
    </Suspense>
  );
}
