"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DocumentText } from "@/lib/icons";
import { urlArchivoDrive } from "@/lib/compras";

/** Abre en Drive el justificante guardado del pedido (la captura, factura o foto con la que se registró). Con varios archivos
    muestra una lista para elegir. */
export function BotonJustificante({ justificantes }: { justificantes: { id: string; nombre: string }[] }) {
  if (justificantes.length === 0) return null;
  const titulo = "Abrir el justificante guardado en Drive";
  if (justificantes.length === 1) {
    return (
      <Button size="sm" variant="outline" className="h-7 gap-1" nativeButton={false} render={<a href={urlArchivoDrive(justificantes[0].id)} target="_blank" rel="noopener noreferrer" />} title={titulo}>
        <DocumentText className="size-3.5" /> Justificante
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="sm" variant="outline" className="h-7 gap-1" title={titulo}>
            <DocumentText className="size-3.5" /> Justificantes ({justificantes.length})
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {justificantes.map((j) => (
          <DropdownMenuItem key={j.id} onClick={() => window.open(urlArchivoDrive(j.id), "_blank", "noopener,noreferrer")}>
            <DocumentText className="size-3.5" />
            {j.nombre}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
