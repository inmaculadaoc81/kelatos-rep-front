"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Paperclip2, Refresh2 } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { fecha, leerArchivos, pedir, tamano, type Adjunto, type Yo } from "./comunes";

interface Dir { nombre: string; email: string }
interface Fila { uid: number; asunto: string; de: Dir[]; para: Dir[]; fecha: string; leido: boolean; adjuntos: boolean }
interface Mensaje {
  asunto: string; fecha: string | null; de: Dir[]; para: Dir[]; cc: Dir[]; responderA: string; messageId: string | null;
  texto: string; html: string; adjuntos: { i: number; nombre: string; tipo: string; tamano: number }[];
}
type Carpeta = "entrada" | "enviados";
interface Borrador { para: string; cc: string; asunto: string; texto: string; enRespuestaA?: string; adjuntos: Adjunto[] }

const nombres = (l: Dir[]) => l.map((d) => d.nombre || d.email).join(", ");

/** HTML de un correo en un marco aislado: sin scripts ni cargas remotas (tampoco imágenes de seguimiento). */
const documento = (html: string) => `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:"><base target="_blank">
<style>body{font-family:system-ui,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.5;margin:16px;color:#1f2937;word-break:break-word;background:#fff}img{max-width:100%;height:auto}</style></head><body>${html}</body></html>`;

function Conectar({ email, alConectar }: { email: string; alConectar: () => void }) {
  const [clave, setClave] = useState("");
  const [enviando, setEnviando] = useState(false);
  return (
    <form
      className="mx-auto max-w-md space-y-3 rounded-lg border bg-card p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setEnviando(true);
        try {
          await pedir("correo/conectar", { password: clave });
          setClave("");
          toast.success("Correo conectado");
          alConectar();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "No se pudo conectar");
        } finally {
          setEnviando(false);
        }
      }}
    >
      <h2 className="text-lg font-semibold">Conecta tu correo</h2>
      <p className="text-sm text-muted-foreground">
        Escribe una sola vez la contraseña de <strong className="text-foreground">{email}</strong>. Se guarda cifrada.
      </p>
      <Input type="password" autoComplete="off" placeholder="Contraseña de tu correo" value={clave} onChange={(e) => setClave(e.target.value)} />
      <Button type="submit" className="w-full" disabled={!clave || enviando}>{enviando ? "Comprobando…" : "Conectar"}</Button>
      <p className="text-xs text-muted-foreground">Solo tú ves tu correo desde el dashboard. Los mensajes no se guardan en el dashboard: se leen directamente del servidor de correo.</p>
    </form>
  );
}

