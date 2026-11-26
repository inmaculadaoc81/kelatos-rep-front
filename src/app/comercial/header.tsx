"use client";

import { BotonMenuMovil } from "@/components/boton-menu-movil";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Call } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useSoftphone } from "../(app)/softphone";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

/** Pasa lo que escriba la persona (600 123 456, 0034…, +51…) a formato internacional; sin prefijo se entiende España. */
function aInternacional(texto: string): string | null {
  const t = texto.trim();
  let d = t.replace(/\D/g, "");
  if (t.startsWith("+")) { /* ya trae prefijo */ }
  else if (d.startsWith("00")) d = d.slice(2);
  else if (/^[6789]\d{8}$/.test(d)) d = "34" + d;
  else return null;
  return d.length >= 9 && d.length <= 15 ? "+" + d : null;
}

/** Marcar cualquier número escribiéndolo (no hace falta que sea un contacto de las listas). */
function MarcarNumero() {
  const softphone = useSoftphone();
  const [abierto, setAbierto] = useState(false);
  const [valor, setValor] = useState("");
  const e164 = aInternacional(valor);
  function llamar() {
    if (!e164) return toast.error("Escribe un número válido (con o sin prefijo de país)");
    setAbierto(false);
    void softphone.llamar({ telefono: e164, nombre: e164 });
    setValor("");
  }
  return (
    <>
      <Button size="sm" variant="secondary" className="ml-auto gap-1.5" disabled={!softphone.disponible || softphone.ocupado} onClick={() => setAbierto(true)}>
        <Call className="size-4" /> Marcar un número
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Llamar a un número</DialogTitle>
          <DialogDescription>Escribe el teléfono. Sin prefijo se entiende España (+34).</DialogDescription>
          <Input autoFocus inputMode="tel" placeholder="600 123 456 o +51 987 654 321" value={valor} onChange={(e) => setValor(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") llamar(); }} />
          {valor.trim() !== "" && <p className="text-xs text-muted-foreground">{e164 ? `Se llamará a ${e164}` : "Número no válido todavía"}</p>}
          <Button className="gap-1.5" disabled={!e164} onClick={llamar}><Call className="size-4" /> Llamar</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ComercialHeader({ admin }: { admin: boolean }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 sm:gap-4 bg-primary px-3 sm:px-4 shadow-sm">
      <BotonMenuMovil />
      <Breadcrumb>
        <BreadcrumbList className="text-primary-foreground/70">
          <BreadcrumbItem>
            <BreadcrumbLink className="text-primary-foreground/70 hover:text-primary-foreground" render={<Link href={admin ? "/" : "/comercial"} />}>
              Kelatos
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-primary-foreground">{admin ? "Comercial" : "Mi panel comercial"}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <MarcarNumero />
    </header>
  );
}
