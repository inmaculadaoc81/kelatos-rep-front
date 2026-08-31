"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ESTILO_SECCION = {
  verde: "border-emerald-200 bg-emerald-50",
  azul: "border-sky-200 bg-sky-50",
  violeta: "border-violet-200 bg-violet-50",
  ambar: "border-amber-200 bg-amber-50",
  gris: "border-border bg-muted/40",
} as const;

function Seccion({ color, children }: { color: keyof typeof ESTILO_SECCION; children: React.ReactNode }) {
  return <section className={cn("space-y-1.5 rounded-lg border p-3.5", ESTILO_SECCION[color])}>{children}</section>;
}

/** Guía de uso del kiosco para el empleado — contenido pedido por el
    usuario, adaptado a lo que la app realmente tiene (pestaña real "Mi
    mes" en vez de "Registros", los 4 botones reales de Solicitudes en
    vez de "+ Nueva solicitud de...", y sin mencionar adjuntar documento
    porque esa función no existe todavía en el formulario). Login es con
    Google, no usuario/contraseña, así que la FAQ de "restablecer
    contraseña" se adaptó a ese flujo real. 2026-08-31. */
export function GuiaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Guía de uso</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <Seccion color="verde">
            <h3 className="font-semibold text-emerald-950">📅 ¿Cómo fichar?</h3>
            <ol className="list-decimal space-y-1 pl-5 text-emerald-900/80">
              <li><strong className="text-emerald-950">Entrada:</strong> pulsa &ldquo;Entrada&rdquo; al llegar al trabajo.</li>
              <li><strong className="text-emerald-950">Salida comida:</strong> pulsa &ldquo;Salida comida&rdquo; al salir a comer.</li>
              <li><strong className="text-emerald-950">Vuelta comida:</strong> pulsa &ldquo;Vuelta comida&rdquo; al regresar.</li>
              <li><strong className="text-emerald-950">Salida:</strong> pulsa &ldquo;Salida&rdquo; al terminar la jornada. Se te pedirá que firmes en el recuadro para confirmar.</li>
            </ol>
          </Seccion>

          <Seccion color="azul">
            <h3 className="font-semibold text-sky-950">📋 ¿Cómo ver tus registros?</h3>
            <p className="text-sky-900/80">
              Ve a la pestaña <strong className="text-sky-950">Mi mes</strong>. Puedes navegar entre meses con las flechas.
              Verás cada fichaje con la hora de entrada, salida, horas trabajadas y la diferencia respecto a lo previsto según tu horario.
              Pulsa <strong className="text-sky-950">&ldquo;Exportar PDF del mes&rdquo;</strong> para descargar tu registro oficial del mes.
            </p>
          </Seccion>

          <Seccion color="violeta">
            <h3 className="font-semibold text-violet-950">✈️ ¿Cómo solicitar vacaciones?</h3>
            <p className="text-violet-900/80">
              Ve a la pestaña <strong className="text-violet-950">Solicitudes</strong> → <strong className="text-violet-950">Vacaciones</strong>.
              Rellena las fechas y el motivo, y pulsa &ldquo;Solicitar vacaciones&rdquo;.
              Tu responsable revisará la solicitud y verás la respuesta ahí mismo.
            </p>
          </Seccion>

          <Seccion color="ambar">
            <h3 className="font-semibold text-amber-950">✏️ ¿Cómo solicitar una corrección?</h3>
            <p className="text-amber-900/80">
              Si cometiste un error en un fichaje, ve a <strong className="text-amber-950">Solicitudes</strong> → <strong className="text-amber-950">Corrección</strong>.
              Selecciona el fichaje a corregir, indica la hora correcta y el motivo, y pulsa &ldquo;Solicitar corrección&rdquo;.
            </p>
            <p className="font-medium text-amber-950">Importante: no se pueden corregir fichajes ya firmados.</p>
          </Seccion>

          <Seccion color="gris">
            <h3 className="font-semibold">❓ Preguntas frecuentes</h3>
            <div className="space-y-2">
              <div>
                <p className="font-medium">¿Qué pasa si olvido fichar la entrada o la salida?</p>
                <p className="text-muted-foreground">Solicita una marcación olvidada desde <strong className="text-foreground">Solicitudes</strong> → <strong className="text-foreground">Olvidé fichar</strong>.</p>
              </div>
              <div>
                <p className="font-medium">¿Puedo fichar desde el móvil?</p>
                <p className="text-muted-foreground">Sí, el sistema es compatible con móviles y tablets.</p>
              </div>
              <div>
                <p className="font-medium">¿Durante cuánto tiempo se guardan mis registros?</p>
                <p className="text-muted-foreground">Mínimo 4 años, según la normativa laboral vigente (RDL 8/2019).</p>
              </div>
              <div>
                <p className="font-medium">¿Quién puede ver mis fichajes?</p>
                <p className="text-muted-foreground">Solo tú y el responsable de RRHH tienen acceso a tus registros.</p>
              </div>
              <div>
                <p className="font-medium">No puedo entrar al sistema, ¿qué hago?</p>
                <p className="text-muted-foreground">
                  El acceso es con tu cuenta de Google, no hay usuario ni contraseña propios.
                  Si no puedes iniciar sesión, contacta con recursoshumanos@kelatos.com para que revisen tu acceso.
                </p>
              </div>
            </div>
          </Seccion>
        </div>
      </DialogContent>
    </Dialog>
  );
}
