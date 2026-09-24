"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Refresh2, SearchNormal1, Send2, Add, Warning2, TickCircle } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useEsSuperadmin } from "@/hooks/use-es-superadmin";
import { ETIQUETA_CATEGORIA, TipoCorreo, TiposCorreoRespuesta } from "@/lib/mails-tipos";
import { fechaHora } from "../componentes-correo";

const num = (n: number) => n.toLocaleString("es-ES");

export default function TiposCorreoPage() {
  const esSuperadmin = useEsSuperadmin();
  const router = useRouter();
  const [tipos, setTipos] = useState<TipoCorreo[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoria, setCategoria] = useState("");
  const [estado, setEstado] = useState<"" | "activo" | "desactivado">("");
  const [busqueda, setBusqueda] = useState("");
  const [procesando, setProcesando] = useState<string | null>(null);
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [aDesactivar, setADesactivar] = useState<TipoCorreo | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/mails/tipos", { cache: "no-store" });
      const data = (await res.json()) as TiposCorreoRespuesta & { error?: string };
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setTipos(data.tipos);
      setCategorias(data.categorias);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function cambiarActivo(t: TipoCorreo, activo: boolean) {
    setProcesando(t.tipo);
    try {
      const res = await fetch(`/api/mails/tipos/${encodeURIComponent(t.tipo)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setTipos((prev) => prev.map((x) => (x.tipo === t.tipo ? { ...x, activo } : x)));
      toast.success(activo ? `"${t.nombre}" activado` : `"${t.nombre}" desactivado: ya no se enviará`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setProcesando(null);
    }
  }

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return tipos.filter(
      (t) =>
        (!categoria || t.categoria === categoria) &&
        (!estado || (estado === "activo") === t.activo) &&
        (!q || t.nombre.toLowerCase().includes(q) || t.tipo.includes(q) || t.descripcion.toLowerCase().includes(q))
    );
  }, [tipos, categoria, estado, busqueda]);

  const grupos = useMemo(() => {
    const m = new Map<string, TipoCorreo[]>();
    for (const t of visibles) m.set(t.categoria, [...(m.get(t.categoria) || []), t]);
    return [...m.entries()].sort((a, b) => categorias.indexOf(a[0]) - categorias.indexOf(b[0]));
  }, [visibles, categorias]);

  const totales = useMemo(
    () => ({
      activos: tipos.filter((t) => t.activo).length,
      desactivados: tipos.filter((t) => !t.activo).length,
      hoy: tipos.reduce((s, t) => s + t.enviados_hoy, 0),
      d30: tipos.reduce((s, t) => s + t.enviados_30d, 0),
    }),
    [tipos]
  );

  const kpi = (titulo: string, valor: string, icono: React.ReactNode, color: string, activo?: boolean, onClick?: () => void) => (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      aria-pressed={activo}
      className={`flex items-center gap-2.5 rounded-lg border bg-card p-2.5 text-left transition-colors ${onClick ? "hover:bg-muted/40" : "cursor-default"} ${activo ? "ring-2 ring-primary/50" : ""}`}
    >
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-md ${color}`}>{icono}</span>
      <span className="min-w-0">
        <span className="block truncate text-xs text-muted-foreground">{titulo}</span>
        <span className="block text-lg leading-tight font-semibold tabular-nums">{cargando && !tipos.length ? "…" : valor}</span>
      </span>
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-sky-500 to-indigo-600 text-white">
            <Send2 className="size-4.5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Tipos de correo</h1>
            <p className="text-sm text-muted-foreground">Correos de marketing y de otros servicios (no los de reparaciones): cuántos se han enviado de cada tipo y si está activo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {esSuperadmin && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setNuevoAbierto(true)}>
              <Add className="size-4" /> Nuevo tipo
            </Button>
          )}
          <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {kpi("Tipos activos", num(totales.activos), <TickCircle className="size-4" />, "bg-green-500/10 text-green-600 dark:text-green-400", estado === "activo", () => setEstado(estado === "activo" ? "" : "activo"))}
        {kpi("Desactivados", num(totales.desactivados), <Warning2 className="size-4" />, "bg-amber-500/10 text-amber-600 dark:text-amber-400", estado === "desactivado", () => setEstado(estado === "desactivado" ? "" : "desactivado"))}
        {kpi("Enviados hoy", num(totales.hoy), <Send2 className="size-4" />, "bg-sky-500/10 text-sky-600 dark:text-sky-400")}
        {kpi("Enviados 30 días", num(totales.d30), <Send2 className="size-4" />, "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400")}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar tipo de correo…" className="h-8 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <Select value={categoria || "todas"} onValueChange={(v) => setCategoria(!v || v === "todas" ? "" : v)}>
          <SelectTrigger className="h-8 w-48">
            <SelectValue>{(v: string) => (v === "todas" ? "Todas las categorías" : ETIQUETA_CATEGORIA[v] || v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c} value={c}>{ETIQUETA_CATEGORIA[c] || c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(categoria || estado) && (
          <Button variant="ghost" size="sm" className="h-8" onClick={() => { setCategoria(""); setEstado(""); }}>
            Quitar filtros
          </Button>
        )}
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Correo</TableHead>
              <TableHead className="text-right">Hoy</TableHead>
              <TableHead className="text-right">7 días</TableHead>
              <TableHead className="text-right">30 días</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Fallidos</TableHead>
              <TableHead>Último envío</TableHead>
              <TableHead className="text-center">Activo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            {!cargando && visibles.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">{tipos.length === 0 ? "Todavía no hay tipos de correo. Crea uno con \"Nuevo tipo\" o aparecerán cuando n8n envíe el primero." : "Ningún tipo de correo coincide con los filtros"}</TableCell>
              </TableRow>
            )}
            {!cargando &&
              grupos.map(([cat, lista]) => (
                <GrupoFilas key={cat} titulo={ETIQUETA_CATEGORIA[cat] || cat} lista={lista}>
                  {(t) => (
                    <TableRow key={t.tipo} className={t.activo ? "" : "bg-muted/30"}>
                      <TableCell className="max-w-96">
                        <Link href={`/mails/tipos/${encodeURIComponent(t.tipo)}`} className={`block text-sm font-medium hover:text-primary hover:underline ${t.activo ? "" : "text-muted-foreground line-through"}`}>
                          {t.nombre}
                          <span className={`ml-2 inline-flex rounded px-1.5 py-0.5 align-middle text-[10px] font-medium no-underline ${t.tiene_plantilla ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "bg-muted text-muted-foreground"}`}>
                            {t.tiene_plantilla ? "Plantilla JS" : "Sin plantilla"}
                          </span>
                        </Link>
                        <span className="block truncate text-xs text-muted-foreground" title={t.descripcion}>{t.descripcion || t.tipo}</span>
                        {t.omitidos > 0 && (
                          <span className="block text-xs text-amber-600 dark:text-amber-400">
                            {num(t.omitidos)} bloqueado{t.omitidos !== 1 ? "s" : ""} por estar desactivado{t.ultimo_omitido ? ` · último ${fechaHora(t.ultimo_omitido)}` : ""}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{num(t.enviados_hoy)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{num(t.enviados_7d)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{num(t.enviados_30d)}</TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">{num(t.enviados)}</TableCell>
                      <TableCell className={`text-right text-sm tabular-nums ${t.fallidos ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>{num(t.fallidos)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{t.ultimo ? fechaHora(t.ultimo) : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={t.activo}
                          disabled={!esSuperadmin || !t.desactivable || procesando === t.tipo}
                          onCheckedChange={(v) => (v ? cambiarActivo(t, true) : setADesactivar(t))}
                          aria-label={`${t.activo ? "Desactivar" : "Activar"} ${t.nombre}`}
                          title={!t.desactivable ? "Este tipo no se puede desactivar" : !esSuperadmin ? "Solo el superadmin puede cambiarlo" : undefined}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </GrupoFilas>
              ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Un tipo desactivado no debe enviarse. n8n consulta y registra cada envío en el webhook <span className="font-mono">/webhooks/n8n-mail-tipo</span>
        (acción <span className="font-mono">consultar</span> antes de enviar y <span className="font-mono">registrar</span> después); así se cuentan aquí.
      </p>

      <Dialog open={!!aDesactivar} onOpenChange={(o) => !o && setADesactivar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Desactivar &quot;{aDesactivar?.nombre}&quot;</DialogTitle>
            <DialogDescription>
              Mientras esté desactivado, n8n dejará de enviar este tipo de correo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setADesactivar(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                const t = aDesactivar;
                setADesactivar(null);
                if (t) cambiarActivo(t, false);
              }}
            >
              Desactivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {esSuperadmin && (
        <NuevoTipoDialog
          open={nuevoAbierto}
          onOpenChange={setNuevoAbierto}
          categorias={categorias}
          onCreado={(clave) => {
            setNuevoAbierto(false);
            router.push(`/mails/tipos/${encodeURIComponent(clave)}`);
          }}
        />
      )}
    </div>
  );
}

function GrupoFilas({ titulo, lista, children }: { titulo: string; lista: TipoCorreo[]; children: (t: TipoCorreo) => React.ReactNode }) {
  return (
    <>
      <TableRow className="bg-muted/50 hover:bg-muted/50">
        <TableCell colSpan={8} className="py-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {titulo} · {lista.length}
        </TableCell>
      </TableRow>
      {lista.map((t) => children(t))}
    </>
  );
}

function NuevoTipoDialog({
  open,
  onOpenChange,
  categorias,
  onCreado,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorias: string[];
  onCreado: (clave: string) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("marketing");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (open) {
      setNombre("");
      setCategoria("marketing");
      setDescripcion("");
    }
  }, [open]);

  async function crear() {
    if (!nombre.trim()) return toast.error("Escribe un nombre");
    setEnviando(true);
    try {
      const res = await fetch("/api/mails/tipos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim(), categoria, descripcion: descripcion.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Tipo creado. Clave para n8n: ${data.tipo}`);
      onCreado(data.tipo as string);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enviando && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Send2 className="size-5" /> Nuevo tipo de correo</DialogTitle>
          <DialogDescription>Por ejemplo una campaña de marketing. Podrás activarla o desactivarla y ver cuántos se envían. Con la clave que se genera, n8n lo consulta y lo registra.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ntNombre">Nombre *</Label>
            <Input id="ntNombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Campaña de otoño" />
          </div>
          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <Select value={categoria} onValueChange={(v) => v && setCategoria(v)}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue>{(v: string) => ETIQUETA_CATEGORIA[v] || v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c} value={c}>{ETIQUETA_CATEGORIA[c] || c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ntDesc">Descripción</Label>
            <Textarea id="ntDesc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={enviando} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={enviando} onClick={crear}>Crear</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
