"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Personalcard, Building, ArrowSwapHorizontal, TickCircle, Warning2, CloseCircle } from "@/lib/icons";
import type { Movimiento } from "./tabla-movimientos";

// Puerto fiel del análisis de "abrirModalPar()" del original (index.html):
// mismas 6 comprobaciones (origen/referencia/código/monto/fecha/remitente/
// banco), mismos niveles ok/warn/danger, y el mismo bloqueo duro cuando el
// monto difiere en más de 0,10 €.
const TOLERANCIA_MONTO = 0.1;

function normStr(v: string | null): string {
  if (!v) return "";
  return v.trim().toLowerCase().replace(/\s+/g, " ");
}

function normFecha(v: string | null): string {
  if (!v) return "";
  return v.trim().slice(0, 10);
}

function parseMonto(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

type Nivel = "ok" | "warn" | "danger";
interface MatchItem { nivel: Nivel; texto: string }

const ESTILO_NIVEL: Record<Nivel, string> = {
  ok: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warn: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  danger: "bg-destructive/10 text-destructive",
};
const ICONO_NIVEL: Record<Nivel, typeof TickCircle> = { ok: TickCircle, warn: Warning2, danger: CloseCircle };

function analizar(izq: Movimiento, der: Movimiento) {
  const matches: MatchItem[] = [];
  let hayProblema = false;
  let montoFueraTolerancia = false;

  if (izq.origen && der.origen) {
    if (izq.origen === der.origen) {
      matches.push({ nivel: "danger", texto: `Mismo origen: ambos son ${izq.origen}` });
      hayProblema = true;
    } else {
      matches.push({ nivel: "ok", texto: `Orígenes diferentes: ${izq.origen} / ${der.origen}` });
    }
  }

  if (izq.referencia && der.referencia) {
    if (normStr(izq.referencia) === normStr(der.referencia)) {
      matches.push({ nivel: "ok", texto: `Referencia coincide: ${izq.referencia}` });
    } else {
      matches.push({ nivel: "warn", texto: `Referencia diferente: ${izq.referencia} vs ${der.referencia}` });
    }
  }

  if (izq.codigo_referencia_concepto && der.codigo_referencia_concepto) {
    if (normStr(izq.codigo_referencia_concepto) === normStr(der.codigo_referencia_concepto)) {
      matches.push({ nivel: "ok", texto: `Código Ref. coincide: ${izq.codigo_referencia_concepto}` });
    } else {
      matches.push({ nivel: "warn", texto: `Código Ref. diferente: ${izq.codigo_referencia_concepto} vs ${der.codigo_referencia_concepto}` });
    }
  }

  const m1 = parseMonto(izq.monto);
  const m2 = parseMonto(der.monto);
  if (m1 !== null && m2 !== null) {
    const diff = Math.abs(m1 - m2);
    if (diff === 0) {
      matches.push({ nivel: "ok", texto: `Monto exacto: ${izq.monto} €` });
    } else if (diff <= TOLERANCIA_MONTO) {
      matches.push({ nivel: "warn", texto: `Monto similar: ${izq.monto} vs ${der.monto} € (diferencia: ${diff.toFixed(2)} €)` });
    } else {
      matches.push({ nivel: "danger", texto: `Monto diferente: ${izq.monto} vs ${der.monto} € (diferencia: ${diff.toFixed(2)} €)` });
      hayProblema = true;
      montoFueraTolerancia = true;
    }
  } else {
    matches.push({ nivel: "warn", texto: "No se pudo comparar monto" });
  }

  if (izq.fecha_valor && der.fecha_valor) {
    if (normFecha(izq.fecha_valor) === normFecha(der.fecha_valor)) {
      matches.push({ nivel: "ok", texto: `Fecha coincide: ${izq.fecha_valor}` });
    } else {
      matches.push({ nivel: "danger", texto: `Fecha diferente: ${izq.fecha_valor} vs ${der.fecha_valor}` });
      hayProblema = true;
    }
  }

  if (izq.remitente && der.remitente) {
    if (normStr(izq.remitente) === normStr(der.remitente)) {
      matches.push({ nivel: "ok", texto: "Remitente coincide" });
    } else {
      matches.push({ nivel: "warn", texto: `Remitente diferente: ${izq.remitente} vs ${der.remitente}` });
    }
  }

  if (izq.banco && der.banco && normStr(izq.banco) === normStr(der.banco)) {
    matches.push({ nivel: "ok", texto: `Banco coincide: ${izq.banco}` });
  }

  return { matches, hayProblema, montoFueraTolerancia };
}

function LadoComparacion({ t, tipo, titulo }: { t: Movimiento; tipo: "cliente" | "empresa"; titulo: string }) {
  const Icono = tipo === "empresa" ? Building : Personalcard;
  const colorClase = tipo === "empresa" ? "text-sky-600 dark:text-sky-400" : "text-violet-600 dark:text-violet-400";
  const filas: [string, string][] = [
    ["Remitente", t.remitente || "-"],
    ["Monto", `${t.monto || "0"} €`],
    ["Fecha", t.fecha_valor || "-"],
    ["Concepto", t.concepto || "-"],
    ["Código", t.codigo_referencia_concepto || "-"],
    ["Banco", t.banco || "-"],
  ];
  return (
    <div className="flex-1 space-y-1.5 rounded-lg border p-3">
      <p className={`flex items-center gap-1.5 text-xs font-bold uppercase ${colorClase}`}>
        <Icono className="size-3.5" /> {titulo}
      </p>
      {filas.map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-2 border-t pt-1 text-xs first:border-0 first:pt-0">
          <span className="shrink-0 text-muted-foreground">{label}</span>
          <span className="truncate text-right font-medium" title={value}>{value}</span>
        </div>
      ))}
    </div>
  );
}

