"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldTick, Refresh2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Equipo {
  id: number;
  nombre: string;
  creado_por: string | null;
  creado_en: string;
  ultimo_uso: string | null;
  activo: boolean;
  user_agent: string | null;
}

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" }) : "—");

/**
 * Equipos del local autorizados para la cuenta restringida (src/lib/acceso-local.ts). Se genera un enlace de un solo uso, se abre en el
 * navegador del PC del local y ese navegador queda reconocido (cookie), aunque el proveedor de internet cambie la IP. Solo administradores.
 */
export default function EquiposLocalPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [enlace, setEnlace] = useState<{ url: string; caduca: string } | null>(null);
  const [generando, setGenerando] = useState(false);

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch("/api/acceso-local/equipos", { cache: "no-store" });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "Error desconocido");
      setEquipos(d.equipos);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cargar");
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => { cargar(); }, []);

  async function generar() {
    setGenerando(true);
    try {
      const res = await fetch("/api/acceso-local/equipos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "alta", nombre: nombre.trim() || undefined, minutos: 60 }) });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "Error desconocido");
      setEnlace({ url: d.url, caduca: d.caduca_en });
      setNombre("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar el enlace");
    } finally {
      setGenerando(false);
    }
  }

  async function revocar(e: Equipo) {
    if (!window.confirm(`¿Quitar la autorización de «${e.nombre}»? Esa cuenta dejará de entrar desde ese equipo salvo que su IP sea la del local.`)) return;
    const res = await fetch("/api/acceso-local/equipos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "revocar", id: e.id }) });
    const d = await res.json();
    if (d.ok) { toast.success("Equipo revocado"); cargar(); } else toast.error(d.error || "No se pudo revocar");
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold"><ShieldTick className="size-5" /> Equipos del local</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          La cuenta de los empleados del local (soporte@kelatos.com) solo puede usar el dashboard desde estos equipos o desde la IP del local. Genera un enlace,
          ábrelo en el navegador del PC del local y ese navegador quedará reconocido: seguirá funcionando aunque cambie la IP del local.
        </p>
      </div>

      <div className="max-w-2xl space-y-3 rounded-lg border p-4">
        <p className="text-sm font-medium">Autorizar un equipo nuevo</p>
        <div className="flex flex-wrap gap-2">
          <Input className="max-w-xs" placeholder="Nombre del equipo (p. ej. PC 1)" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <Button onClick={generar} disabled={generando}>{generando ? <Refresh2 className="size-4 animate-spin" /> : null} Generar enlace</Button>
        </div>
        {enlace && (
          <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <p>Ábrelo <strong>en el navegador del PC del local</strong> (un solo uso; caduca {fecha(enlace.caduca)}). No lo compartas por sitios públicos.</p>
            <div className="flex gap-2">
              <Input readOnly value={enlace.url} className="h-8 bg-white text-xs" onFocus={(e) => e.currentTarget.select()} />
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(enlace.url).then(() => toast.success("Enlace copiado")); }}>Copiar</Button>
            </div>
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Equipos autorizados</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipo</TableHead>
              <TableHead>Alta</TableHead>
              <TableHead>Último uso</TableHead>
              <TableHead>Navegador</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!cargando && equipos.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Todavía no hay equipos autorizados.</TableCell></TableRow>
            )}
            {equipos.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.nombre}</TableCell>
                <TableCell className="text-sm">{fecha(e.creado_en)}</TableCell>
                <TableCell className="text-sm">{fecha(e.ultimo_uso)}</TableCell>
                <TableCell className="max-w-64 truncate text-xs text-muted-foreground" title={e.user_agent ?? ""}>{e.user_agent || "—"}</TableCell>
                <TableCell>{e.activo ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Activo</Badge> : <Badge variant="outline">Revocado</Badge>}</TableCell>
                <TableCell className="text-right">{e.activo && <Button size="sm" variant="outline" onClick={() => revocar(e)}>Revocar</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
