"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * Puerto de RgpdModal (app/kiosk/components/Modals.tsx, asistencia-app) —
 * mismo texto legal real (art. 34.9 del Estatuto de los Trabajadores),
 * restilizado con los componentes de Kelatos.
 */
export function RgpdModal({ open, onAceptar }: { open: boolean; onAceptar: () => void }) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg gap-0 p-0" showCloseButton={false}>
        <div className="border-b px-4 py-3">
          <DialogTitle className="text-base">Información sobre tus datos</DialogTitle>
          <p className="text-xs text-muted-foreground">Antes de continuar, lee el aviso sobre el tratamiento de tus datos.</p>
        </div>
        <ScrollArea className="max-h-[60vh] px-4 py-3">
          <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
            <section>
              <h3 className="text-xs font-semibold text-foreground">Responsable del tratamiento</h3>
              <p>AFFIRMA TECHNOLOGY GROUP SL, con domicilio en CALLE BLASCO GARAY, NUM 63 ESC. BJ, PUERTA 2, 28015 MADRID - ESPAÑA, es responsable del tratamiento de tus datos personales en cumplimiento del artículo 34.9 del Estatuto de los Trabajadores.</p>
            </section>
            <section>
              <h3 className="text-xs font-semibold text-foreground">Finalidad</h3>
              <p>Registrar tu jornada laboral (hora de inicio y finalización), en cumplimiento de la normativa laboral vigente y para el control de la jornada de trabajo. Los datos no se utilizarán para finalidades distintas.</p>
            </section>
            <section>
              <h3 className="text-xs font-semibold text-foreground">Base legal</h3>
              <p>El tratamiento se basa en el cumplimiento de una obligación legal (art. 6.1.c del Reglamento General de Protección de Datos), derivada del artículo 34.9 del Estatuto de los Trabajadores. No se requiere tu consentimiento.</p>
            </section>
            <section>
              <h3 className="text-xs font-semibold text-foreground">Destinatarios</h3>
              <p>Los datos podrán ser comunicados a la Inspección de Trabajo y Seguridad Social, representantes legales de los trabajadores y, en su caso, a proveedores de servicios laborales (por ejemplo, asesoría), cuando sea necesario para el cumplimiento de obligaciones legales.</p>
            </section>
            <section>
              <h3 className="text-xs font-semibold text-foreground">Conservación</h3>
              <p>Los registros se conservarán durante un período mínimo de 4 años.</p>
            </section>
            <section>
              <h3 className="text-xs font-semibold text-foreground">Derechos</h3>
              <p>
                Puedes ejercer tus derechos de acceso, rectificación, supresión (cuando proceda), limitación del tratamiento, oposición y portabilidad dirigiéndote a{" "}
                <a href="mailto:RecursosHumanos@kelatos.com" className="text-primary underline">RecursosHumanos@kelatos.com</a>.
                Asimismo, tienes derecho a presentar una reclamación ante la Agencia Española de Protección de Datos.
              </p>
            </section>
            <section>
              <h3 className="text-xs font-semibold text-foreground">Información adicional</h3>
              <p>El registro de jornada es obligatorio en cumplimiento de la normativa laboral vigente. Cualquier solicitud de modificación de fichajes deberá realizarse a través del sistema, debidamente justificada, y quedará sujeta a validación por la empresa.</p>
            </section>
          </div>
        </ScrollArea>
        <div className="flex justify-end border-t px-4 py-3">
          <Button onClick={onAceptar}>He leído y entendido la información</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
