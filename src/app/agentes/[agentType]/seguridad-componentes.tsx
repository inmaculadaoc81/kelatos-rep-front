"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PillBadge } from "@/components/pill-badge";

export interface ResumenNpmAudit {
  configurado?: boolean;
  mensaje?: string;
  total?: number;
  critical?: number;
  high?: number;
  moderate?: number;
  low?: number;
  paquetesAfectados?: string[];
}

export interface ResumenAccesos {
  superadmins: string[];
  accesoCompleto: { email: string; nombre: string }[];
  loginsFallidos24h: { email: string; ip: string | null; intentos: number }[];
  cambiosDesdeUltimaAuditoria: { nuevosAccesoCompleto: string[]; quitadosAccesoCompleto: string[] };
}

export interface ResumenInfra {
  certificados: { dominio: string; ok: boolean; caduca?: string; diasRestantes?: number; error?: string }[];
  docker: { total?: number; caidos?: string[]; noSanos?: { nombre: string; estado: string }[]; error?: string };
  disco: { usoPorcentaje: number; aviso: boolean; detalle: string };
  backups: Record<string, { ok: boolean; horasDesde?: number; ultimaEjecucion?: string; error?: string }>;
}

export type Severidad = "ok" | "aviso" | "critico" | "sindato";

const ESTILO_SEVERIDAD: Record<Severidad, { bg: string; color: string; texto: string }> = {
  ok: { bg: "#dcfce7", color: "#166534", texto: "Bien" },
  aviso: { bg: "#fef3c7", color: "#92400e", texto: "Revisar" },
  critico: { bg: "#fee2e2", color: "#991b1b", texto: "Atención" },
  sindato: { bg: "#e5e7eb", color: "#374151", texto: "Sin datos" },
};

export function TarjetaSeveridad({ titulo, severidad, children }: { titulo: string; severidad: Severidad; children: React.ReactNode }) {
  const e = ESTILO_SEVERIDAD[severidad];
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
          <PillBadge bg={e.bg} color={e.color}>{e.texto}</PillBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">{children}</CardContent>
    </Card>
  );
}

function severidadNpm(r?: ResumenNpmAudit): Severidad {
  if (!r) return "sindato";
  if (r.configurado === false) return "sindato";
  if ((r.critical ?? 0) > 0) return "critico";
  if ((r.high ?? 0) > 0) return "aviso";
  return "ok";
}

export function TarjetaNpm({ titulo, r }: { titulo: string; r?: ResumenNpmAudit }) {
  if (!r) return <TarjetaSeveridad titulo={titulo} severidad="sindato"><p className="text-muted-foreground">Todavía sin ejecutar.</p></TarjetaSeveridad>;
  if (r.configurado === false) {
    return <TarjetaSeveridad titulo={titulo} severidad="sindato"><p className="text-muted-foreground">{r.mensaje}</p></TarjetaSeveridad>;
  }
  return (
    <TarjetaSeveridad titulo={titulo} severidad={severidadNpm(r)}>
      <p><span className="font-semibold tabular-nums">{r.total ?? 0}</span> vulnerabilidades</p>
      <p className="text-xs text-muted-foreground">
        {r.critical ? `${r.critical} críticas · ` : ""}{r.high ? `${r.high} altas · ` : ""}{r.moderate ? `${r.moderate} moderadas · ` : ""}{r.low ? `${r.low} bajas` : ""}
        {!r.critical && !r.high && !r.moderate && !r.low ? "ninguna" : ""}
      </p>
      {!!r.paquetesAfectados?.length && (
        <p className="truncate text-xs text-muted-foreground" title={r.paquetesAfectados.join(", ")}>{r.paquetesAfectados.slice(0, 4).join(", ")}{r.paquetesAfectados.length > 4 ? "…" : ""}</p>
      )}
    </TarjetaSeveridad>
  );
}

export function TarjetaAccesos({ r }: { r?: ResumenAccesos }) {
  if (!r) return <TarjetaSeveridad titulo="Accesos y permisos" severidad="sindato"><p className="text-muted-foreground">Todavía sin ejecutar.</p></TarjetaSeveridad>;
  const cambios = r.cambiosDesdeUltimaAuditoria;
  const hayCambios = (cambios?.nuevosAccesoCompleto?.length ?? 0) > 0 || (cambios?.quitadosAccesoCompleto?.length ?? 0) > 0;
  const hayFallidos = (r.loginsFallidos24h?.length ?? 0) > 0;
  const severidad: Severidad = hayFallidos ? "aviso" : hayCambios ? "aviso" : "ok";
  return (
    <TarjetaSeveridad titulo="Accesos y permisos" severidad={severidad}>
      <p><span className="font-semibold tabular-nums">{r.superadmins?.length ?? 0}</span> superadmins · <span className="font-semibold tabular-nums">{r.accesoCompleto?.length ?? 0}</span> con acceso completo</p>
      <p className="text-xs text-muted-foreground">{r.loginsFallidos24h?.length ?? 0} intentos de login fallidos (24h)</p>
      {hayCambios && (
        <p className="text-xs text-amber-700">
          {cambios.nuevosAccesoCompleto.length ? `+${cambios.nuevosAccesoCompleto.join(", ")} ` : ""}
          {cambios.quitadosAccesoCompleto.length ? `-${cambios.quitadosAccesoCompleto.join(", ")}` : ""}
        </p>
      )}
    </TarjetaSeveridad>
  );
}

export function TarjetaInfra({ r }: { r?: ResumenInfra }) {
  if (!r) return <TarjetaSeveridad titulo="Infraestructura" severidad="sindato"><p className="text-muted-foreground">Todavía sin ejecutar.</p></TarjetaSeveridad>;
  const certCritico = r.certificados?.some((c) => !c.ok || (c.diasRestantes ?? 99) < 14);
  const certAviso = r.certificados?.some((c) => (c.diasRestantes ?? 99) < 30);
  const backupsMal = Object.values(r.backups || {}).some((b) => !b.ok);
  const severidad: Severidad = certCritico || r.disco?.aviso || backupsMal ? "critico" : certAviso ? "aviso" : "ok";
  return (
    <TarjetaSeveridad titulo="Infraestructura del VPS" severidad={severidad}>
      <p className="text-xs text-muted-foreground">
        SSL: {r.certificados?.map((c) => `${c.dominio} (${c.ok ? `${c.diasRestantes}d` : "error"})`).join(" · ")}
      </p>
      <p className="text-xs text-muted-foreground">Disco: {r.disco?.usoPorcentaje}% usado</p>
      <p className="text-xs text-muted-foreground">
        Backups: {Object.entries(r.backups || {}).map(([k, b]) => `${k} ${b.ok ? `hace ${b.horasDesde}h` : "⚠"}`).join(" · ")}
      </p>
      {r.docker?.error && <p className="text-xs text-muted-foreground">Contenedores: sin acceso ({r.docker.error})</p>}
    </TarjetaSeveridad>
  );
}
