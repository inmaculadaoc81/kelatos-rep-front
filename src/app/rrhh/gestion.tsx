"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DetalleComunicado, Etiqueta } from "./comunicados";
import { TIPOS, fecha, leerArchivos, pedir, type Adjunto, type ComunicadoFila, type Persona, type Yo } from "./comunes";

const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm";
const mensaje = (e: unknown) => (e instanceof Error ? e.message : "No se pudo completar");

function Nuevo({ personas, alEnviar }: { personas: Persona[]; alEnviar: () => void }) {
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
      setAsunto(""); setCuerpo(""); setPara([]); setAdjuntos([]); setConformidad(false);
      alEnviar();
    } catch (e) {
      toast.error(mensaje(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="space-y-2">
        <h2 className="font-semibold">Nuevo comunicado</h2>
        <select className={SELECT} value={tipo} onChange={(e) => { setTipo(e.target.value); setConformidad(["contrato", "sancion"].includes(e.target.value)); }}>
          {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v.nombre}</option>)}
        </select>
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
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={conformidad} onChange={(e) => setConformidad(e.target.checked)} /> Pedir «Recibido y conforme»</label>
        <p className="text-xs text-muted-foreground">A cada persona le llega un aviso a su correo, sin el contenido. El texto y los adjuntos solo se ven en el dashboard.</p>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Para ({para.length})</h3>
        <label className="flex items-center gap-2 border-b pb-2 text-sm font-medium"><input type="checkbox" checked={todos} onChange={() => setPara(todos ? [] : personas.map((p) => p.email))} /> Toda la empresa</label>
        <div className="max-h-64 space-y-1.5 overflow-y-auto">
          {personas.map((p) => (
            <label key={p.email} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={para.includes(p.email)} onChange={() => setPara(para.includes(p.email) ? para.filter((x) => x !== p.email) : [...para, p.email])} />
              {p.nombre} <span className="text-xs text-muted-foreground">{p.email}</span>
            </label>
          ))}
        </div>
        <Button className="w-full" disabled={enviando || !asunto.trim() || !cuerpo.trim() || !para.length} onClick={enviar}>{enviando ? "Enviando…" : "Enviar comunicado"}</Button>
      </div>
    </section>
  );
}

function Historial({ personas, abrir }: { personas: Persona[]; abrir: (id: number) => void }) {
  const [empleado, setEmpleado] = useState("");
  const [lista, setLista] = useState<ComunicadoFila[]>([]);
  useEffect(() => {
    setLista([]);
    if (empleado) pedir<{ comunicados: ComunicadoFila[] }>(`historial?empleado=${encodeURIComponent(empleado)}`).then((d) => setLista(d.comunicados)).catch((e) => toast.error(mensaje(e)));
  }, [empleado]);
  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="font-semibold">Historial del empleado</h2>
      <select className={`${SELECT} max-w-sm`} value={empleado} onChange={(e) => setEmpleado(e.target.value)}>
        <option value="">Elige a una persona…</option>
        {personas.map((p) => <option key={p.email} value={p.email}>{p.nombre}</option>)}
      </select>
      <p className="text-xs text-muted-foreground">Solo aparecen los comunicados de empresa. El correo personal de cada persona no se puede ver.</p>
      {empleado && lista.length === 0 && <p className="text-sm text-muted-foreground">Sin comunicados.</p>}
      {lista.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1.5 pr-2">Fecha</th><th className="pr-2">Tipo</th><th className="pr-2">Asunto</th><th className="pr-2">Leído</th><th>Conforme</th></tr></thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id} className="cursor-pointer border-t hover:bg-muted/60" onClick={() => abrir(c.id)}>
                  <td className="py-2 pr-2 whitespace-nowrap">{fecha(c.creado_en)}</td><td className="pr-2"><Etiqueta tipo={c.tipo} /></td><td className="pr-2">{c.asunto}</td>
                  <td className="pr-2 whitespace-nowrap">{fecha(c.leido_en)}</td><td className="whitespace-nowrap">{c.requiere_conformidad ? fecha(c.conforme_en) : "No se pide"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Equipo() {
  const [miembros, setMiembros] = useState<string[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const cargar = useCallback(() => {
    pedir<{ miembros: string[]; personas: Persona[] }>("miembros").then((d) => { setMiembros(d.miembros); setPersonas(d.personas); }).catch((e) => toast.error(mensaje(e)));
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  return (
    <section className="space-y-2 rounded-lg border bg-card p-4">
      <h2 className="font-semibold">Equipo de Recursos Humanos</h2>
      <p className="text-xs text-muted-foreground">Los super admin ya forman parte. Marca a quién más quieres dar acceso para enviar comunicados y ver historiales.</p>
      {personas.map((p) => (
        <label key={p.email} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={miembros.includes(p.email)} onChange={async (e) => {
            if (e.target.checked && !confirm(`${p.nombre} podrá enviar comunicados y ver los comunicados de todos (incluidas sanciones y nóminas). ¿Añadir?`)) return;
            try { await pedir("miembros", { email: p.email, activo: e.target.checked }); cargar(); } catch (err) { toast.error(mensaje(err)); }
          }} />
          {p.nombre} <span className="text-xs text-muted-foreground">{p.email}</span>
        </label>
      ))}
    </section>
  );
}

export function GestionRrhh({ yo }: { yo: Yo }) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [enviados, setEnviados] = useState<ComunicadoFila[]>([]);
  const [abierto, setAbierto] = useState<number | null>(null);
  const cargar = useCallback(() => {
    pedir<{ comunicados: ComunicadoFila[] }>("enviados").then((d) => setEnviados(d.comunicados)).catch((e) => toast.error(mensaje(e)));
  }, []);
  useEffect(() => {
    cargar();
    pedir<{ personas: Persona[] }>("personas").then((d) => setPersonas(d.personas)).catch((e) => toast.error(mensaje(e)));
  }, [cargar]);

  return (
    <div className="space-y-4">
      <Nuevo personas={personas} alEnviar={cargar} />
      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-2 font-semibold">Comunicados enviados</h2>
        {enviados.length === 0 && <p className="text-sm text-muted-foreground">Todavía no se ha enviado ninguno.</p>}
        <ul className="divide-y">
          {enviados.map((c) => (
            <li key={c.id}>
              <button onClick={() => setAbierto(c.id)} className="flex w-full flex-wrap items-center gap-2 py-2.5 text-left hover:bg-muted/60">
                <Etiqueta tipo={c.tipo} />
                <span className="min-w-0 flex-1 truncate text-sm">{c.asunto}</span>
                <span className="text-xs text-muted-foreground">Leído {c.leidos}/{c.destinatarios}{c.requiere_conformidad ? ` · Conforme ${c.conformes}/${c.destinatarios}` : ""}</span>
                <span className="text-[11px] text-muted-foreground">{fecha(c.creado_en)}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <Historial personas={personas} abrir={setAbierto} />
      {yo.superadmin && <Equipo />}
      <DetalleComunicado id={abierto} gestion cerrar={() => { setAbierto(null); cargar(); }} />
    </div>
  );
}
