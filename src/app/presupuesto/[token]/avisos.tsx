// Recuadros de aviso con el mismo aspecto que los del dashboard (borde fino, fondo suave y radio de 8 px).
import type { ReactNode } from "react";
import { InfoCircle, TickCircle, Warning2 } from "@/lib/icons";
import { cn } from "@/lib/utils";

function Aviso({ icono, clases, children, ...resto }: { icono: ReactNode; clases: string; children: ReactNode; role?: string }) {
  return (
    <div className={cn("flex items-start gap-2 rounded-lg border p-3 text-sm", clases)} {...resto}>
      <span className="mt-0.5 shrink-0">{icono}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export const Info = ({ children }: { children: ReactNode }) => (
  <Aviso icono={<InfoCircle className="size-4 text-amber-600" />} clases="border-amber-500/30 bg-amber-500/10">{children}</Aviso>
);
export const Ok = ({ children }: { children: ReactNode }) => (
  <Aviso icono={<TickCircle className="size-4 text-emerald-600" />} clases="border-emerald-500/30 bg-emerald-500/10">{children}</Aviso>
);
export const Alert2 = ({ children }: { children: ReactNode }) => (
  <Aviso role="alert" icono={<Warning2 className="size-4 text-destructive" />} clases="border-destructive/30 bg-destructive/5 text-destructive">{children}</Aviso>
);
