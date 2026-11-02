"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { colorDeRed, ESTADOS, MARCAS, REDES, TIPOS, etiquetaDe, type Pieza } from "@/lib/contenido";
import { PiezaDialog } from "../pieza-dialog";

const POLL_MS = 30000;

function fecha(p: Pieza) {
  const iso = p.programadaPara ?? p.creadoEn;
  return iso ? new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

/** Tabla de todos los videos ya subidos: las piezas que tienen enlace de video. */
export default function VideosSubidosPage() {
  const [piezas, setPiezas] = useState<Pieza[]>([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState("");
  const [seleccionada, setSeleccionada] = useState<number | null>(null);

  const cargar = () => fetch("/api/asistencia/kiosk/contenido")
    .then((r) => r.json())
    .then((d) => { if (d.ok) setPiezas(d.piezas as Pieza[]); })
    .catch(() => {})
    .finally(() => setCargando(false));

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, POLL_MS);
    return () => clearInterval(t);
  }, []);

  const filas = useMemo(() => {
    const buscado = q.trim().toLowerCase();
    return piezas
      .filter((p) => p.enlaceVideo)
      .filter((p) => !buscado || `${p.titulo} ${p.asignadoNombre ?? ""} ${etiquetaDe(MARCAS, p.marca)} ${p.enlaceVideo}`.toLowerCase().includes(buscado))
      .sort((a, b) => String(b.programadaPara ?? b.creadoEn).localeCompare(String(a.programadaPara ?? a.creadoEn)));
  }, [piezas, q]);

  if (cargando) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Videos subidos</h1>
        <p className="text-sm text-muted-foreground">Todas las piezas que ya tienen su enlace de video. Los repetidos se marcan en ámbar.</p>
      </div>
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título, marca o persona" className="pl-8" />
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
              <TableHead>Video</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.length === 0 && (
              <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Todavía no hay videos con enlace.</TableCell></TableRow>
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
                  <TableCell className="whitespace-nowrap text-xs">{fecha(p)}</TableCell>
                  <TableCell>{estado && <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", estado.color)}>{estado.etiqueta}</span>}</TableCell>
                  <TableCell>
                    <a href={p.enlaceVideo!} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-sm text-primary underline-offset-2 hover:underline">Abrir</a>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <PiezaDialog piezaId={seleccionada} open={seleccionada !== null} onOpenChange={(o) => !o && setSeleccionada(null)} onCambiada={cargar} />
    </div>
  );
}
