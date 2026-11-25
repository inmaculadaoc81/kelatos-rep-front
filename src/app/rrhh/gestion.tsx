"use client";

// Gestión de RRHH con la misma organización que Gestión MAILS: carpetas y empleados a la izquierda,
// lista en el centro y el comunicado abierto a la derecha. El comunicado nuevo se escribe en una ventana («Nuevo comunicado»).
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Category2, Eye, TickCircle, Notification, Wallet, DocumentText, Calendar, Warning2, Folder2, Edit2, Refresh2, Profile2User, SearchNormal1 } from "@/lib/icons";
import type { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { ContenidoComunicado, Etiqueta } from "./comunicados";
import { TIPOS, fecha, leerArchivos, pedir, type Adjunto, type ComunicadoFila, type Persona, type Yo } from "./comunes";

const mensaje = (e: unknown) => (e instanceof Error ? e.message : "No se pudo completar");

const ICONOS: Record<string, { icono: Icon; color: string }> = {
  aviso: { icono: Notification, color: "bg-sky-500" },
  nomina: { icono: Wallet, color: "bg-emerald-500" },
  contrato: { icono: DocumentText, color: "bg-violet-500" },
  vacaciones: { icono: Calendar, color: "bg-amber-500" },
  sancion: { icono: Warning2, color: "bg-rose-500" },
  documento: { icono: Folder2, color: "bg-slate-500" },
};

const sinLeer = (c: ComunicadoFila) => (c.destinatarios !== undefined ? (c.leidos ?? 0) < c.destinatarios : !c.leido_en);
const sinConformidad = (c: ComunicadoFila) => c.requiere_conformidad && (c.destinatarios !== undefined ? (c.conformes ?? 0) < c.destinatarios : !c.conforme_en);

function Carpeta({ activa, icono: I, color, texto, total, onClick }: { activa: boolean; icono: Icon; color: string; texto: string; total: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm", activa ? "bg-primary/10 font-medium" : "hover:bg-muted/60")}>
      <span className={cn("flex size-[22px] shrink-0 items-center justify-center rounded-md text-white", color)}><I className="size-3.5" /></span>
      <span className="min-w-0 flex-1 truncate">{texto}</span>
      <span className="text-xs text-muted-foreground">{total}</span>
    </button>
  );
}

function Nuevo({ abierto, cerrar, personas, alEnviar }: { abierto: boolean; cerrar: () => void; personas: Persona[]; alEnviar: () => void }) {
  const [tipo, setTipo] = useState("aviso");
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [para, setPara] = useState<string[]>([]);
  const [conformidad, setConformidad] = useState(false);
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const [enviando, setEnviando] = useState(false);
  const todos = personas.length > 0 && para.length === personas.length;

  async function enviar() {
    const quienes = para.length === 1 ? personas.find((p) => p.email === para[0])?.nombre : `${para.length} personas`;
    if (!confirm(`Se enviará «${asunto}» a ${quienes}. Quedará en su historial y no se puede borrar. ¿Enviar?`)) return;
    setEnviando(true);
    try {
      const r = await pedir<{ avisosEnviados: number; avisosFallidos: string[] }>("comunicados", { tipo, asunto, cuerpo, destinatarios: para, requiereConformidad: conformidad, adjuntos });
      if (r.avisosFallidos.length) toast.warning(`Comunicado guardado. No se pudo avisar por correo a: ${r.avisosFallidos.join(", ")}`, { duration: 12000 });
      else toast.success(`Comunicado enviado. Avisos por correo: ${r.avisosEnviados}`);
      setAsunto(""); setCuerpo(""); setPara([]); setAdjuntos([]); setConformidad(false); setTipo("aviso");
      cerrar(); alEnviar();
    } catch (e) {
      toast.error(mensaje(e));
    } finally {
      setEnviando(false);
    }
  }

  const chip = (activo: boolean) => cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", activo ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted");

  return (
    <Dialog open={abierto} onOpenChange={(o) => { if (!o && !enviando) cerrar(); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Nuevo comunicado</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(TIPOS).map(([k, v]) => (
              <button key={k} type="button" className={chip(tipo === k)} onClick={() => { setTipo(k); setConformidad(["contrato", "sancion"].includes(k)); }}>{v.nombre}</button>
            ))}
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Para</p>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" className={chip(todos)} onClick={() => setPara(todos ? [] : personas.map((p) => p.email))}>Toda la empresa</button>
              {personas.map((p) => (
                <button key={p.email} type="button" title={p.email} className={chip(!todos && para.includes(p.email))} onClick={() => setPara(para.includes(p.email) ? para.filter((x) => x !== p.email) : [...para, p.email])}>{p.nombre}</button>
              ))}
            </div>
          </div>
          <Input placeholder="Asunto" value={asunto} onChange={(e) => setAsunto(e.target.value)} />
          <Textarea placeholder="Mensaje" className="min-h-40" value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} />
          <input type="file" multiple className="text-sm" onChange={async (e) => {
            try { setAdjuntos(await leerArchivos(e.target.files, adjuntos)); } catch (err) { toast.error(mensaje(err)); }
            e.target.value = "";
          }} />
          {adjuntos.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 text-xs">
              {adjuntos.map((a, i) => <li key={i} className="rounded bg-muted px-2 py-1">{a.nombre} <button type="button" aria-label="Quitar" onClick={() => setAdjuntos(adjuntos.filter((_, j) => j !== i))}>×</button></li>)}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-3 border-t pt-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={conformidad} onChange={(e) => setConformidad(e.target.checked)} /> Pedir «Recibido y conforme»</label>
            <Button className="ml-auto" disabled={enviando || !asunto.trim() || !cuerpo.trim() || !para.length} onClick={enviar}>{enviando ? "Enviando…" : `Enviar${para.length ? ` (${para.length})` : ""}`}</Button>
          </div>
          <p className="text-xs text-muted-foreground">Al correo de cada persona llega solo un aviso. El texto y los adjuntos se ven en el dashboard.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Equipo({ abierto, cerrar }: { abierto: boolean; cerrar: () => void }) {
  const [miembros, setMiembros] = useState<string[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const cargar = useCallback(() => {
    pedir<{ miembros: string[]; personas: Persona[] }>("miembros").then((d) => { setMiembros(d.miembros); setPersonas(d.personas); }).catch((e) => toast.error(mensaje(e)));
  }, []);
  useEffect(() => { if (abierto) cargar(); }, [abierto, cargar]);
  return (
    <Dialog open={abierto} onOpenChange={(o) => { if (!o) cerrar(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader><DialogTitle>Equipo de Recursos Humanos</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">Los super admin ya forman parte. Marca a quién más quieres dar acceso.</p>
        <div className="space-y-2">
          {personas.map((p) => (
            <label key={p.email} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={miembros.includes(p.email)} onChange={async (e) => {
                if (e.target.checked && !confirm(`${p.nombre} podrá enviar comunicados y ver los de todos (incluidas sanciones y nóminas). ¿Añadir?`)) return;
                try { await pedir("miembros", { email: p.email, activo: e.target.checked }); cargar(); } catch (err) { toast.error(mensaje(err)); }
              }} />
              {p.nombre} <span className="text-xs text-muted-foreground">{p.email}</span>
            </label>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function GestionRrhh({ yo }: { yo: Yo }) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [enviados, setEnviados] = useState<ComunicadoFila[] | null>(null);
  const [empleado, setEmpleado] = useState("");
  const [historial, setHistorial] = useState<ComunicadoFila[] | null>(null);
  const [carpeta, setCarpeta] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState<number | null>(null);
  const [redactando, setRedactando] = useState(false);
  const [equipo, setEquipo] = useState(false);

  const cargar = useCallback(() => {
    pedir<{ comunicados: ComunicadoFila[] }>("enviados").then((d) => setEnviados(d.comunicados)).catch((e) => toast.error(mensaje(e)));
  }, []);
  useEffect(() => {
    cargar();
    pedir<{ personas: Persona[] }>("personas").then((d) => setPersonas(d.personas)).catch((e) => toast.error(mensaje(e)));
  }, [cargar]);

  // al elegir a una persona se ve su historial (solo comunicados de empresa)
  useEffect(() => {
    setHistorial(null);
    if (!empleado) return;
    let vivo = true;
    pedir<{ comunicados: ComunicadoFila[] }>(`historial?empleado=${encodeURIComponent(empleado)}`)
      .then((d) => { if (vivo) setHistorial(d.comunicados); })
      .catch((e) => toast.error(mensaje(e)));
    return () => { vivo = false; };
  }, [empleado]);

  const base = empleado ? historial : enviados;
  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (base || []).filter((c) =>
      (carpeta === "todos" || (carpeta === "sin-leer" ? sinLeer(c) : carpeta === "sin-conforme" ? sinConformidad(c) : c.tipo === carpeta)) &&
      (!q || c.asunto.toLowerCase().includes(q)));
  }, [base, carpeta, busqueda]);
  const cuenta = (f: (c: ComunicadoFila) => boolean) => (base || []).filter(f).length;
  const nombreEmpleado = personas.find((p) => p.email === empleado)?.nombre;
  const elegir = (fn: () => void) => { fn(); setAbierto(null); };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-end gap-2">
        {yo.superadmin && <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEquipo(true)}><Profile2User className="size-4" /> Equipo</Button>}
        <Button size="sm" className="gap-1.5" onClick={() => setRedactando(true)}><Edit2 className="size-4" /> Nuevo comunicado</Button>
        <Button variant="outline" size="icon-sm" title="Actualizar" aria-label="Actualizar" onClick={cargar}><Refresh2 className="size-4" /></Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,360px)_minmax(0,1fr)]">
        {/* carpetas y empleados */}
        <div className="space-y-3">
          <div className="rounded-lg border bg-card p-1.5">
            <Carpeta activa={carpeta === "todos"} icono={Category2} color="bg-slate-600" texto="Todos" total={(base || []).length} onClick={() => elegir(() => setCarpeta("todos"))} />
            <Carpeta activa={carpeta === "sin-leer"} icono={Eye} color="bg-blue-600" texto="Sin leer" total={cuenta(sinLeer)} onClick={() => elegir(() => setCarpeta("sin-leer"))} />
            <Carpeta activa={carpeta === "sin-conforme"} icono={TickCircle} color="bg-orange-500" texto="Sin conformidad" total={cuenta(sinConformidad)} onClick={() => elegir(() => setCarpeta("sin-conforme"))} />
            <div className="my-1.5 border-t" />
            {Object.entries(TIPOS).map(([k, v]) => (
              <Carpeta key={k} activa={carpeta === k} icono={ICONOS[k].icono} color={ICONOS[k].color} texto={v.nombre} total={cuenta((c) => c.tipo === k)} onClick={() => elegir(() => setCarpeta(k))} />
            ))}
          </div>
          <div className="rounded-lg border bg-card">
            <p className="border-b px-3 py-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Empleados</p>
            <div className="max-h-[340px] overflow-y-auto p-1.5">
              <button onClick={() => elegir(() => setEmpleado(""))} className={cn("w-full rounded-md px-2 py-1.5 text-left text-sm", !empleado ? "bg-primary/10 font-medium" : "hover:bg-muted/60")}>Todos los empleados</button>
              {personas.map((p) => (
                <button key={p.email} onClick={() => elegir(() => setEmpleado(p.email))} className={cn("w-full rounded-md px-2 py-1.5 text-left", empleado === p.email ? "bg-primary/10" : "hover:bg-muted/60")}>
                  <span className="block truncate text-sm">{p.nombre}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{p.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* lista */}
        <div className={cn("flex min-h-[420px] flex-col rounded-lg border bg-card", abierto !== null && "hidden xl:flex")}>
          <div className="space-y-1.5 border-b p-2">
            <div className="relative">
              <SearchNormal1 className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar por asunto…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
            {empleado && <p className="px-1 text-[11px] text-muted-foreground">Historial de <strong className="text-foreground">{nombreEmpleado}</strong>. Solo comunicados de empresa; su correo no se puede ver.</p>}
          </div>
          {base === null && <p className="p-6 text-center text-sm text-muted-foreground">Cargando…</p>}
          {base !== null && lista.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No hay comunicados aquí.</p>}
          <ul className="divide-y overflow-y-auto">
            {lista.map((c) => (
              <li key={c.id}>
                <button onClick={() => setAbierto(c.id)} className={cn("w-full space-y-1 px-3 py-2.5 text-left", abierto === c.id ? "bg-muted" : "hover:bg-muted/60")}>
                  <div className="flex items-center gap-2">
                    {sinLeer(c) && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                    <span className={cn("min-w-0 flex-1 truncate text-sm", sinLeer(c) && "font-semibold")}>{c.asunto}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{fecha(c.creado_en)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Etiqueta tipo={c.tipo} />
                    <span className="truncate text-[11px] text-muted-foreground">
                      {c.destinatarios !== undefined
                        ? `Leído ${c.leidos}/${c.destinatarios}${c.requiere_conformidad ? ` · Conforme ${c.conformes}/${c.destinatarios}` : ""}`
                        : `${c.leido_en ? `Leído ${fecha(c.leido_en)}` : "Sin leer"}${c.requiere_conformidad ? (c.conforme_en ? " · Conforme" : " · Falta conformidad") : ""}`}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* detalle */}
        <div className={cn("min-h-[420px] rounded-lg border bg-card lg:col-start-2 xl:col-start-3", abierto === null && "hidden xl:block")}>
          {abierto === null
            ? <p className="p-12 text-center text-sm text-muted-foreground">Elige un comunicado para verlo</p>
            : (
              <div className="space-y-2 p-4">
                <Button size="sm" variant="ghost" className="xl:hidden" onClick={() => { setAbierto(null); cargar(); }}>← Volver a la lista</Button>
                <ContenidoComunicado key={abierto} id={abierto} gestion conTitulo alFallar={() => setAbierto(null)} />
              </div>
            )}
        </div>
      </div>

      <Nuevo abierto={redactando} cerrar={() => setRedactando(false)} personas={personas} alEnviar={() => { setEmpleado(""); setCarpeta("todos"); cargar(); }} />
      {yo.superadmin && <Equipo abierto={equipo} cerrar={() => setEquipo(false)} />}
    </div>
  );
}
