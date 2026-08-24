"use client";

import { useEffect, useState } from "react";
import { Refresh2, Trash, SearchNormal1 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearFecha } from "@/lib/dias-entrega";
import { PuntoLimpioItem, labelMotivo, labelDestino } from "@/lib/punto-limpio";
import { PuntoLimpioMotivoDialog } from "./punto-limpio-motivo-dialog";

const ESTILO_MOTIVO: Record<string, string> = {
  reparable: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
  reciclaje_interno: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  retirado: "text-muted-foreground",
  otro: "border-sky-500/40 text-sky-700 dark:text-sky-400",
};

/** Vista de seguimiento de equipos enviados a punto limpio (estado_entrega='RECICLAJE'). */
export default function PuntoLimpioPage() {
  const [items, setItems] = useState<PuntoLimpioItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<PuntoLimpioItem | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/punto-limpio");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setItems(data.items as PuntoLimpioItem[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const texto = busqueda.trim().toLowerCase();
  const filtrados = texto
    ? items.filter((i) => [i.resguardo, i.clienteNombre, i.equipoModelo].join(" ").toLowerCase().includes(texto))
    : items;

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <Trash className="size-5" /> Punto Limpio
          </h1>
          <p className="text-sm text-muted-foreground">Seguimiento de equipos enviados a reciclaje</p>
        </div>
        <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar">
          <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar: {error}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchNormal1 className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Resguardo, cliente, equipo..." className="w-64 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        {!cargando && <span className="ml-auto text-sm text-muted-foreground">{filtrados.length} casos</span>}
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-primary hover:bg-primary [&_th]:text-primary-foreground">
              <TableHead>Resguardo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!cargando && filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Sin equipos en punto limpio
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              filtrados.map((i) => (
                <TableRow key={i.resguardo}>
                  <TableCell className="font-semibold text-primary">{i.resguardo}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap text-muted-foreground">{formatearFecha(i.fechaEntrega)}</TableCell>
                  <TableCell className="text-sm">{i.clienteNombre || "-"}</TableCell>
                  <TableCell className="text-sm" title={i.equipoModelo}>{i.equipoModelo || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={ESTILO_MOTIVO[i.motivo || ""] || "text-muted-foreground"}>
                      {labelMotivo(i.motivo)}
                    </Badge>
                    {i.motivo === "otro" && i.motivoDetalle && (
                      <p className="mt-1 max-w-52 truncate text-xs text-muted-foreground" title={i.motivoDetalle}>{i.motivoDetalle}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{labelDestino(i.destino) || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setEditando(i)}>
                      {i.motivo ? "Editar motivo" : "Definir motivo"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {editando && (
        <PuntoLimpioMotivoDialog
          item={editando}
          open={!!editando}
          onOpenChange={(o) => !o && setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}
