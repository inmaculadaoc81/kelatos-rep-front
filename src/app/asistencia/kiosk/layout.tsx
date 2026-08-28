"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const enSolicitudes = pathname?.includes("/solicitudes");

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex gap-2">
        <Link
          href="/asistencia/kiosk"
          className={cn("flex-1 rounded-md border px-3 py-2 text-center text-sm font-medium", !enSolicitudes ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}
        >
          Fichar
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