export function ConciliarParDialog({
  t1,
  t2,
  onOpenChange,
  onConciliado,
}: {
  t1: Movimiento | null;
  t2: Movimiento | null;
  onOpenChange: (open: boolean) => void;
  onConciliado: () => void;
}) {
  const [enviando, setEnviando] = useState(false);

  const { izq, der, izqTipo, derTipo, resultado } = useMemo(() => {
    if (!t1 || !t2) return { izq: null, der: null, izqTipo: "cliente" as const, derTipo: "empresa" as const, resultado: null };
    let izquierda = t1, derecha = t2;
    if (t1.origen === "Empresa" && t2.origen === "Cliente") { izquierda = t2; derecha = t1; }
    const izqT = izquierda.origen === "Empresa" ? "empresa" : "cliente";
    const derT = derecha.origen === "Empresa" ? "empresa" : "cliente";
    return { izq: izquierda, der: derecha, izqTipo: izqT as "cliente" | "empresa", derTipo: derT as "cliente" | "empresa", resultado: analizar(izquierda, derecha) };
  }, [t1, t2]);

  async function conciliar() {
    if (!izq || !der) return;
    setEnviando(true);
    try {
      const res = await fetch("/api/transferencias/conciliar-par", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id1: izq.id, id2: der.id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`#${izq.id} y #${der.id} conciliadas`);
      onOpenChange(false);
      onConciliado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={t1 !== null && t2 !== null} onOpenChange={(o) => !enviando && onOpenChange(o)}>
      <DialogContent className="sm:max-w-2xl" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <ArrowSwapHorizontal className="size-4" />
            </span>
            Conciliar par de transferencias
          </DialogTitle>
        </DialogHeader>

        {izq && der && resultado && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <LadoComparacion t={izq} tipo={izqTipo} titulo={`${izq.origen || "Transferencia"} #${izq.id}`} />
              <ArrowSwapHorizontal className="size-4 shrink-0 text-muted-foreground" />
              <LadoComparacion t={der} tipo={derTipo} titulo={`${der.origen || "Transferencia"} #${der.id}`} />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {resultado.matches.map((m, i) => {
                const Icono = ICONO_NIVEL[m.nivel];
                return (
                  <span key={i} className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${ESTILO_NIVEL[m.nivel]}`}>
                    <Icono className="size-3" /> {m.texto}
                  </span>
                );
              })}
            </div>

            {resultado.montoFueraTolerancia ? (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
                <Warning2 className="mt-0.5 size-4 shrink-0" />
                No se puede conciliar: la diferencia de monto supera la tolerancia de 0,10 €.
              </div>
            ) : resultado.hayProblema ? (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                <Warning2 className="mt-0.5 size-4 shrink-0" />
                Hay diferencias entre estas transferencias. Verifica antes de conciliar.
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">¿Conciliar estas dos transferencias como par?</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={enviando}>Cancelar</Button>
          <Button
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={conciliar}
            disabled={enviando || !!resultado?.montoFueraTolerancia}
            title={resultado?.montoFueraTolerancia ? "Montos fuera de tolerancia (máx. 0,10 €)" : undefined}
          >
            <TickCircle className="size-4" /> {enviando ? "Conciliando..." : "Conciliar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
