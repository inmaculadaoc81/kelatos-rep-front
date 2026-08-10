"use client"

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"
import { cn } from "@/lib/utils"

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({ ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
  )
}

function CollapsibleContent({ className, ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      className={cn(
        // base-ui mide el contenido y lo expone en --collapsible-panel-height;
        // sin esta transición el panel aparece/desaparece de golpe. Empieza y
        // termina a 0 vía data-starting-style/data-ending-style (presentes
        // mientras dura la animación de entrada/salida) y las clases bare
        // data-*: son de Tailwind v4, no requieren configurar el atributo.
        "h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-300 ease-out data-ending-style:h-0 data-ending-style:opacity-0 data-starting-style:h-0 data-starting-style:opacity-0",
        className
      )}
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
