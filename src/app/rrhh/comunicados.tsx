"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Paperclip2 } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { TIPOS, fecha, pedir, tamano, type ComunicadoFila } from "./comunes";
import { useConfirmar } from "./confirmar";

export function Etiqueta({ tipo }: { tipo: string }) {
  const t = TIPOS[tipo] || TIPOS.documento;
  return <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap", t.clases)}>{t.nombre}</span>;
}

export function Anulado() {
  return <span className="rounded border border-destructive/40 px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-destructive">Anulado</span>;
}

interface Detalle {
  comunicado: { id: number; tipo: string; asunto: string; cuerpo: string; requiere_conformidad: boolean; creado_por: string; creado_en: string; anulado_en: string | null; anulado_por: string | null };
  mio: { leido_en: string | null; conforme_en: string | null } | null;
  adjuntos: { id: number; nombre: string; tamano: number }[];
  destinatarios: { email: string; nombre: string; aviso_enviado_en: string | null; aviso_error: string | null; leido_en: string | null; conforme_en: string | null }[] | null;
}

/**
 * Contenido completo de un comunicado (texto, adjuntos, conformidad y, en gestión, quién lo ha leído).
 * `conTitulo`: pinta el asunto (en la ventana emergente ya lo pone la cabecera).
 */
export function ContenidoComunicado({ id, gestion = false, conTitulo = false, alFallar, alCargar, alRetirar }: { id: number; gestion?: boolean; conTitulo?: boolean; alFallar?: () => void; alCargar?: (asunto: string) => void; /** si se pasa (super admin), aparece «Eliminar» o «Anular» */ alRetirar?: (accion: "eliminar" | "anular") => void }) {
  const [d, setD] = useState<Detalle | null>(null);
  const [retirando, setRetirando] = useState(false);
  const [marcando, setMarcando] = useState(false);
  const { confirmar, modal } = useConfirmar();

  useEffect(() => {
    let vivo = true;
    setD(null);
    pedir<Detalle>(`comunicados/${id}`)
      .then((r) => { if (vivo) { setD(r); alCargar?.(r.comunicado.asunto); } })
      .catch((e) => { if (vivo) { toast.error(e instanceof Error ? e.message : "No se pudo abrir"); alFallar?.(); } });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function conforme() {
    if (!d || !(await confirmar({ titulo: "Recibido y conforme", texto: "Vas a dejar constancia de que has recibido este comunicado y estás conforme. Queda registrado con fecha y hora.", boton: "Confirmar" }))) return;
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

  // Sin leer por nadie: se puede eliminar. Si alguien ya lo abrió: solo anular. El servidor lo vuelve a comprobar.
  const loHanLeido = !!d?.destinatarios?.some((x) => x.leido_en || x.conforme_en);
  async function retirar() {
    if (!d) return;
    const accion = loHanLeido ? "anular" : "eliminar";
    const ok = await confirmar(accion === "eliminar"
      ? { titulo: "¿Eliminar el comunicado?", texto: `Nadie ha leído «${d.comunicado.asunto}». Se borrará del dashboard con sus adjuntos y queda registrado quién lo eliminó. El aviso que ya llegó al correo no se puede retirar.`, boton: "Eliminar", peligro: true }
      : { titulo: "¿Anular el comunicado?", texto: `«${d.comunicado.asunto}» ya se ha leído: seguirá en el historial marcado como anulado y ya no se podrá dar la conformidad.`, boton: "Anular", peligro: true });
    if (!ok) return;
    setRetirando(true);
    try {
      await pedir(`comunicados/${d.comunicado.id}/retirar`, { accion });
      toast.success(accion === "eliminar" ? "Comunicado eliminado" : "Comunicado anulado");
      if (accion === "anular") setD(await pedir<Detalle>(`comunicados/${d.comunicado.id}`));
      alRetirar?.(accion);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo completar");
      // alguien pudo leerlo mientras tanto: se vuelve a cargar para ofrecer lo correcto
      pedir<Detalle>(`comunicados/${d.comunicado.id}`).then(setD).catch(() => alFallar?.());
    } finally {
      setRetirando(false);
    }
  }

  if (!d) return <p className="p-8 text-center text-sm text-muted-foreground">Abriendo…</p>;
  return (
    <div className="space-y-4">
      {modal}
      {conTitulo && <h2 className="text-base font-semibold">{d.comunicado.asunto}</h2>}
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Etiqueta tipo={d.comunicado.tipo} /> {fecha(d.comunicado.creado_en)} · enviado por {d.comunicado.creado_por}</p>
      {d.comunicado.anulado_en && (
        <p className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">Comunicado anulado el {fecha(d.comunicado.anulado_en)}{gestion && d.comunicado.anulado_por ? ` por ${d.comunicado.anulado_por}` : ""}.</p>
      )}
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
          : d.comunicado.anulado_en ? null : <Button onClick={conforme} disabled={marcando}>{marcando ? "Registrando…" : "Recibido y conforme"}</Button>
      )}
      {gestion && d.destinatarios && (
        <div className="overflow-x-auto rounded-md border">
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
      {gestion && alRetirar && d.destinatarios && !d.comunicado.anulado_en && (
        <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-3">
          <p className="mr-auto text-xs text-muted-foreground">{loHanLeido ? "Ya se ha leído: solo se puede anular." : "Nadie lo ha leído todavía: se puede eliminar."}</p>
          <Button variant="destructive" size="sm" onClick={retirar} disabled={retirando}>{retirando ? "Un momento…" : loHanLeido ? "Anular" : "Eliminar"}</Button>
        </div>
      )}
    </div>
  );
}

/** El mismo contenido en una ventana emergente (vista «Comunicados» del empleado). */
export function DetalleComunicado({ id, cerrar }: { id: number | null; cerrar: () => void }) {
  const [asunto, setAsunto] = useState("");
  return (
    <Dialog open={id !== null} onOpenChange={(o) => { if (!o) { setAsunto(""); cerrar(); } }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle className="pr-6">{asunto || "Comunicado"}</DialogTitle></DialogHeader>
        {id !== null && <ContenidoComunicado id={id} alCargar={setAsunto} alFallar={cerrar} />}
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
                {!c.leido_en && !c.anulado_en && <span className="size-2 rounded-full bg-primary" />}
                <Etiqueta tipo={c.tipo} />
                {c.anulado_en && <Anulado />}
                <span className={cn("min-w-0 flex-1 truncate text-sm", !c.leido_en && !c.anulado_en && "font-semibold", c.anulado_en && "text-muted-foreground line-through")}>{c.asunto}</span>
                {!!c.adjuntos && <Paperclip2 className="size-3.5 text-muted-foreground" />}
                {c.requiere_conformidad && !c.anulado_en && <span className={cn("text-[11px] font-medium", c.conforme_en ? "text-emerald-600" : "text-amber-600")}>{c.conforme_en ? "Conforme" : "Falta tu conformidad"}</span>}
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
