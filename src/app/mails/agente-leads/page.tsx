"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PillBadge } from "@/components/pill-badge";
import { Campaign, CAMPAIGN_STATUS_LABEL, CAMPAIGN_STATUS_COLOR } from "@/lib/campanas";

export default function AgenteLeadsPage() {
  const [campanas, setCampanas] = useState<Campaign[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    fetch("/api/agentes/campanas")
      .then((r) => r.json())
      .then((data) => {
        if (activo && data.ok) setCampanas(data.campaigns as Campaign[]);
      })
      .catch(() => {})
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Agente de leads</h1>
        <p className="text-sm text-muted-foreground">
          Borradores de email personalizados para revisar. Aprobar no envía nada todavía.
        </p>
      </div>

      {cargando ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : campanas.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          No hay campañas. Créalas desde Agentes.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {campanas.map((c) => {
            const col = CAMPAIGN_STATUS_COLOR[c.status];
            return (
              <Link key={c.id} href={`/mails/agente-leads/${c.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{c.name}</span>
                      <PillBadge bg={col.bg} color={col.color} className="shrink-0 text-[10px]">
                        {CAMPAIGN_STATUS_LABEL[c.status]}
                      </PillBadge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-xs text-muted-foreground">
                    <p className="line-clamp-2">{c.goalText}</p>
                    <p className="tabular-nums">
                      ${c.costUsd.toFixed(4)} / ${c.maxCostUsd.toFixed(2)}
                      {c.targetLeads ? ` · objetivo ${c.targetLeads} leads` : ""}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
