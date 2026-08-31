"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { RgpdModal } from "./rgpd-modal";
import { GuiaModal } from "./guia-modal";
import { cerrarSesion } from "../../(app)/acciones";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, ClipboardText, Logout, MessageQuestion } from "@/lib/icons";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/asistencia/kiosk", label: "Fichar", icon: Clock },
  { href: "/asistencia/kiosk/mes", label: "Mi mes", icon: Calendar },
  { href: "/asistencia/kiosk/solicitudes", label: "Solicitudes", icon: ClipboardText },
];

/** Vista de cara al empleado que ficha — deliberadamente SIN el sidebar/
    dashboard del panel admin alrededor: login con Google → directo a
    fichar, con solo estas 3 pestañas y salir. Antes reutilizaba el mismo
    Sidebar que el admin (heredado del layout raíz de /asistencia), pero
    eso no tiene sentido para quien solo viene a fichar — petición del
    usuario, 2026-08-31. */
export default function KioskLayout({ children }: { children: React.ReactNode }) {
  const [necesitaRgpd, setNecesitaRgpd] = useState(false);
  const [guiaAbierta, setGuiaAbierta] = useState(false);
  const [cerrando, startTransition] = useTransition();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/asistencia/kiosk/rgpd")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setNecesitaRgpd(!d.informado); })
      .catch(() => {});
  }, []);

  async function aceptarRgpd() {
    await fetch("/api/asistencia/kiosk/rgpd", { method: "POST" });
    setNecesitaRgpd(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Image src="/logos/kelatos.png" alt="Kelatos" width={145} height={41} priority unoptimized className="h-7 w-auto" />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground" title="Guía de uso" onClick={() => setGuiaAbierta(true)}>
              <MessageQuestion className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" disabled={cerrando} onClick={() => startTransition(() => cerrarSesion())}>
              <Logout className="size-4" /> {cerrando ? "Saliendo…" : "Salir"}
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-lg gap-1 px-4 pb-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const activo = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
                  activo ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="size-3.5" /> {t.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-lg space-y-4">
          <RgpdModal open={necesitaRgpd} onAceptar={aceptarRgpd} />
          <GuiaModal open={guiaAbierta} onClose={() => setGuiaAbierta(false)} />
          {children}
        </div>
      </main>
    </div>
  );
}
