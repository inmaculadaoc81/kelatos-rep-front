"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cpu } from "@/lib/icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentType } from "@/lib/agentes";

/** Landing de /agentes: una card por tipo de agente disponible. */
export default function AgentesIndexPage() {
  const [tipos, setTipos] = useState<AgentType[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/agentes/tipos")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setTipos(data.tipos as AgentType[]);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (tipos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
        <Cpu className="size-8 text-muted-foreground" />
        <p className="font-semibold">Todavía no hay ningún agente configurado</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tipos.map((tipo) => (
        <Link key={tipo.type} href={`/agentes/${tipo.type}`}>
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="size-4.5 text-primary" />
                {tipo.label}
              </CardTitle>
              <CardDescription>{tipo.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Ver historial de ejecuciones →</CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
