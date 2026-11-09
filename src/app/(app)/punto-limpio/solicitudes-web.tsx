"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchNormal1, DocumentDownload } from "@/lib/icons";
import { descargarXlsxSolicitudesWeb } from "@/lib/punto-limpio-xlsx";
import { cn } from "@/lib/utils";

type Estado = "nueva" | "contactada" | "programada" | "recogida" | "completada" | "descartada";
interface Solicitud {
  id: number; referencia: string; creado_en: string; estado: Estado; nombre: string; email: string; telefono: string; tipo_solicitante: string | null; empresa: string | null;
  contacto_preferido: string | null; entrega: string | null; resumen: string | null; notas: string | null; atendido_por: string | null; atendido_en: string | null; adjuntos: number;
}
interface Datos {
  idioma?: string; pais?: string; nif?: string; materiales?: string[]; cantidad?: string; marca_modelo?: string; estado?: string; datos_personales?: string; descripcion?: string; copia_seguridad?: string;
  servicios?: string[]; nivel_destruccion?: string; numero_serie?: string; adicional?: string; c_destruccion?: boolean; c_whatsapp?: boolean; c_marketing?: boolean;
  rec?: { direccion: string; cp: string; localidad: string; provincia: string; piso?: string; ascensor?: string; restricciones?: string; fecha?: string; franja?: string; contacto?: string; telefono?: string };
}
interface Detalle { solicitud: Solicitud & { datos: Datos }; adjuntos: { id: number; nombre: string; tipo: string; tamano: number }[] }

const ESTADOS: { valor: Estado; etiqueta: string; clase: string }[] = [
  { valor: "nueva", etiqueta: "Nueva", clase: "bg-red-100 text-red-800" },
  { valor: "contactada", etiqueta: "Contactada", clase: "bg-sky-100 text-sky-800" },
  { valor: "programada", etiqueta: "Recogida programada", clase: "bg-violet-100 text-violet-800" },
  { valor: "recogida", etiqueta: "Recogida", clase: "bg-amber-100 text-amber-800" },
  { valor: "completada", etiqueta: "Completada", clase: "bg-emerald-100 text-emerald-800" },
  { valor: "descartada", etiqueta: "Descartada", clase: "bg-muted text-muted-foreground" },
];
const etiquetaEstado = (e: Estado) => ESTADOS.find((x) => x.valor === e)!;
const fechaHora = (iso: string) => new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const soloDigitos = (t: string) => t.replace(/[^\d]/g, "");

export function BadgeEstado({ e }: { e: Estado }) {
  const x = etiquetaEstado(e);
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", x.clase)}>{x.etiqueta}</span>;
}

