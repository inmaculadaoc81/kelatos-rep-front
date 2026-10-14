"use client";

import { Eye, Truck, BoxTick } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COLOR_ESTADO } from "@/lib/reparaciones";
import type { EquipoEntregado } from "@/lib/equipos-entregados";

export function fechaHoraCorta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function EstadoBadge({ estado }: { estado: string }) {
  const color = COLOR_ESTADO[estado];
  if (!color) return <span className="text-xs text-muted-foreground">{estado || "—"}</span>;
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: color.bg, color: color.fg }}>
      {estado}
    </span>
  );
}

export function EntregaBadge({ tipo }: { tipo: EquipoEntregado["tipoEntrega"] }) {
  return tipo === "mensajeria" ? (
    <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300">
      <Truck className="size-3" /> Mensajería
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
      <BoxTick className="size-3" /> En local
    </span>
  );
}

/** Tabla de equipos entregados (la usan la lista por fechas y el detalle de un día del calendario). */
export function TablaEntregas({
  equipos,
  vacio = "No hay equipos entregados.",
  onVer,
}: {
  equipos: EquipoEntregado[];
  vacio?: string;
  onVer: (resguardo: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Entrega</TableHead>
            <TableHead>Resguardo</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Equipo</TableHead>
            <TableHead>Técnico</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Factura / ticket</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {equipos.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">{vacio}</TableCell>
            </TableRow>
          )}
          {equipos.map((e) => (
            <TableRow key={e.resguardo} className="cursor-pointer" onClick={() => onVer(e.resguardo)}>
              <TableCell className="whitespace-nowrap text-sm tabular-nums">{fechaHoraCorta(e.fechaEntrega)}</TableCell>
              <TableCell className="font-medium">{e.resguardo}</TableCell>
              <TableCell>
                <div className="text-sm font-medium">{e.cliente || "—"}</div>
                {e.telefono && <div className="text-xs text-muted-foreground">{e.telefono}</div>}
              </TableCell>
              <TableCell className="text-sm">{e.equipo || "—"}</TableCell>
              <TableCell className="text-sm">{e.tecnico || "—"}</TableCell>
              <TableCell><EntregaBadge tipo={e.tipoEntrega} /></TableCell>
              <TableCell>
                <EstadoBadge estado={e.estado} />
                {e.tipoIngreso === "GARANTIA" && <span className="ml-1 text-[11px] font-semibold text-muted-foreground">Garantía</span>}
              </TableCell>
              <TableCell className="text-sm">{e.documento || <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell onClick={(ev) => ev.stopPropagation()}>
                <Button size="icon-sm" variant="ghost" className="h-7 w-7" onClick={() => onVer(e.resguardo)} title="Ver la reparación">
                  <Eye className="size-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
