"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { RgpdModal } from "./rgpd-modal";
import { GuiaModal } from "./guia-modal";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, ClipboardText, ClipboardTick, Logout, MessageQuestion, Profile2User } from "@/lib/icons";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/asistencia/kiosk", label: "Fichar", icon: Clock },
  { href: "/asistencia/kiosk/mes", label: "Mi mes", icon: Calendar },
  { href: "/asistencia/kiosk/solicitudes", label: "Solicitudes", icon: ClipboardText },
  // Solo tiene sentido para quien tiene un equipo remoto vinculado, pero se
  // deja siempre visible (igual que las demás pestañas) — la propia página
  // explica qué hacer si todavía no tienes ninguno vinculado.
  { href: "/asistencia/kiosk/reunion", label: "Reunión", icon: Profile2User },
  // Tareas propias (asignadas + autoasignadas) e informe de texto libre del
  // día — petición del usuario, 2026-10-03. Vive dentro del kiosco a
  // propósito, sin abrir /tareas (la vista completa, compartida, de admin).
  { href: "/asistencia/kiosk/tareas", label: "Mis tareas", icon: ClipboardTick },
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
  const [cerrando, setCerrando] = useState(false);
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
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground" title="Salir" disabled={cerrando} onClick={() => { setCerrando(true); signOut({ redirectTo: "/login" }); }}>
              <Logout className="size-4" />
            </Button>
          </div>
        </div>
      </header>
      {/* pb-20: deja hueco para la barra fija de abajo, que si no tapa el
          final del contenido. Barra abajo (en vez de pestañas arriba, como
          antes) porque con 5 secciones las etiquetas ya no cabían en una
          fila en móvil y se partían a dos líneas de forma desigual (bug
          real visto en pantalla, 2026-10-03) — este patrón (icono encima,
          etiqueta debajo, columnas iguales) es el habitual en apps móviles
          y no tiene ese problema por diseño: cada pestaña tiene el mismo
          ancho y el texto nunca necesita partirse. */}
      <main className="flex-1 px-4 py-6 pb-20">
        <div className="mx-auto max-w-lg space-y-4">
          <RgpdModal open={necesitaRgpd} onAceptar={aceptarRgpd} />
          <GuiaModal open={guiaAbierta} onClose={() => setGuiaAbierta(false)} />
          {children}
        </div>
      </main>
      <nav className="fixed inset-x-0 bottom-0 border-t bg-card pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const activo = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium whitespace-nowrap",
                  activo ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="size-5" />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
