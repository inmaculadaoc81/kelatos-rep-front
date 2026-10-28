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
  estado: "pendiente" | "activo" | "rechazado" | "revocado";
  ip_alta: string | null;
  ip_ultima: string | null;
  visitas: number;
  user_agent: string | null;
}

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" }) : "—");

/** «Mozilla/5.0 (X11; Linux x86_64) … Chrome/130» → «Chrome en Linux» (lo justo para reconocer el equipo). */
function resumenNavegador(ua: string | null): string {
  if (!ua) return "—";
  const so = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Linux|X11/.test(ua) ? "Linux" : "otro sistema";
  const nav = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "navegador";
  return `${nav} en ${so}`;
}

/**
 * Equipos del local para la cuenta restringida (src/lib/acceso-local.ts). Cuando esa cuenta se usa desde un navegador, este queda como
 * solicitud pendiente: aquí se aprueba (queda reconocido aunque cambie la IP o cierren sesión) o se rechaza. Solo administradores.
 */
export default function EquiposLocalPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombres, setNombres] = useState<Record<number, string>>({});
  const [enlace, setEnlace] = useState<{ url: string; caduca: string } | null>(null);
  const [nombreEnlace, setNombreEnlace] = useState("");
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

  async function accion(e: Equipo, accion: "aprobar" | "rechazar" | "revocar") {
    if (accion === "revocar" && !window.confirm(`¿Quitar la autorización de «${e.nombre}»? Esa cuenta dejará de entrar desde ese equipo.`)) return;
    const res = await fetch("/api/acceso-local/equipos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion, id: e.id, nombre: accion === "aprobar" ? (nombres[e.id] ?? "").trim() || undefined : undefined }),
    });
    const d = await res.json();
    if (d.ok) { toast.success(accion === "aprobar" ? "Equipo autorizado" : accion === "rechazar" ? "Solicitud rechazada" : "Equipo revocado"); cargar(); }
    else toast.error(d.error || "No se pudo completar");
  }

  async function generarEnlace() {
    setGenerando(true);
    try {
      const res = await fetch("/api/acceso-local/equipos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "alta", nombre: nombreEnlace.trim() || undefined, minutos: 60 }) });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "Error desconocido");
      setEnlace({ url: d.url, caduca: d.caduca_en });
      setNombreEnlace("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar el enlace");
    } finally {
      setGenerando(false);
    }
  }

  const pendientes = equipos.filter((e) => e.estado === "pendiente");
  const autorizados = equipos.filter((e) => e.estado === "activo");
  const otros = equipos.filter((e) => e.estado === "rechazado" || e.estado === "revocado");

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold"><ShieldTick className="size-5" /> Equipos del local</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            La cuenta de los empleados del local (soporte@kelatos.com) solo podrá usar el dashboard desde los equipos autorizados aquí (o desde la IP del
            local). La primera vez que esa cuenta se usa desde un navegador, aparece abajo como <strong>solicitud pendiente</strong>: apruébala y ese
            equipo quedará reconocido, aunque cierren sesión o cambie la IP. Para saber cuál es cada uno, mira su <strong>IP</strong> y su navegador.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={cargar} disabled={cargando}><Refresh2 className={cargando ? "size-4 animate-spin" : "size-4"} /> Actualizar</Button>
      </div>

      <section>
        <p className="mb-2 text-sm font-medium">Solicitudes pendientes {pendientes.length > 0 && <Badge className="ml-1 bg-amber-100 text-amber-800 hover:bg-amber-100">{pendientes.length}</Badge>}</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Navegador</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Primera vez</TableHead>
              <TableHead>Último uso</TableHead>
              <TableHead>Nombre del equipo</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!cargando && pendientes.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">No hay solicitudes pendientes. Aparecerán aquí cuando la cuenta se use desde un navegador nuevo.</TableCell></TableRow>
            )}
            {pendientes.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-sm" title={e.user_agent ?? ""}>{resumenNavegador(e.user_agent)}</TableCell>
                <TableCell className="font-mono text-xs">{e.ip_ultima || e.ip_alta || "—"}</TableCell>
                <TableCell className="text-sm">{fecha(e.creado_en)}</TableCell>
                <TableCell className="text-sm">{fecha(e.ultimo_uso)} · {e.visitas} {e.visitas === 1 ? "visita" : "visitas"}</TableCell>
                <TableCell><Input className="h-8 w-44" placeholder="p. ej. PC 1" value={nombres[e.id] ?? ""} onChange={(ev) => setNombres((n) => ({ ...n, [e.id]: ev.target.value }))} /></TableCell>
                <TableCell className="space-x-1.5 text-right whitespace-nowrap">
                  <Button size="sm" onClick={() => accion(e, "aprobar")}>Autorizar</Button>
                  <Button size="sm" variant="outline" onClick={() => accion(e, "rechazar")}>Rechazar</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section>
        <p className="mb-2 text-sm font-medium">Equipos autorizados</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipo</TableHead>
              <TableHead>Navegador</TableHead>
              <TableHead>Última IP</TableHead>
              <TableHead>Último uso</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!cargando && autorizados.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Todavía no hay equipos autorizados.</TableCell></TableRow>
            )}
            {autorizados.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.nombre}</TableCell>
                <TableCell className="text-sm" title={e.user_agent ?? ""}>{resumenNavegador(e.user_agent)}</TableCell>
                <TableCell className="font-mono text-xs">{e.ip_ultima || "—"}</TableCell>
                <TableCell className="text-sm">{fecha(e.ultimo_uso)}</TableCell>
                <TableCell><Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Autorizado</Badge></TableCell>
                <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => accion(e, "revocar")}>Revocar</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      {otros.length > 0 && (
        <section>
          <p className="mb-2 text-sm font-medium text-muted-foreground">Rechazados o revocados</p>
          <Table>
            <TableBody>
              {otros.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm">{e.nombre} · {resumenNavegador(e.user_agent)}</TableCell>
                  <TableCell className="font-mono text-xs">{e.ip_ultima || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{e.estado === "rechazado" ? "Rechazado" : "Revocado"}</Badge></TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => accion(e, "aprobar")}>Autorizar de nuevo</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      <details className="max-w-2xl rounded-lg border p-4 text-sm">
        <summary className="cursor-pointer font-medium">Alternativa: autorizar un equipo con un enlace</summary>
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">Para dar de alta un PC sin esperar a que aparezca como solicitud. El enlace es de un solo uso y caduca a los 60 minutos si no se abre.</p>
          <div className="flex flex-wrap gap-2">
            <Input className="max-w-xs" placeholder="Nombre del equipo" value={nombreEnlace} onChange={(e) => setNombreEnlace(e.target.value)} />
            <Button onClick={generarEnlace} disabled={generando}>{generando ? <Refresh2 className="size-4 animate-spin" /> : null} Generar enlace</Button>
          </div>
          {enlace && (
            <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <p>Ábrelo <strong>en el navegador del PC del local</strong> (caduca {fecha(enlace.caduca)}).</p>
              <div className="flex gap-2">
                <Input readOnly value={enlace.url} className="h-8 bg-white text-xs" onFocus={(e) => e.currentTarget.select()} />
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(enlace.url).then(() => toast.success("Enlace copiado")); }}>Copiar</Button>
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
