"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { RgpdModal } from "./rgpd-modal";

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const enSolicitudes = pathname?.includes("/solicitudes");
  const enMes = pathname?.includes("/mes");
  const [necesitaRgpd, setNecesitaRgpd] = useState(false);

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
    <div className="mx-auto max-w-lg space-y-4">
      <RgpdModal open={necesitaRgpd} onAceptar={aceptarRgpd} />
      <div className="flex gap-2">
        <Link
          href="/asistencia/kiosk"
          className={cn("flex-1 rounded-md border px-3 py-2 text-center text-sm font-medium", !enSolicitudes && !enMes ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}
        >
          Fichar
        </Link>
        <Link
          href="/asistencia/kiosk/mes"
          className={cn("flex-1 rounded-md border px-3 py-2 text-center text-sm font-medium", enMes ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}
        >
          Mi mes
        </Link>
        <Link
          href="/asistencia/kiosk/solicitudes"
          className={cn("flex-1 rounded-md border px-3 py-2 text-center text-sm font-medium", enSolicitudes ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}
        >
          Solicitudes
        </Link>
      </div>
      {children}
    </div>
  );
}
