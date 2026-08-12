"use client";

import { useState } from "react";
import { Send2, Message, Refresh2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Presupuesto } from "@/lib/reparacion-detalle";

/**
 * Reproduce el bloque #accionesPresupuestos del original (Index.html) —
 * vive DEBAJO de la lista de tarjetas, no dentro de cada una: "Enviar al
 * Cliente" manda TODOS los borradores juntos (nunca uno por uno), con un
 * toggle alternativas/acumulables que solo aparece con 2+ borradores.
 * "Enviar por WhatsApp" solo si el cliente tiene teléfono. "Reenviar
 * email" solo si ya hay algo enviado.
 *
 * Canal whatsapp: el envío real pasa por el mismo webhook de n8n que usaba
 * Apps Script (enviarPresupuestosWhatsAppSql) — mismo payload y mismo
 * orden preparar→iniciar→enviar→confirmar/fallar.
 */
export function PresupuestosEnvioBar({
  resguardo,
  presupuestos,
  clienteTelefono,
  onActualizado,
}: {
  resguardo: string;
  presupuestos: Presupuesto[];
  clienteTelefono: string;
  onActualizado: () => void;
}) {
  const [modo, setModo] = useState<"alternativas" | "acumulables">("alternativas");
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [enviandoWhatsapp, setEnviandoWhatsapp] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [requestIdEmail, setRequestIdEmail] = useState<string | null>(null);
  const [requestIdWhatsapp, setRequestIdWhatsapp] = useState<string | null>(null);

  const borradores = presupuestos.filter((p) => p.estado === "borrador");
  const enviados = presupuestos.filter((p) => p.estado === "enviado");
  const hayBorradores = borradores.length > 0;
  const hayEnviados = enviados.length > 0;
  const hayTelefono = !!clienteTelefono.trim();

  if (!hayBorradores && !hayEnviados) return null;

  async function enviar(canal: "email" | "whatsapp") {
    const setEnviando = canal === "email" ? setEnviandoEmail : setEnviandoWhatsapp;
    const requestId = (canal === "email" ? requestIdEmail : requestIdWhatsapp) || crypto.randomUUID();
    (canal === "email" ? setRequestIdEmail : setRequestIdWhatsapp)(requestId);

    setEnviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${resguardo}/presupuestos/enviar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, canal, modo }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(
        canal === "email"
          ? "Presupuesto(s) enviado(s) al cliente por email"
          : "Presupuesto(s) enviado(s) al cliente por WhatsApp"
      );
      (canal === "email" ? setRequestIdEmail : setRequestIdWhatsapp)(null);
      onActualizado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  async function reenviar() {
    setReenviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${resguardo}/presupuestos/reenviar`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(data.mensaje || "Email reenviado al cliente");
      onActualizado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setReenviando(false);
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border bg-muted/20 p-3">
      {borradores.length >= 2 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">¿Las opciones son alternativas o acumulables?</p>
          <RadioGroup value={modo} onValueChange={(v) => setModo(v as "alternativas" | "acumulables")} className="flex flex-col gap-1.5 sm:flex-row sm:gap-4">
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="alternativas" /> Alternativas <span className="text-xs text-muted-foreground">(el cliente elige una)</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="acumulables" /> Acumulables <span className="text-xs text-muted-foreground">(puede aceptar varias)</span>
            </label>
          </RadioGroup>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {hayBorradores && (
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-8 gap-1.5" disabled={enviandoEmail} onClick={() => enviar("email")}>
              <Send2 className="size-3.5" /> {enviandoEmail ? "Enviando..." : "Enviar al Cliente"}
            </Button>
            <span className="text-xs text-muted-foreground">Envía todos los borradores al cliente</span>
          </div>
        )}

        {hayBorradores && hayTelefono && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-emerald-600 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
              disabled={enviandoWhatsapp}
              onClick={() => enviar("whatsapp")}
            >
              <Message className="size-3.5" /> {enviandoWhatsapp ? "Enviando..." : "Enviar por WhatsApp"}
            </Button>
            <span className="text-xs text-muted-foreground">Envía todos los borradores al cliente por WhatsApp</span>
          </div>
        )}

        {hayEnviados && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={reenviando} onClick={reenviar}>
              <Refresh2 className="size-3.5" /> {reenviando ? "Reenviando..." : "Reenviar email"}
            </Button>
            <span className="text-xs text-muted-foreground">Reenvía el email al correo actual del cliente</span>
          </div>
        )}
      </div>
    </div>
  );
}
