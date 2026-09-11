"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Check, X, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PillBadge } from "@/components/pill-badge";
import { useConfirm } from "@/components/confirm-provider";
import type { LinkedInContact } from "@/lib/campanas";
import { CONTACT_ROLE_LABEL } from "@/lib/campanas";

const ESTADO_LABEL: Record<string, string> = {
  draft: "Borrador",
  approved: "Aprobado",
  rejected: "Rechazado",
  sent_manually: "Enviado",
};
const ESTADO_COLOR: Record<string, { bg: string; color: string }> = {
  draft: { bg: "#e5e7eb", color: "#374151" },
  approved: { bg: "#dcfce7", color: "#166534" },
  rejected: { bg: "#fee2e2", color: "#991b1b" },
  sent_manually: { bg: "#e0f2fe", color: "#0369a1" },
};

/** Modal de detalle de un contacto — mismo patrón createPortan(document.body)
    que LeadDetailModal en canvas-agente.tsx (no el <Dialog> de shadcn, ver
    commit 01690fc: se diagnosticó en vivo que no pintaba pese a open={true}). */
function ContactoDetailModal({
  contacto,
  onClose,
  onAprobar,
  onRechazar,
  onMarcarEnviado,
}: {
  contacto: LinkedInContact;
  onClose: () => void;
  onAprobar: () => void;
  onRechazar: () => void;
  onMarcarEnviado: () => void;
}) {
  useEffect(() => {
    function alEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", alEscape);
    return () => document.removeEventListener("keydown", alEscape);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-xl ring-1 ring-foreground/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b p-4">
          <div className="min-w-0">
            <p className="font-heading truncate text-base font-medium">{contacto.contactName}</p>
            <p className="text-xs text-muted-foreground">
              {[contacto.roleTitle, contacto.companyName].filter(Boolean).join(" · ") || "Sin datos"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Cerrar"
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span><span className="text-muted-foreground">Score:</span> <b>{contacto.score ?? "—"}</b></span>
            <span><span className="text-muted-foreground">Cargo:</span> <b>{CONTACT_ROLE_LABEL[contacto.roleCategory] ?? contacto.roleCategory}</b></span>
            {contacto.seniority && (
              <span><span className="text-muted-foreground">Seniority:</span> <b>{contacto.seniority}</b></span>
            )}
            {contacto.analysisConfidence !== null && (
              <span><span className="text-muted-foreground">Confianza:</span> <b>{Math.round(contacto.analysisConfidence * 100)}%</b></span>
            )}
            {contacto.messageStatus && ESTADO_COLOR[contacto.messageStatus] && (
              <PillBadge bg={ESTADO_COLOR[contacto.messageStatus].bg} color={ESTADO_COLOR[contacto.messageStatus].color} className="text-[10px]">
                {ESTADO_LABEL[contacto.messageStatus]}
              </PillBadge>
            )}
          </div>

          {contacto.reason && (
            <div>
              <p className="font-medium text-muted-foreground">Por qué es relevante</p>
              <p>{contacto.reason}</p>
            </div>
          )}

          {contacto.responsibilities.length > 0 && (
            <div>
              <p className="font-medium text-muted-foreground">Responsabilidades probables</p>
              <ul className="list-disc pl-4">
                {contacto.responsibilities.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}

          {contacto.possiblePainPoints.length > 0 && (
            <div>
              <p className="font-medium text-muted-foreground">Posibles puntos de dolor</p>
              <ul className="list-disc pl-4">
                {contacto.possiblePainPoints.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}

          {contacto.facts.length > 0 && (
            <div>
              <p className="font-medium text-muted-foreground">Hechos verificados</p>
              <ul className="list-disc pl-4">
                {contacto.facts.map((f, i) => (
                  <li key={i}>
                    {f.statement}
                    {f.evidenceUrls?.length ? <span className="text-muted-foreground"> — {f.evidenceUrls.join(", ")}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {contacto.inferences.length > 0 && (
            <div>
              <p className="font-medium text-muted-foreground">Inferencias</p>
              <ul className="list-disc pl-4">
                {contacto.inferences.map((f, i) => (
                  <li key={i}>{f.statement}{f.confidence != null ? ` (conf. ${Math.round(f.confidence * 100)}%)` : ""}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-md border bg-muted/40 p-3">
            <p className="font-medium text-muted-foreground">Mensaje de LinkedIn en borrador</p>
            <p className="mt-1 whitespace-pre-wrap">{contacto.message || "Sin mensaje redactado."}</p>
          </div>

          {contacto.markedSentAt && (
            <p className="text-muted-foreground">Marcado como enviado por {contacto.markedSentBy ?? "—"}.</p>
          )}
        </div>

        {contacto.messageStatus === "draft" && (
          <div className="flex flex-col-reverse gap-2 border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onRechazar}>
              <X className="size-4" /> Rechazar
            </Button>
            <Button onClick={onAprobar}>
              <Check className="size-4" /> Aprobar
            </Button>
          </div>
        )}
        {contacto.messageStatus === "approved" && (
          <div className="flex flex-col-reverse gap-2 border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
            <Button onClick={onMarcarEnviado}>
              <Send className="size-4" /> Marcar como enviado
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Tabla de contactos de LinkedIn de una campaña (Sprint 8) — opt-in
    (sourceConfig.enableLinkedin). Empresa / Contacto / Cargo / Score /
    Razón / Mensaje, con el mismo flujo de aprobación humana que "Leads",
    salvo que el envío es SIEMPRE una confirmación manual (nunca se
    dispara nada hacia LinkedIn desde el backend). */
export function LinkedInContactsTable({ campanaId }: { campanaId: number }) {
  const confirmar = useConfirm();
  const [contactos, setContactos] = useState<LinkedInContact[]>([]);
  const [abiertoId, setAbiertoId] = useState<number | null>(null);

  async function cargar() {
    try {
      const res = await fetch(`/api/agentes/campanas/${campanaId}/linkedin-contacts`);
      const data = await res.json();
      if (data.ok) setContactos(data.contacts as LinkedInContact[]);
    } catch {
      // silencioso — se queda con lo último que cargó bien
    }
  }

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campanaId]);

  async function revisar(c: LinkedInContact, status: "approved" | "rejected") {
    if (status === "rejected") {
      const ok = await confirmar(`¿Rechazar el mensaje para "${c.contactName}"? No se enviará nada.`, { titulo: "Rechazar mensaje" });
      if (!ok) return;
    }
    try {
      const res = await fetch(`/api/agentes/campanas/${campanaId}/linkedin-messages/${c.messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(status === "approved" ? "Mensaje aprobado" : "Mensaje rechazado");
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al actualizar");
    }
  }

  async function marcarEnviado(c: LinkedInContact) {
    const ok = await confirmar(
      `¿Confirmas que enviaste este mensaje a "${c.contactName}" manualmente desde LinkedIn?`,
      { titulo: "Marcar como enviado" },
    );
    if (!ok) return;
    try {
      const res = await fetch(`/api/agentes/campanas/${campanaId}/linkedin-messages/${c.messageId}/mark-sent`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Marcado como enviado");
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al marcar como enviado");
    }
  }

  async function revisarYCerrar(c: LinkedInContact, status: "approved" | "rejected") {
    await revisar(c, status);
    setAbiertoId(null);
  }

  async function marcarEnviadoYCerrar(c: LinkedInContact) {
    await marcarEnviado(c);
    setAbiertoId(null);
  }

  if (contactos.length === 0) return null;

  const abierto = contactos.find((c) => c.contactId === abiertoId) || null;

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b p-3">
        <Users className="size-4 text-sky-600" />
        <p className="text-sm font-medium">Contactos de LinkedIn ({contactos.length})</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-2 font-medium">Empresa</th>
              <th className="p-2 font-medium">Contacto</th>
              <th className="p-2 font-medium">Cargo</th>
              <th className="p-2 font-medium">Score</th>
              <th className="p-2 font-medium">Razón</th>
              <th className="p-2 font-medium">Mensaje</th>
            </tr>
          </thead>
          <tbody>
            {contactos.map((c) => (
              <tr
                key={c.contactId}
                className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                onClick={() => setAbiertoId(c.contactId)}
              >
                <td className="max-w-40 truncate p-2">{c.companyName}</td>
                <td className="max-w-40 truncate p-2">{c.contactName}</td>
                <td className="p-2 text-muted-foreground">{CONTACT_ROLE_LABEL[c.roleCategory] ?? c.roleCategory}</td>
                <td className="p-2"><b>{c.score ?? "—"}</b></td>
                <td className="max-w-64 truncate p-2 text-muted-foreground">{c.reason ?? "—"}</td>
                <td className="p-2">
                  {c.messageStatus && ESTADO_COLOR[c.messageStatus] ? (
                    <PillBadge bg={ESTADO_COLOR[c.messageStatus].bg} color={ESTADO_COLOR[c.messageStatus].color} className="text-[10px]">
                      {ESTADO_LABEL[c.messageStatus]}
                    </PillBadge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {abierto && (
        <ContactoDetailModal
          contacto={abierto}
          onClose={() => setAbiertoId(null)}
          onAprobar={() => revisarYCerrar(abierto, "approved")}
          onRechazar={() => revisarYCerrar(abierto, "rejected")}
          onMarcarEnviado={() => marcarEnviadoYCerrar(abierto)}
        />
      )}
    </div>
  );
}
