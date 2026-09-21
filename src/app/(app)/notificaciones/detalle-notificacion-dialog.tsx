"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  CANALES,
  CATEGORIAS,
  ESTADOS,
  NotificacionApi,
  categoriaDe,
  etiquetaTipo,
  explicarError,
} from "@/lib/notificaciones";

const ZONA = "Europe/Madrid";

function fechaCompleta(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-ES", {
    timeZone: ZONA,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 border-b py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

/** Ficha completa de una notificación. Los registros anteriores al Centro de
    notificaciones solo conservan tipo, destinatario, estado y fecha — el
    resto de campos salen como "—". */
export function DetalleNotificacionDialog({ notificacion, onOpenChange }: { notificacion: NotificacionApi | null; onOpenChange: (open: boolean) => void }) {
  const n = notificacion;
  const categoria = n ? CATEGORIAS[categoriaDe(n.tipo)] : null;
  const estado = n ? ESTADOS[n.estado] : null;
  return (
    <Dialog open={n !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl sm:max-w-xl">
        {n && categoria && estado && (
          <>
            <DialogHeader>
              <DialogTitle>{etiquetaTipo(n.tipo)}</DialogTitle>
              <DialogDescription>
                <span className={`mr-1.5 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${estado.clase}`}>{estado.etiqueta}</span>
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${categoria.clase}`}>{categoria.etiqueta}</span>
              </DialogDescription>
            </DialogHeader>
            <dl>
              <Campo etiqueta="Fecha y hora">{fechaCompleta(n.fecha)}</Campo>
              <Campo etiqueta="Enviado a">{n.destinatario || "—"}</Campo>
              {n.bcc && <Campo etiqueta="Copia oculta (BCC)">{n.bcc}</Campo>}
              <Campo etiqueta="Canal">{CANALES[n.canal] || n.canal}</Campo>
              <Campo etiqueta="Resguardo / Ref.">{n.referencia || "—"}</Campo>
              <Campo etiqueta="Cliente">{n.cliente || "—"}</Campo>
              {n.documento && <Campo etiqueta="Nº de documento">{n.documento}</Campo>}
              <Campo etiqueta="Asunto">{n.asunto || "—"}</Campo>
              {n.adjuntos && <Campo etiqueta="Adjuntos">{n.adjuntos}</Campo>}
              <Campo etiqueta="Tipo (código)">
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{n.tipo}</code>
              </Campo>
              {n.error && (
                <Campo etiqueta="Motivo del fallo">
                  <span className="text-red-600">{explicarError(n.error)}</span>
                </Campo>
              )}
            </dl>
            {n.fuente === "historico" && (
              <p className="text-xs text-muted-foreground">Registro anterior al Centro de notificaciones: solo conserva tipo, destinatario, estado y fecha.</p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
