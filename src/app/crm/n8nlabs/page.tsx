"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { haceCuanto } from "@/lib/crm";
import {
  CLASIFICACION, ESTADOS_DIAGNOSTICO, enlaceWhatsapp, nombreEstadoDiagnostico,
  type CatalogoDiagnostico, type Clasificacion, type Diagnostico, type EstadoDiagnostico, type ResumenDiagnosticos,
} from "@/lib/n8nlabs";
import { useApi } from "../use-api";

type Respuesta = { ok: boolean; diagnosticos: Diagnostico[]; resumen: ResumenDiagnosticos; catalogo: CatalogoDiagnostico };

const CLASIFICACIONES: Clasificacion[] = ["caliente", "tibio", "no_encaja"];
const iniciales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";

function ChipClasificacion({ c }: { c: Clasificacion }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium", CLASIFICACION[c].chip)}>
      <span className={cn("size-1.5 rounded-full", CLASIFICACION[c].punto)} />
      {CLASIFICACION[c].nombre}
    </span>
  );
}

export default function Page() {
  const [recarga, setRecarga] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [clasif, setClasif] = useState("todos");
  const [estado, setEstado] = useState("todos");
  const [seleccionado, setSeleccionado] = useState<number | null>(null);

  const params = new URLSearchParams();
  if (busqueda.trim()) params.set("q", busqueda.trim());
  if (clasif !== "todos") params.set("clasificacion", clasif);
  if (estado !== "todos") params.set("estado", estado);
  const { datos, error } = useApi<Respuesta>(`/api/n8nlabs/diagnosticos?${params.toString()}`, recarga);
  const r = datos?.resumen;

  // Se actualiza sola cada 30 s (con la pestaña a la vista): los envíos nuevos aparecen sin recargar.
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") setRecarga((n) => n + 1); }, 30_000);
    return () => clearInterval(t);
  }, []);

  const actual = datos?.diagnosticos.find((d) => d.id === seleccionado) ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold">N8N Labs · Leads del formulario</h1>
        <p className="text-sm text-muted-foreground">
          Quien responde las 8 preguntas de automatizacionesn8n.com queda aquí, ya puntuado. Atiende primero los <strong>calientes</strong>: son los que pasan a llamada.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi titulo="Calientes sin atender" valor={r?.calientes_sin_atender} destacado={!!r?.calientes_sin_atender} nota="Llamar cuanto antes" />
        <Kpi titulo="Sin atender (todos)" valor={r?.sin_atender} nota="Aún sin tocar" />
        <Kpi titulo="Últimos 7 días" valor={r?.ultimos_7_dias} nota={r ? `${r.total} en total` : ""} />
        <Kpi titulo="Agendados o clientes" valor={r?.agendados_o_clientes} nota="Han avanzado" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {CLASIFICACIONES.map((c) => (
          <button key={c} type="button" onClick={() => setClasif(clasif === c ? "todos" : c)} className={cn("rounded-xl border bg-card p-4 text-left transition hover:bg-muted/50", clasif === c && "ring-2 ring-primary")}>
            <div className="flex items-center justify-between">
              <ChipClasificacion c={c} />
              <span className="text-2xl font-semibold tabular-nums">{r ? r[c] : "–"}</span>
            </div>
            <p className="mt-2 text-sm font-medium">{CLASIFICACION[c].ruta}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{CLASIFICACION[c].descripcion}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, WhatsApp o referencia…" className="pl-8" />
        </div>
        <Select value={estado} onValueChange={(v) => setEstado(v ?? "todos")}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {ESTADOS_DIAGNOSTICO.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        {(clasif !== "todos" || estado !== "todos" || busqueda) && (
          <Button variant="ghost" size="sm" onClick={() => { setClasif("todos"); setEstado("todos"); setBusqueda(""); }}>Quitar filtros</Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!datos && !error && <Skeleton className="h-72 w-full" />}
      {datos && datos.diagnosticos.length === 0 && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Todavía no hay respuestas{clasif !== "todos" || estado !== "todos" || busqueda ? " con esos filtros" : ""}.</CardContent></Card>
      )}
      {datos && datos.diagnosticos.length > 0 && (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {datos.diagnosticos.map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => setSeleccionado(d.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{iniciales(d.nombre)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">{d.nombre}</span>
                      <ChipClasificacion c={d.clasificacion} />
                      {d.estado === "nuevo" && <Badge>Nuevo</Badge>}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {datos.catalogo.rubro?.opciones[d.rubro] ?? d.rubro} · factura {datos.catalogo.facturacion?.opciones[d.facturacion] ?? d.facturacion} · quiere automatizar {datos.catalogo.automatizar?.opciones[d.automatizar]?.toLowerCase() ?? d.automatizar}
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-right sm:block">
                    <span className="block text-sm font-semibold tabular-nums">{d.puntos}<span className="text-xs font-normal text-muted-foreground">/14</span></span>
                    <span className="block text-xs text-muted-foreground">{haceCuanto(d.creado_en)}</span>
                  </span>
                  <span className="hidden w-32 shrink-0 text-right text-xs text-muted-foreground md:block">{nombreEstadoDiagnostico(d.estado)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Sheet open={actual !== null} onOpenChange={(o) => { if (!o) setSeleccionado(null); }}>
        <SheetContent side="right" className="overflow-y-auto p-5 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
          <SheetTitle className="sr-only">Ficha del lead de N8N Labs</SheetTitle>
          <SheetDescription className="sr-only">Respuestas, puntuación y seguimiento</SheetDescription>
          {actual && datos && <Ficha d={actual} catalogo={datos.catalogo} alCambiar={() => setRecarga((n) => n + 1)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Kpi({ titulo, valor, nota, destacado }: { titulo: string; valor: number | undefined; nota?: string; destacado?: boolean }) {
  return (
    <Card className={cn(destacado && "border-emerald-300 bg-emerald-50/60")}>
      <CardHeader className="pb-1"><CardDescription>{titulo}</CardDescription></CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{valor ?? "–"}</div>
        {nota && <p className="text-xs text-muted-foreground">{nota}</p>}
      </CardContent>
    </Card>
  );
}

function Ficha({ d, catalogo, alCambiar }: { d: Diagnostico; catalogo: CatalogoDiagnostico; alCambiar: () => void }) {
  const [notas, setNotas] = useState(d.notas ?? "");
  const [guardando, setGuardando] = useState(false);
  const op = (campo: string, valor: string) => catalogo[campo]?.opciones[valor] ?? valor;

  async function guardar(cambios: { estado?: EstadoDiagnostico; notas?: string }, mensaje: string) {
    setGuardando(true);
    try {
      const res = await fetch(`/api/n8nlabs/diagnosticos/${d.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cambios) });
      const j = (await res.json()) as { ok: boolean; error?: string };
      if (!j.ok) throw new Error(j.error || "No se pudo guardar");
      toast.success(mensaje);
      alCambiar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  const respuestas: [string, string][] = [
    ["rubro", op("rubro", d.rubro)], ["facturacion", op("facturacion", d.facturacion)], ["mensajes", op("mensajes", d.mensajes)], ["automatizar", op("automatizar", d.automatizar)],
    ["urgencia", op("urgencia", d.urgencia)], ["inversion", op("inversion", d.inversion)], ["rol", op("rol", d.rol)],
  ];

  return (
    <div className="space-y-5">
      <div className="pr-8">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{d.nombre}</h2>
          <ChipClasificacion c={d.clasificacion} />
        </div>
        <p className="text-sm text-muted-foreground">{d.whatsapp} · {d.referencia} · {haceCuanto(d.creado_en)}</p>
      </div>

      <div className={cn("rounded-xl border p-4", CLASIFICACION[d.clasificacion].chip)}>
        <p className="text-sm font-semibold">Qué hacer: {CLASIFICACION[d.clasificacion].ruta}</p>
        <p className="mt-0.5 text-xs opacity-90">{CLASIFICACION[d.clasificacion].descripcion}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button nativeButton={false} render={<a href={enlaceWhatsapp(d)} target="_blank" rel="noreferrer" />}>Abrir WhatsApp</Button>
        <Button variant="outline" nativeButton={false} render={<a href={`tel:+${d.whatsapp_norm}`} />}>Llamar</Button>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Por qué lo clasificó así</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {d.motivos.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
        <div className="space-y-2.5 rounded-xl border p-3">
          {d.desglose.map((x) => (
            <div key={x.campo} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{x.pregunta}</span>
                <span className="shrink-0 font-medium tabular-nums">{x.puntos}/{x.maximo}</span>
              </div>
              <Progress value={x.maximo ? (x.puntos / x.maximo) * 100 : 0} />
              <p className="text-sm">{x.respuesta}</p>
            </div>
          ))}
          <p className="border-t pt-2 text-right text-sm font-semibold">Total: {d.puntos} de 14 puntos <span className="font-normal text-muted-foreground">(≥ 9 y sin frenos = caliente)</span></p>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Todas sus respuestas</h3>
        <dl className="divide-y rounded-xl border text-sm">
          {respuestas.map(([campo, valor]) => (
            <div key={campo} className="grid grid-cols-5 gap-2 px-3 py-2">
              <dt className="col-span-2 text-muted-foreground">{catalogo[campo]?.etiqueta}</dt>
              <dd className="col-span-3 font-medium">{valor}</dd>
            </div>
          ))}
          <div className="grid grid-cols-5 gap-2 px-3 py-2">
            <dt className="col-span-2 text-muted-foreground">¿Qué has intentado ya?</dt>
            <dd className="col-span-3">{d.intentado || <span className="text-muted-foreground">No contestó (era opcional)</span>}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Seguimiento</h3>
        <Select value={d.estado} onValueChange={(v) => { if (v && v !== d.estado) guardar({ estado: v as EstadoDiagnostico }, `Estado: ${nombreEstadoDiagnostico(v as EstadoDiagnostico)}`); }} disabled={guardando}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{ESTADOS_DIAGNOSTICO.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}</SelectContent>
        </Select>
        {d.atendido_por && <p className="text-xs text-muted-foreground">Primera atención: {d.atendido_por} · {haceCuanto(d.atendido_en)}</p>}
        <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas de la llamada o del WhatsApp…" rows={4} />
        <Button variant="outline" size="sm" disabled={guardando || notas === (d.notas ?? "")} onClick={() => guardar({ notas }, "Notas guardadas")}>Guardar notas</Button>
      </section>
    </div>
  );
}