export function CorreoPersonal({ yo, recargarYo }: { yo: Yo; recargarYo: () => void }) {
  const [carpeta, setCarpeta] = useState<Carpeta>("entrada");
  const [pagina, setPagina] = useState(1);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState<{ uid: number; m: Mensaje | null } | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [enviando, setEnviando] = useState(false);
  const conectado = yo.correo.conectado;

  const cargar = useCallback(async () => {
    if (!conectado) return;
    setCargando(true);
    try {
      const d = await pedir<{ mensajes: Fila[]; total: number }>(`correo/mensajes?carpeta=${carpeta}&pagina=${pagina}`);
      setFilas(d.mensajes);
      setTotal(d.total);
      setError("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo cargar el correo";
      setError(msg);
      if (/conecta|vuelve a conectar|no acepta esa contraseña/i.test(msg)) recargarYo();
    } finally {
      setCargando(false);
    }
  }, [carpeta, pagina, conectado, recargarYo]);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 90_000);
    return () => clearInterval(t);
  }, [cargar]);

  if (!yo.correo.disponible) {
    return <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Esta cuenta no tiene correo personal de empresa. Entra con tu cuenta @kelatos.com para usar «Mi correo».</p>;
  }
  if (!conectado) return <Conectar email={yo.email} alConectar={recargarYo} />;

  async function abrir(uid: number) {
    setAbierto({ uid, m: null });
    try {
      const d = await pedir<{ mensaje: Mensaje }>(`correo/mensaje?carpeta=${carpeta}&uid=${uid}`);
      setAbierto({ uid, m: d.mensaje });
      setFilas((l) => l.map((f) => (f.uid === uid ? { ...f, leido: true } : f)));
    } catch (e) {
      setAbierto(null);
      toast.error(e instanceof Error ? e.message : "No se pudo abrir el mensaje");
    }
  }

  async function enviar() {
    if (!borrador) return;
    setEnviando(true);
    try {
      await pedir("correo/enviar", borrador);
      toast.success("Correo enviado");
      setBorrador(null);
      if (carpeta === "enviados") cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo enviar");
    } finally {
      setEnviando(false);
    }
  }

  const m = abierto?.m;
  const paginas = Math.max(1, Math.ceil(total / 30));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setBorrador({ para: "", cc: "", asunto: "", texto: "", adjuntos: [] })}>Redactar</Button>
        {(["entrada", "enviados"] as Carpeta[]).map((c) => (
          <Button key={c} size="sm" variant={carpeta === c ? "secondary" : "ghost"} onClick={() => { setCarpeta(c); setPagina(1); setAbierto(null); }}>
            {c === "entrada" ? "Recibidos" : "Enviados"}
          </Button>
        ))}
        <Button size="sm" variant="outline" onClick={cargar} disabled={cargando}><Refresh2 className="mr-1 size-3.5" /> Actualizar</Button>
        <span className="ml-auto text-xs text-muted-foreground">{yo.email}</span>
        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={async () => { if (!confirm("¿Desconectar tu correo del dashboard?")) return; await pedir("correo/desconectar", {}); recargarYo(); }}>Desconectar</Button>
      </div>
      {error && <p className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className={cn("rounded-lg border bg-card", abierto && "hidden lg:block")}>
          {filas.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">{cargando ? "Cargando…" : "No hay mensajes"}</p>}
          <ul className="divide-y">
            {filas.map((f) => (
              <li key={f.uid}>
                <button onClick={() => abrir(f.uid)} className={cn("w-full px-3 py-2.5 text-left hover:bg-muted/60", abierto?.uid === f.uid && "bg-muted")}>
                  <div className="flex items-center gap-2">
                    {!f.leido && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                    <span className={cn("truncate text-sm", !f.leido && "font-semibold")}>{carpeta === "enviados" ? `Para: ${nombres(f.para)}` : nombres(f.de)}</span>
                    <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{fecha(f.fecha)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    {f.adjuntos && <Paperclip2 className="size-3.5 shrink-0" />}
                    <span className="truncate">{f.asunto}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {paginas > 1 && (
            <div className="flex items-center justify-between border-t p-2 text-xs">
              <Button size="sm" variant="ghost" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>Más recientes</Button>
              <span className="text-muted-foreground">{pagina} de {paginas}</span>
              <Button size="sm" variant="ghost" disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)}>Más antiguos</Button>
            </div>
          )}
        </div>

        <div className={cn("min-h-[300px] rounded-lg border bg-card", !abierto && "hidden lg:block")}>
          {!abierto && <p className="p-10 text-center text-sm text-muted-foreground">Elige un mensaje</p>}
          {abierto && !m && <p className="p-10 text-center text-sm text-muted-foreground">Abriendo…</p>}
          {abierto && m && (
            <article className="space-y-3 p-4">
              <Button size="sm" variant="ghost" className="lg:hidden" onClick={() => setAbierto(null)}>← Volver</Button>
              <h2 className="text-base font-semibold">{m.asunto}</h2>
              <div className="text-xs text-muted-foreground">
                <p>De: {m.de.map((d) => (d.nombre ? `${d.nombre} <${d.email}>` : d.email)).join(", ")}</p>
                <p>Para: {m.para.map((d) => d.email).join(", ")}{m.cc.length ? ` · CC: ${m.cc.map((d) => d.email).join(", ")}` : ""}</p>
                <p>{fecha(m.fecha)}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setBorrador({
                  para: carpeta === "enviados" ? m.para.map((d) => d.email).join(", ") : m.responderA, cc: "",
                  asunto: /^re:/i.test(m.asunto) ? m.asunto : `Re: ${m.asunto}`,
                  texto: `\n\n--- ${fecha(m.fecha)}, ${nombres(m.de)} ---\n${m.texto.split("\n").map((l) => `> ${l}`).join("\n").slice(0, 8000)}`,
                  enRespuestaA: m.messageId || undefined, adjuntos: [],
                })}>Responder</Button>
              </div>
              {m.adjuntos.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.adjuntos.map((a) => (
                    <a key={a.i} href={`/api/rrhh/correo/adjunto?carpeta=${carpeta}&uid=${abierto.uid}&i=${a.i}&descargar=1`} className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs hover:bg-muted/70">
                      <Paperclip2 className="size-3" /> {a.nombre} · {tamano(a.tamano)}
                    </a>
                  ))}
                </div>
              )}
              {m.html
                ? <iframe title="Mensaje" sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={documento(m.html)} className="h-[480px] w-full rounded border bg-white" />
                : <pre className="whitespace-pre-wrap break-words font-sans text-sm">{m.texto || "(sin texto)"}</pre>}
            </article>
          )}
        </div>
      </div>

      <Dialog open={!!borrador} onOpenChange={(o) => { if (!o && !enviando) setBorrador(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{borrador?.enRespuestaA ? "Responder" : "Nuevo correo"}</DialogTitle></DialogHeader>
          {borrador && (
            <div className="space-y-2">
              <Input placeholder="Para (separa varias direcciones con comas)" value={borrador.para} onChange={(e) => setBorrador({ ...borrador, para: e.target.value })} />
              <Input placeholder="CC (opcional)" value={borrador.cc} onChange={(e) => setBorrador({ ...borrador, cc: e.target.value })} />
              <Input placeholder="Asunto" value={borrador.asunto} onChange={(e) => setBorrador({ ...borrador, asunto: e.target.value })} />
              <Textarea placeholder="Mensaje" className="min-h-48" value={borrador.texto} onChange={(e) => setBorrador({ ...borrador, texto: e.target.value })} />
              <input type="file" multiple className="text-sm" onChange={async (e) => {
                try { setBorrador({ ...borrador, adjuntos: await leerArchivos(e.target.files, borrador.adjuntos) }); }
                catch (err) { toast.error(err instanceof Error ? err.message : "No se pudo adjuntar"); }
                e.target.value = "";
              }} />
              {borrador.adjuntos.length > 0 && (
                <ul className="flex flex-wrap gap-1.5 text-xs">
                  {borrador.adjuntos.map((a, i) => (
                    <li key={i} className="rounded bg-muted px-2 py-1">{a.nombre}{" "}
                      <button type="button" aria-label="Quitar" onClick={() => setBorrador({ ...borrador, adjuntos: borrador.adjuntos.filter((_, j) => j !== i) })}>×</button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-end"><Button disabled={enviando || !borrador.para.trim() || !borrador.asunto.trim() || !borrador.texto.trim()} onClick={enviar}>{enviando ? "Enviando…" : "Enviar"}</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