/** Solicitudes de reciclaje y destrucción de datos que llegan por el formulario de la web de PuntoRecicla. */
export function SolicitudesWeb({ abrirId, onContadorNuevas }: { abrirId?: number | null; onContadorNuevas?: (n: number) => void }) {
  const [filas, setFilas] = useState<Solicitud[]>([]);
  const [contadores, setContadores] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"" | Estado>("");
  const [q, setQ] = useState("");
  const [abierta, setAbierta] = useState<number | null>(abrirId ?? null);
  const [exportando, setExportando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/reciclaje/solicitudes", { cache: "no-store" });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "Error");
      setFilas(d.solicitudes as Solicitud[]);
      setContadores(d.contadores as Record<string, number>);
      onContadorNuevas?.((d.contadores as Record<string, number>).nueva ?? 0);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }, [onContadorNuevas]);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { if (abrirId) setAbierta(abrirId); }, [abrirId]);

  const texto = q.trim().toLowerCase();
  const visibles = filas.filter((f) => (!filtro || f.estado === filtro) && (!texto || [f.referencia, f.nombre, f.empresa ?? "", f.email, f.telefono, f.resumen ?? ""].join(" ").toLowerCase().includes(texto)));

  async function exportarExcel() {
    if (!visibles.length) return toast.error("No hay solicitudes que exportar");
    setExportando(true);
    try {
      await descargarXlsxSolicitudesWeb(visibles, (e) => ESTADOS.find((x) => x.valor === e)?.etiqueta ?? e);
      toast.success(`${visibles.length} solicitud(es) exportadas a Excel`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar el Excel");
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">No se pudo cargar: {error}</div>}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchNormal1 className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Referencia, nombre, correo, material…" className="w-72 pl-7" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={exportarExcel} disabled={cargando || exportando || visibles.length === 0} title="Descarga en Excel las solicitudes que se ven en pantalla (con el filtro aplicado)">
          <DocumentDownload className="size-4" /> {exportando ? "Exportando…" : "Exportar a Excel"}
        </Button>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setFiltro("")} className={cn("rounded-full border px-2.5 py-1 text-xs", filtro === "" ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-accent")}>Todas ({filas.length})</button>
          {ESTADOS.map((e) => (
            <button key={e.valor} type="button" onClick={() => setFiltro(filtro === e.valor ? "" : e.valor)} className={cn("rounded-full border px-2.5 py-1 text-xs", filtro === e.valor ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-accent")}>
              {e.etiqueta} ({contadores[e.valor] ?? 0})
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-primary hover:bg-primary [&_th]:text-primary-foreground">
              <TableHead>Referencia</TableHead><TableHead>Recibida</TableHead><TableHead>Solicitante</TableHead><TableHead>Qué quiere reciclar</TableHead><TableHead>Entrega</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && Array.from({ length: 4 }).map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)}
            {!cargando && visibles.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No hay solicitudes con este filtro. Las que lleguen por el formulario de la web aparecerán aquí.</TableCell></TableRow>}
            {visibles.map((f) => (
              <TableRow key={f.id} className={cn("cursor-pointer", f.estado === "nueva" && "bg-red-50/60 dark:bg-red-950/20")} onClick={() => setAbierta(f.id)}>
                <TableCell className="font-mono text-xs font-semibold text-primary">{f.referencia}</TableCell>
                <TableCell className="text-sm whitespace-nowrap text-muted-foreground">{fechaHora(f.creado_en)}</TableCell>
                <TableCell className="max-w-48 whitespace-normal text-sm"><div className="font-medium">{f.nombre}</div><div className="text-xs text-muted-foreground">{f.empresa || f.tipo_solicitante}</div></TableCell>
                <TableCell className="max-w-64 whitespace-normal text-sm">{f.resumen || "—"}{f.adjuntos > 0 && <span className="ml-1 text-xs text-muted-foreground">· {f.adjuntos} adjunto{f.adjuntos === 1 ? "" : "s"}</span>}</TableCell>
                <TableCell className="max-w-44 whitespace-normal text-sm">{f.entrega || "—"}</TableCell>
                <TableCell><BadgeEstado e={f.estado} /></TableCell>
                <TableCell className="text-right"><Button size="sm" variant="outline" onClick={(ev) => { ev.stopPropagation(); setAbierta(f.id); }}>Ver</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DetalleSolicitud id={abierta} onClose={() => setAbierta(null)} onCambiada={cargar} />
    </div>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor?: string | null }) {
  if (!valor) return null;
  return (
    <div className="flex flex-col gap-0.5 py-1.5 text-sm sm:flex-row sm:gap-3">
      <dt className="shrink-0 text-muted-foreground sm:w-36">{etiqueta}</dt>
      <dd className="min-w-0 font-medium break-words whitespace-pre-wrap">{valor}</dd>
    </div>
  );
}

function Tarjeta({ titulo, children, className }: { titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border bg-card p-4", className)}>
      <h3 className="mb-2 border-b pb-2 text-xs font-semibold tracking-wide text-primary uppercase">{titulo}</h3>
      <dl className="divide-y divide-border/60">{children}</dl>
    </section>
  );
}

const botonContacto = "inline-flex h-8 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent";

function DetalleSolicitud({ id, onClose, onCambiada }: { id: number | null; onClose: () => void; onCambiada: () => void }) {
  const [det, setDet] = useState<Detalle | null>(null);
  const [estado, setEstado] = useState<Estado>("nueva");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!id) { setDet(null); return; }
    let activo = true;
    setDet(null);
    fetch(`/api/reciclaje/solicitudes/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (!activo) return; if (!d.ok) return toast.error(d.error || "Error"); setDet(d as Detalle); setEstado((d as Detalle).solicitud.estado); setNotas((d as Detalle).solicitud.notas ?? ""); })
      .catch(() => toast.error("No se pudo abrir la solicitud"));
    return () => { activo = false; };
  }, [id]);

  async function guardar() {
    if (!id) return;
    setGuardando(true);
    try {
      const res = await fetch(`/api/reciclaje/solicitudes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado, notas }) });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "Error");
      toast.success("Solicitud actualizada");
      setDet(d as Detalle);
      onCambiada();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  const s = det?.solicitud;
  const d = s?.datos;
  const wa = s ? `https://wa.me/${soloDigitos(s.telefono).replace(/^00/, "")}` : "";
  return (
    <Dialog open={id !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <div className="border-b px-6 py-4 pr-12">
          <DialogTitle className="flex flex-wrap items-center gap-2 text-lg">
            {s ? <><span className="font-mono text-primary">{s.referencia}</span> <BadgeEstado e={s.estado} /></> : "Solicitud de reciclaje"}
          </DialogTitle>
          {s && <p className="mt-1 text-sm text-muted-foreground">Recibida el {fechaHora(s.creado_en)} · {s.resumen || "Sin resumen"}</p>}
        </div>

        {!s || !d ? (
          <div className="p-6"><Skeleton className="h-48 w-full" /></div>
        ) : (
          <>
            <div className="grid flex-1 gap-4 overflow-y-auto bg-muted/30 p-6 md:grid-cols-2">
              <Tarjeta titulo="Contacto">
                <Fila etiqueta="Nombre" valor={s.nombre} />
                <Fila etiqueta="Tipo" valor={s.tipo_solicitante} />
                <Fila etiqueta="Empresa" valor={[s.empresa, d.nif].filter(Boolean).join(" · ")} />
                <Fila etiqueta="Correo" valor={s.email} />
                <Fila etiqueta="Teléfono" valor={s.telefono} />
                <Fila etiqueta="Prefiere" valor={s.contacto_preferido} />
                <Fila etiqueta="Idioma / país" valor={[d.idioma, d.pais].filter(Boolean).join(" · ")} />
                <div className="flex flex-wrap gap-2 pt-3">
                  <a className={botonContacto} href={`mailto:${s.email}?subject=${encodeURIComponent(`Tu solicitud de reciclaje ${s.referencia}`)}`}>Correo</a>
                  <a className={botonContacto} href={`tel:${s.telefono}`}>Llamar</a>
                  <a className={botonContacto} href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                </div>
              </Tarjeta>

              <Tarjeta titulo="Qué quiere reciclar">
                <Fila etiqueta="Material" valor={d.materiales?.join(", ")} />
                <Fila etiqueta="Cantidad" valor={d.cantidad} />
                <Fila etiqueta="Marca y modelo" valor={d.marca_modelo} />
                <Fila etiqueta="Estado" valor={d.estado} />
                <Fila etiqueta="¿Contienen datos?" valor={d.datos_personales} />
                <Fila etiqueta="Copia de seguridad" valor={d.copia_seguridad} />
                <Fila etiqueta="Descripción" valor={d.descripcion} />
              </Tarjeta>

              <Tarjeta titulo="Servicios y entrega">
                <Fila etiqueta="Servicios" valor={d.servicios?.join(", ")} />
                <Fila etiqueta="Destrucción" valor={d.nivel_destruccion} />
                <Fila etiqueta="Nº de serie" valor={d.numero_serie} />
                <Fila etiqueta="Entrega" valor={s.entrega} />
                <Fila etiqueta="Autoriza destrucción" valor={d.c_destruccion ? "Sí, expresamente" : "No"} />
                <Fila etiqueta="WhatsApp" valor={d.c_whatsapp ? "Autorizado" : "No autorizado"} />
                <Fila etiqueta="Novedades" valor={d.c_marketing ? "Sí" : "No"} />
              </Tarjeta>

              {d.rec ? (
                <Tarjeta titulo="Recogida a domicilio">
                  <Fila etiqueta="Dirección" valor={`${d.rec.direccion}, ${d.rec.cp} ${d.rec.localidad} (${d.rec.provincia})`} />
                  <Fila etiqueta="Piso / puerta" valor={d.rec.piso} />
                  <Fila etiqueta="Ascensor" valor={d.rec.ascensor} />
                  <Fila etiqueta="Escaleras / pesados" valor={d.rec.restricciones} />
                  <Fila etiqueta="Preferencia" valor={[d.rec.fecha, d.rec.franja].filter(Boolean).join(" · ")} />
                  <Fila etiqueta="Contacto" valor={[d.rec.contacto, d.rec.telefono].filter(Boolean).join(" · ")} />
                </Tarjeta>
              ) : (
                <Tarjeta titulo="Recogida a domicilio"><p className="py-1.5 text-sm text-muted-foreground">No solicita recogida: llevará los equipos a las instalaciones.</p></Tarjeta>
              )}

              {(d.adicional || det.adjuntos.length > 0) && (
                <section className="space-y-3 rounded-lg border bg-card p-4 md:col-span-2">
                  {d.adicional && (
                    <div>
                      <h3 className="mb-1 text-xs font-semibold tracking-wide text-primary uppercase">Información adicional</h3>
                      <p className="text-sm whitespace-pre-wrap">{d.adicional}</p>
                    </div>
                  )}
                  {det.adjuntos.length > 0 && (
                    <div>
                      <h3 className="mb-1 text-xs font-semibold tracking-wide text-primary uppercase">Adjuntos ({det.adjuntos.length})</h3>
                      <div className="flex flex-wrap gap-2">
                        {det.adjuntos.map((a) => (
                          <a key={a.id} href={`/api/reciclaje/solicitudes/${s.id}/adjuntos/${a.id}`} target="_blank" rel="noopener noreferrer" className={botonContacto}>
                            {a.nombre} <span className="ml-1 text-xs font-normal text-muted-foreground">{Math.max(1, Math.round(a.tamano / 1024))} KB</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>

            <div className="grid gap-3 border-t bg-background px-6 py-4 md:grid-cols-[14rem_1fr_auto] md:items-end">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase">Estado</label>
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={estado} onChange={(e) => setEstado(e.target.value as Estado)}>
                  {ESTADOS.map((e) => <option key={e.valor} value={e.valor}>{e.etiqueta}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase">Notas internas</label>
                <Textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="A quién se llamó, día de recogida, precio acordado…" maxLength={4000} />
              </div>
              <div className="flex gap-2"><Button variant="ghost" onClick={onClose}>Cerrar</Button><Button onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</Button></div>
              {s.atendido_por && <p className="text-xs text-muted-foreground md:col-span-3">Último cambio: {s.atendido_por}{s.atendido_en ? ` · ${fechaHora(s.atendido_en)}` : ""}</p>}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
