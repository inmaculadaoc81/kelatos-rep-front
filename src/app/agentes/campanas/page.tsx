"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PillBadge } from "@/components/pill-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Campaign, CAMPAIGN_STATUS_LABEL, CAMPAIGN_STATUS_COLOR } from "@/lib/campanas";

export default function CampanasPage() {
  const router = useRouter();
  const [campanas, setCampanas] = useState<Campaign[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [form, setForm] = useState({
    name: "",
    goalText: "",
    mode: "external" as "external" | "internal" | "hybrid",
    sector: "",
    location: "",
    limit: 200,
    maxCostUsd: 10,
  });

  async function cargar() {
    try {
      const res = await fetch("/api/agentes/campanas");
      const data = await res.json();
      if (data.ok) setCampanas(data.campaigns as Campaign[]);
    } catch {
      // silencioso
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function crear() {
    if (!form.name.trim() || !form.goalText.trim()) {
      return toast.error("Nombre y objetivo son obligatorios");
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/agentes/campanas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          goalText: form.goalText.trim(),
          maxCostUsd: form.maxCostUsd,
          sourceConfig: {
            mode: form.mode,
            ...(form.mode !== "internal" ? { externalProviders: ["infoisinfo"] } : {}),
            sector: form.sector.trim() || undefined,
            location: form.location.trim() || undefined,
            limit: form.limit,
          },
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error");
      toast.success("Campaña creada");
      router.push(`/agentes/campanas/${data.campaign.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Campañas</h1>
          <p className="text-sm text-muted-foreground">Equipo de marketing IA — un objetivo de negocio por campaña.</p>
        </div>
        <Button onClick={() => setAbierto(true)}>Nueva campaña</Button>
      </div>

      {cargando ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : campanas.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          Todavía no hay campañas. Crea la primera.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {campanas.map((c) => {
            const col = CAMPAIGN_STATUS_COLOR[c.status];
            return (
              <Link key={c.id} href={`/agentes/campanas/${c.id}`}>
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

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva campaña</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Clínicas Madrid Septiembre" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Objetivo (lenguaje natural)</Label>
              <Textarea
                value={form.goalText}
                onChange={(e) => setForm({ ...form, goalText: e.target.value })}
                rows={3}
                placeholder="Conseguir 30 oportunidades de clínicas privadas en Madrid para vender automatización y desarrollo web"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Modo</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  value={form.mode}
                  onChange={(e) => setForm({ ...form, mode: e.target.value as typeof form.mode })}
                >
                  <option value="external">Búsqueda externa</option>
                  <option value="internal">Base propia</option>
                  <option value="hybrid">Híbrido</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Límite empresas</Label>
                <Input type="number" value={form.limit} onChange={(e) => setForm({ ...form, limit: Number(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sector</Label>
                <Input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} placeholder="clínica dental" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ubicación</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Madrid" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Presupuesto máx. (USD)</Label>
                <Input type="number" step="1" value={form.maxCostUsd} onChange={(e) => setForm({ ...form, maxCostUsd: Number(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button onClick={crear} disabled={enviando}>{enviando ? "Creando…" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
