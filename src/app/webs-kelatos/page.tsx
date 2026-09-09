"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Global } from "@/lib/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { SitioWeb } from "@/lib/webs-kelatos";

/** Landing de /webs-kelatos: redirige a la primera web si ya hay alguna,
    o muestra un estado vacío invitando a crear la primera (botón "+" del
    sidebar) — mismo patrón de onboarding que el resto del dashboard. */
export default function WebsKelatosIndexPage() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [sinWebs, setSinWebs] = useState(false);

  useEffect(() => {
    fetch("/api/sitios-web")
      .then((r) => r.json())
      .then((data) => {
        const sitios = (data.ok ? data.sitios : []) as SitioWeb[];
        if (sitios.length > 0) {
          router.replace(`/webs-kelatos/${sitios[0].id}`);
        } else {
          setSinWebs(true);
          setCargando(false);
        }
      })
      .catch(() => setCargando(false));
  }, [router]);

  if (cargando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (sinWebs) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
        <Global className="size-8 text-muted-foreground" />
        <p className="font-semibold">Todavía no hay ninguna web</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Usa el botón «+» junto a «Webs» en el menú lateral para dar de alta la primera.
        </p>
      </div>
    );
  }

  return null;
}
