"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Paperclip2 } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { TIPOS, fecha, pedir, tamano, type ComunicadoFila } from "./comunes";

export function Etiqueta({ tipo }: { tipo: string }) {
  const t = TIPOS[tipo] || TIPOS.documento;
  return <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap", t.clases)}>{t.nombre}</span>;
}

interface Detalle {
  comunicado: { id: number; tipo: string; asunto: string; cuerpo: string; requiere_conformidad: boolean; creado_por: string; creado_en: string };
  mio: { leido_en: string | null; conforme_en: string | null } | null;
  adjuntos: { id: number; nombre: string; tamano: number }[];
  destinatarios: { email: string; nombre: string; aviso_enviado_en: string | null; aviso_error: string | null; leido_en: string | null; conforme_en: string | null }[] | null;
}

/** Detalle de un comunicado. `gestion` = lo consulta Recursos Humanos (muestra quién lo ha leído). */
export function DetalleComunicado({ id, gestion = false, cerrar }: { id: number | null; gestion?: boolean; cerrar: () => void }) {
  const [d, setD] = useState<Detalle | null>(null);
  const [marcando, setMarcando] = useState(false);

  useEffect(() => {
    setD(null);
    if (id === null) return;
    pedir<Detalle>(`comunicados/${id}`).then(setD).catch((e) => { toast.error(e instanceof Error ? e.message : "No se pudo abrir"); cerrar(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function conforme() {
    if (!d || !confirm("Vas a dejar constancia de que has recibido este comunicado y estás conforme. Queda registrado con fecha y hora.")) return;
    setMarcando(true);
    try {
      const r = await pedir<{ conforme_en: string }>(`comunicados/${d.comunicado.id}/conforme`, {});
      setD({ ...d, mio: { leido_en: d.mio?.leido_en || r.conforme_en, conforme_en: r.conforme_en } });
      toast.success("Conformidad registrada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo registrar");
    } finally {
      setMarcando(false);
    }
  }

  return (
    <Dialog open={id !== null} onOpenChange={(o) => { if (!o) cerrar(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle className="pr-6">{d?.comunicado.asunto || "Abriendo…"}</DialogTitle></DialogHeader>
        {d && (
          <div className="space-y-4">
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Etiqueta tipo={d.comunicado.tipo} /> {fecha(d.comunicado.creado_en)} · enviado por {d.comunicado.creado_por}</p>
            <pre className="whitespace-pre-wrap break-words font-sans text-sm">{d.comunicado.cuerpo}</pre>
            {d.adjuntos.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {d.adjuntos.map((a) => (
                  <a key={a.id} href={`/api/rrhh/adjuntos/${a.id}?descargar=1`} className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs hover:bg-muted/70"><Paperclip2 className="size-3" /> {a.nombre} · {tamano(a.tamano)}</a>
                ))}
              </div>
            )}
            {d.mio && d.comunicado.requiere_conformidad && (
              d.mio.conforme_en
                ? <p className="rounded border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">Recibido y conforme el {fecha(d.mio.conforme_en)}.</p>
                : <Button onClick={conforme} disabled={marcando}>{marcando ? "Registrando…" : "Recibido y conforme"}</Button>
            )}
            {gestion && d.destinatarios && (
              <div className="overflow-x-auto rounded border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-left"><tr><th className="p-2">Persona</th><th className="p-2">Aviso al correo</th><th className="p-2">Leído</th>{d.comunicado.requiere_conformidad && <th className="p-2">Conforme</th>}</tr></thead>
                  <tbody>
                    {d.destinatarios.map((x) => (
                      <tr key={x.email} className="border-t">
                        <td className="p-2">{x.nombre}</td>
                        <td className={cn("p-2", x.aviso_error && "text-destructive")} title={x.aviso_error || ""}>{x.aviso_enviado_en ? fecha(x.aviso_enviado_en) : x.aviso_error ? "No se pudo enviar" : "—"}</td>
                        <td className="p-2">{fecha(x.leido_en)}</td>
                        {d.comunicado.requiere_conformidad && <td className="p-2">{fecha(x.conforme_en)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function MisComunicados({ recargarYo }: { recargarYo: () => void }) {
  const [lista, setLista] = useState<ComunicadoFila[] | null>(null);
  const [abierto, setAbierto] = useState<number | null>(null);
  const cargar = useCallback(() => {
    pedir<{ comunicados: ComunicadoFila[] }>("comunicados").then((d) => setLista(d.comunicados)).catch((e) => toast.error(e instanceof Error ? e.message : "No se pudo cargar"));
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  if (!lista) return <p className="p-6 text-sm text-muted-foreground">Cargando…</p>;
  return (
    <>
      <div className="rounded-lg border bg-card">
        {lista.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Todavía no tienes comunicados.</p>}
        <ul className="divide-y">
          {lista.map((c) => (
            <li key={c.id}>
              <button onClick={() => setAbierto(c.id)} className="flex w-full flex-wrap items-center gap-2 px-3 py-3 text-left hover:bg-muted/60">
                {!c.leido_en && <span className="size-2 rounded-full bg-primary" />}
                <Etiqueta tipo={c.tipo} />
                <span className={cn("min-w-0 flex-1 truncate text-sm", !c.leido_en && "font-semibold")}>{c.asunto}</span>
                {!!c.adjuntos && <Paperclip2 className="size-3.5 text-muted-foreground" />}
                {c.requiere_conformidad && <span className={cn("text-[11px] font-medium", c.conforme_en ? "text-emerald-600" : "text-amber-600")}>{c.conforme_en ? "Conforme" : "Falta tu conformidad"}</span>}
                <span className="text-[11px] text-muted-foreground">{fecha(c.creado_en)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <DetalleComunicado id={abierto} cerrar={() => { setAbierto(null); cargar(); recargarYo(); }} />
    </>
  );
}
