"use client";

import { useState } from "react";
import { Paperclip2, DocumentDownload } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { AdjuntoMail, COLOR_ESTADO_LEAD, EstadoLead, MensajeHilo, tamanoLegible } from "@/lib/mails";

/** Piezas de lectura de correo compartidas por el Centro de mails y la ficha de un lead. */

export function fechaCorta(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hoy = new Date();
  const opts: Intl.DateTimeFormatOptions = { timeZone: "Europe/Madrid" };
  const mismoDia = d.toLocaleDateString("es-ES", opts) === hoy.toLocaleDateString("es-ES", opts);
  return mismoDia
    ? d.toLocaleTimeString("es-ES", { ...opts, hour: "2-digit", minute: "2-digit", hour12: false })
    : d.toLocaleDateString("es-ES", { ...opts, day: "2-digit", month: "short", year: d.getFullYear() === hoy.getFullYear() ? undefined : "2-digit" });
}

export function fechaLarga(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "full", timeStyle: "short", hour12: false });
}

/** Fecha y hora numérica corta (24/09/2026 18:05), para tablas. */
export function fechaHora(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Envuelve el HTML de un correo para mostrarlo en un iframe aislado: sin scripts
    (sandbox), sin formularios y con una política que bloquea todo lo remoto —
    imágenes remotas (píxeles de seguimiento) y cualquier carga externa. */
export function documentoSeguro(html: string): string {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: cid:; style-src 'unsafe-inline'; font-src data:">
<base target="_blank">
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.5;margin:16px;color:#1f2937;word-break:break-word}img{max-width:100%;height:auto}table{max-width:100%}blockquote{border-left:3px solid #d1d5db;margin:8px 0;padding-left:12px;color:#4b5563}</style>
</head><body>${html}</body></html>`;
}

export function LinksAdjuntos({ adjuntos }: { adjuntos: AdjuntoMail[] }) {
  if (!adjuntos.length) return null;
  return (
    <p className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground">
      <Paperclip2 className="size-3.5" />
      {adjuntos.map((a) =>
        a.guardado ? (
          <a key={a.id} href={`/api/mails/adjuntos/${a.id}`} className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 hover:bg-muted/70 hover:text-foreground" title="Descargar">
            <DocumentDownload className="size-3" /> {a.nombre}
            {a.tamano ? <span className="text-muted-foreground/70">· {tamanoLegible(a.tamano)}</span> : null}
          </a>
        ) : (
          <span key={a.id} className="rounded bg-muted px-1.5 py-0.5" title="Demasiado grande: solo se guardó el nombre">
            {a.nombre}
          </span>
        )
      )}
    </p>
  );
}

export function CuerpoMensaje({ m, altura }: { m: Pick<MensajeHilo, "cuerpo_html" | "cuerpo_texto" | "truncado">; altura: string }) {
  const [verTexto, setVerTexto] = useState(false);
  return (
    <>
      {m.cuerpo_html && m.cuerpo_texto && (
        <Button variant="ghost" size="sm" className="mx-4 mt-1 h-6 px-2 text-xs" onClick={() => setVerTexto((v) => !v)}>
          {verTexto ? "Ver formato original" : "Ver como texto"}
        </Button>
      )}
      {m.cuerpo_html && !verTexto ? (
        <iframe
          title="Contenido del correo"
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          srcDoc={documentoSeguro(m.cuerpo_html)}
          referrerPolicy="no-referrer"
          className={`w-full border-0 ${altura}`}
        />
      ) : (
        <pre className={`overflow-auto whitespace-pre-wrap p-4 font-sans text-sm ${altura}`}>{m.cuerpo_texto || "(mensaje sin contenido)"}</pre>
      )}
      {m.truncado && <p className="border-t px-4 py-2 text-xs text-muted-foreground">Mensaje muy largo: se guardó recortado.</p>}
    </>
  );
}

/** Pastilla con el estado de un lead (mismos colores en la lista, la ficha y la bandeja). */
export function PastillaEstado({ estado }: { estado: EstadoLead }) {
  return <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${COLOR_ESTADO_LEAD[estado]}`}>{estado}</span>;
}
