"use client";

import { InfoCircle } from "@/lib/icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Una palabra técnica (CTR, impresiones, posición…) con su explicación en lenguaje de todos los días al pasar el cursor o pulsarla.
 * El subrayado punteado y el icono avisan de que hay una explicación.
 */
export function Termino({ etiqueta, ayuda, className }: { etiqueta: string; ayuda: string; className?: string }) {
  return (
    <TooltipProvider delay={150}>
      <Tooltip>
        <TooltipTrigger
          render={<span tabIndex={0} />}
          className={cn("inline-flex cursor-help items-center gap-1 underline decoration-dotted decoration-muted-foreground/60 underline-offset-4", className)}
        >
          {etiqueta}
          <InfoCircle className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs whitespace-normal py-2 text-left leading-snug">{ayuda}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
