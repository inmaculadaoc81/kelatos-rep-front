"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fechaHora } from "@/lib/crm";
import { useApi } from "@/app/crm/use-api";

type ClienteFila = {
  id: number; nombre: string; email: string | null; telefono: string | null; estado: string; creado_en: string;
  enviados: number; ultimo_envio: string | null; ultimo_estado: string | null; de_baja: boolean;
};
type Datos = { ok: boolean; clientes: ClienteFila[]; totales: { total: number; de_baja: number; excluidos: number; ya_escritos: number } };

function situacion(c: ClienteFila): { texto: string; clase: string } {
  if (c.de_baja) return { texto: "De baja", clase: "bg-rose-100 text-rose-800" };
  if (c.estado === "Inválido") return { texto: "Correo inválido", clase: "bg-rose-100 text-rose-800" };
  if (c.estado === "Respondió") return { texto: "Respondió", clase: "bg-emerald-100 text-emerald-800" };
  if (c.enviados > 0) return { texto: "Ya escrito", clase: "bg-sky-100 text-sky-800" };
  if (c.ultimo_estado === "borrador" || c.ultimo_estado === "aprobado") return { texto: c.ultimo_estado === "aprobado" ? "Aprobado, por enviar" : "Borrador por revisar", clase: "bg-amber-100 text-amber-800" };
  return { texto: "Pendiente de escribir", clase: "bg-muted text-foreground" };
}

/** Parte «clientes» de Prospección: los clientes de Reparaciones que marcaron la casilla de recibir promociones en el formulario. */
export function ClientesVista() {
  const [q, setQ] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [buscando, setBuscando] = useState(false);
  const { datos, error } = useApi<Datos>(`/api/prospeccion/clientes?q=${encodeURIComponent(q.trim())}`, recarga);
  const t = datos?.totales;

  async function sincronizar() {
    setBuscando(true);
    try {
      const res = await fetch("/api/prospeccion/clientes/sincronizar", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const d = (await res.json()) as { ok?: boolean; error?: string; creados?: number };
      if (!res.ok || !d.ok) throw new Error(d.error || "No se pudo sincronizar");
      toast.success(d.creados ? `${d.creados} cliente${d.creados === 1 ? "" : "s"} nuevo${d.creados === 1 ? "" : "s"} añadido${d.creados === 1 ? "" : "s"}` : "No hay clientes nuevos con la casilla marcada");
      setRecarga((n) => n + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBuscando(false);
    }
  }

  const tarjetas: [string, number][] = t
    ? [["Clientes con la casilla", t.total], ["Ya escritos", t.ya_escritos], ["De baja", t.de_baja], ["Excluidos (inválido o respondió)", t.excluidos]]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Clientes que aceptaron recibir promociones</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Son los clientes de Reparaciones que marcaron la casilla «Deseo recibir promociones» al dejar su equipo. A ellos se les escribe un correo cálido, personalizado con su historial con nosotros; es una lista distinta de las empresas que buscamos con las APIs. Quien se da de baja no vuelve a recibir nada.
          </p>
        </div>
        <Button variant="outline" disabled={buscando} onClick={sincronizar}>{buscando ? "Buscando…" : "Añadir clientes nuevos"}</Button>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">No se pudo cargar: {error}</div>}
      {!datos && !error && <Skeleton className="h-40 w-full" />}
      {t && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tarjetas.map(([nombre, valor]) => (
            <div key={nombre} className="rounded-lg border bg-card p-3"><p className="text-2xl font-semibold">{valor}</p><p className="text-xs text-muted-foreground">{nombre}</p></div>
          ))}
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o correo" className="pl-8" />
      </div>

      {datos && (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Situación</TableHead>
                <TableHead>Correos enviados</TableHead>
                <TableHead>Último envío</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datos.clientes.length === 0 && <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">No hay clientes con esa búsqueda</TableCell></TableRow>}
              {datos.clientes.map((c) => {
                const s = situacion(c);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nombre}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.telefono || "—"}</TableCell>
                    <TableCell><span className={`rounded-full px-2 py-0.5 text-xs ${s.clase}`}>{s.texto}</span></TableCell>
                    <TableCell>{c.enviados}</TableCell>
                    <TableCell>{c.ultimo_envio ? fechaHora(c.ultimo_envio) : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
