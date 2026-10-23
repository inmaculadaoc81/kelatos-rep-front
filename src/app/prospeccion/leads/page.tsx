"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "../../crm/use-api";

const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm";
const celda = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

interface Trabajo { estado: string; sector: string; zona: string; limite: number; total: number; revisados: number; nuevos: number; duplicados: number; sinCorreo: number; errores: number; error: string | null }
interface Lead { id: number; sector: string; zona: string; nombre: string; web: string | null; email: string; emails_extra: string[]; tipo_email: string; generico: boolean; telefono: string | null; ciudad: string | null; fuente_url: string | null; estado: string; creado_en: string }

async function llamar(ruta: string, cuerpo: object) {
  const res = await fetch(`/api/prospeccion/leads${ruta}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string } & Record<string, unknown>;
  if (!res.ok || !d.ok) throw new Error(d.error || "No se pudo completar la acción");
  return d;
}

/** Buscar leads con datos abiertos (OpenStreetMap + la web de cada negocio). Sin créditos de terceros y sin enviar nada: se revisa y se importa lo aprobado. */
export default function ProspeccionLeadsPage() {
  const [recarga, setRecarga] = useState(0);
  const [estado, setEstado] = useState<"nuevo" | "importado" | "descartado">("nuevo");
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("dentistas");
  const [zona, setZona] = useState("Madrid");
  const [cantidad, setCantidad] = useState("20");
  const [elegidos, setElegidos] = useState<number[]>([]);
  const [trabajando, setTrabajando] = useState(false);
  const { datos: sectores } = useApi<{ ok: boolean; sectores: { id: string; nombre: string }[] }>("/api/prospeccion/leads/sectores");
  const { datos: est } = useApi<{ ok: boolean; trabajo: Trabajo | null }>("/api/prospeccion/leads/estado", recarga);
  const params = new URLSearchParams({ estado });
  if (q.trim()) params.set("q", q.trim());
  const { datos, error } = useApi<{ ok: boolean; leads: Lead[]; conteos: { estado: string; n: number }[] }>(`/api/prospeccion/leads?${params.toString()}`, recarga);
  const t = est?.trabajo ?? null;
  const enMarcha = !!t && ["buscando", "revisando webs"].includes(t.estado);

  // Mientras hay una búsqueda en marcha se refresca sola cada 4 s.
  useEffect(() => {
    if (!enMarcha) return;
    const id = setInterval(() => setRecarga((n) => n + 1), 4000);
    return () => clearInterval(id);
  }, [enMarcha]);

  const leads = datos?.leads ?? [];
  const n = (e: string) => datos?.conteos.find((c) => c.estado === e)?.n ?? 0;
  const alternar = (id: number) => setElegidos((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));
  const todos = leads.length > 0 && leads.every((l) => elegidos.includes(l.id));

  async function buscar() {
    setTrabajando(true);
    try {
      await llamar("/buscar", { sector, zona, limite: Number(cantidad) });
      toast.success("Búsqueda iniciada");
      setRecarga((x) => x + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setTrabajando(false);
    }
  }
  async function accion(ruta: "/importar" | "/descartar", texto: string) {
    if (!elegidos.length) { toast.error("Marca primero los leads"); return; }
    try {
      const d = await llamar(ruta, { ids: elegidos });
      toast.success(ruta === "/importar" ? `${d.importados} importados a Gestión MAILS${Number(d.ya_existian) ? ` (${d.ya_existian} ya existían)` : ""}` : texto);
      setElegidos([]);
      setRecarga((x) => x + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }
  function exportar() {
    const cab = ["Empresa", "Correo", "Otros correos", "Tipo de correo", "Web", "Teléfono", "Ciudad", "Sector", "Zona", "Dónde se encontró"];
    const cuerpo = leads.map((l) => [l.nombre, l.email, l.emails_extra.join(" "), l.tipo_email, l.web, l.telefono, l.ciudad, l.sector, l.zona, l.fuente_url]);
    const csv = "﻿" + [cab, ...cuerpo].map((r) => r.map(celda).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `leads-extraidos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Prospección · Buscar leads</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Encuentra negocios de un sector y una zona (OpenStreetMap, datos abiertos), entra en su web pública y saca el correo de contacto. Sin créditos de terceros y <strong>sin enviar nada</strong>: aquí revisas y solo lo que apruebes pasa a Gestión MAILS.
        </p>
      </div>

      <section className="rounded-lg border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_8rem_auto] md:items-end">
          <div className="space-y-1.5">
            <Label>Sector</Label>
            <select className={SELECT} value={sector} onChange={(e) => setSector(e.target.value)}>
              {(sectores?.sectores ?? [{ id: "dentistas", nombre: "Clínicas dentales" }]).map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>Zona (ciudad o provincia)</Label><Input value={zona} onChange={(e) => setZona(e.target.value)} placeholder="Madrid" /></div>
          <div className="space-y-1.5"><Label>Cuántos</Label><Input type="number" min={1} max={100} value={cantidad} onChange={(e) => setCantidad(e.target.value)} /></div>
          <Button disabled={trabajando || enMarcha} onClick={buscar}>{enMarcha ? "Buscando…" : "Buscar leads"}</Button>
        </div>
        {t && (
          <div className={`mt-3 rounded-md border px-3 py-2 text-sm ${t.estado === "error" ? "border-rose-300 bg-rose-50 text-rose-900" : enMarcha ? "border-sky-200 bg-sky-50 text-sky-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
            {t.estado === "error" ? `La búsqueda falló: ${t.error ?? "error desconocido"}` : (
              <>
                <strong>{enMarcha ? (t.estado === "buscando" ? "Buscando negocios…" : "Revisando webs…") : "Búsqueda terminada"}</strong>{" "}
                {t.total > 0 && `${t.total} negocios encontrados · revisados ${t.revisados} · con correo nuevo ${t.nuevos} · sin correo ${t.sinCorreo} · ya conocidos ${t.duplicados}`}
              </>
            )}
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Respeta el archivo robots.txt de cada web, hace pausas entre visitas y descarta correos inválidos, direcciones ya dadas de baja, clientes y leads que ya tenéis. Los correos «gratuitos» (gmail, hotmail…) suelen ser de personas: revisa antes de importarlos.
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {(["nuevo", "importado", "descartado"] as const).map((e) => (
          <button key={e} type="button" onClick={() => { setEstado(e); setElegidos([]); }} className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${estado === e ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
            {e === "nuevo" ? "Por revisar" : e === "importado" ? "Importados" : "Descartados"} {n(e)}
          </button>
        ))}
        <div className="relative ml-2 w-64">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar empresa o correo…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" className="gap-1.5" disabled={leads.length === 0} onClick={exportar}><Download className="size-4" /> Exportar</Button>
          {estado === "nuevo" && (
            <>
              <Button variant="outline" disabled={!elegidos.length} onClick={() => accion("/descartar", "Descartados")}>Descartar</Button>
              <Button disabled={!elegidos.length} onClick={() => accion("/importar", "")}>Importar a Gestión MAILS ({elegidos.length})</Button>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">No se pudo cargar: {error}</p>}
      {!datos && !error && <Skeleton className="h-48 w-full" />}
      {datos && (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                {estado === "nuevo" && <TableHead className="w-8"><input type="checkbox" checked={todos} onChange={() => setElegidos(todos ? [] : leads.map((l) => l.id))} aria-label="Marcar todos" /></TableHead>}
                <TableHead>Empresa</TableHead><TableHead>Correo</TableHead><TableHead>Web</TableHead><TableHead>Ciudad</TableHead><TableHead>Teléfono</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((l) => (
                <TableRow key={l.id}>
                  {estado === "nuevo" && <TableCell><input type="checkbox" checked={elegidos.includes(l.id)} onChange={() => alternar(l.id)} aria-label={`Marcar ${l.nombre}`} /></TableCell>}
                  <TableCell className="font-medium">{l.nombre}<span className="block text-xs font-normal text-muted-foreground">{l.sector} · {l.zona}</span></TableCell>
                  <TableCell className="text-xs">
                    {l.email}
                    <span className="mt-0.5 flex flex-wrap gap-1">
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${l.tipo_email === "propio" ? "bg-emerald-100 text-emerald-800" : l.tipo_email === "gratuito" ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-700"}`}>{l.tipo_email === "propio" ? "dominio propio" : l.tipo_email}</span>
                      {l.generico && <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-800">genérico</span>}
                      {l.emails_extra.length > 0 && <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-700" title={l.emails_extra.join(", ")}>+{l.emails_extra.length}</span>}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-48 truncate text-xs">{l.web ? <a className="text-primary underline" href={l.fuente_url?.startsWith("http") ? l.fuente_url : l.web.startsWith("http") ? l.web : `https://${l.web}`} target="_blank" rel="noreferrer">{l.web.replace(/^https?:\/\//, "")}</a> : "—"}</TableCell>
                  <TableCell className="text-xs">{l.ciudad ?? "—"}</TableCell>
                  <TableCell className="text-xs">{l.telefono ?? "—"}</TableCell>
                </TableRow>
              ))}
              {leads.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">{estado === "nuevo" ? "No hay leads por revisar. Elige un sector y una zona y pulsa «Buscar leads»." : "No hay leads en esta lista."}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
