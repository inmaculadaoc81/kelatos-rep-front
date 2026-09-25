"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Refresh2, Setting2, TickCircle, Warning2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiC, eur } from "@/lib/contabilidad";
import { Cabecera, CajaError, Kpi } from "../_ui";
import { AsientoDialog } from "../asiento-dialog";

interface Paso {
  id: string;
  titulo: string;
  estado: "hecho" | "pendiente";
  detalle: string;
  asiento: { id: number; numero: string | null; estado: string } | null;
}
interface Estado {
  anio: number;
  ejercicio: "abierto" | "cerrado";
  resultado: number;
  existencias: number;
  pasos: Paso[];
}

/** Cierre de ejercicio paso a paso. Todo lo que se genera queda en borrador para revisarlo y contabilizarlo. */
export default function CierrePage() {
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [estado, setEstado] = useState<Estado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [valorExistencias, setValorExistencias] = useState("");
  const [motivo, setMotivo] = useState("");
  const [detalleId, setDetalleId] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setEstado(await apiC<Estado>("cierre", { query: { anio } }));
    } catch (e) {
      setEstado(null);
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }, [anio]);
  useEffect(() => {
    cargar();
  }, [cargar]);

  async function accion(clave: string, ruta: string, cuerpo: Record<string, unknown>, ok: string) {
    setTrabajando(clave);
    try {
      await apiC(ruta, { metodo: "POST", cuerpo: { anio, ...cuerpo } });
      toast.success(ok);
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setTrabajando(null);
    }
  }

  const paso = (id: string) => estado?.pasos.find((p) => p.id === id);
  const hecho = (id: string) => paso(id)?.estado === "hecho";
  const cerrado = estado?.ejercicio === "cerrado";

  const accionDe = (p: Paso) => {
    if (cerrado) return null;
    switch (p.id) {
      case "existencias":
        return p.estado === "hecho" ? null : (
          <div className="flex flex-wrap items-center gap-2">
            <Input inputMode="decimal" className="h-8 w-36 tabular-nums" placeholder="Valor final (€)" value={valorExistencias} onChange={(e) => setValorExistencias(e.target.value)} aria-label="Valor final de las existencias" />
            <Button size="sm" variant="outline" disabled={!valorExistencias || trabajando !== null} onClick={() => accion("existencias", "cierre/existencias", { valor_final: Number(valorExistencias.replace(",", ".")) }, "Borrador de regularización creado")}>Generar</Button>
          </div>
        );
      case "regularizacion":
        return p.asiento ? null : <Button size="sm" variant="outline" disabled={trabajando !== null || !hecho("pendientes")} onClick={() => accion("regularizacion", "cierre/regularizacion", {}, "Borrador de regularización del resultado creado")}>Generar</Button>;
      case "cierre":
      case "apertura":
        return p.id === "cierre" && !p.asiento ? <Button size="sm" variant="outline" disabled={trabajando !== null || !hecho("regularizacion")} onClick={() => accion("cierre", "cierre/generar", {}, "Borradores de cierre y apertura creados")}>Generar cierre y apertura</Button> : null;
      case "periodos":
        return <Link href="/contabilidad/periodos" className="text-sm text-primary hover:underline">Ir a Periodos</Link>;
      case "ejercicio":
        return p.estado === "hecho" ? null : <Button size="sm" disabled={trabajando !== null || !["cierre", "apertura", "periodos"].every(hecho)} onClick={() => accion("cerrar", "cierre/cerrar", {}, `Ejercicio ${anio} cerrado`)}>Cerrar el ejercicio</Button>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3 p-6">
      <Cabecera
        icono={<Setting2 className="size-4.5" />}
        titulo="Cierre de ejercicio"
        descripcion="Sigue los pasos en orden. Cada asiento que se genera queda en borrador: revísalo y contabilízalo desde Asientos"
        acciones={
          <>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setAnio((a) => a - 1)}>‹</Button>
              <span className="w-14 text-center text-sm font-semibold tabular-nums">{anio}</span>
              <Button variant="outline" size="sm" onClick={() => setAnio((a) => a + 1)}>›</Button>
            </div>
            <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar"><Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} /></Button>
          </>
        }
      />
      <CajaError mensaje={error} />
      {cargando && !estado && <Skeleton className="h-64 w-full" />}
      {estado && (
        <>
          <div className="grid grid-cols-3 gap-2 sm:max-w-2xl">
            <Kpi titulo={`Resultado ${anio}`} valor={eur(estado.resultado)} color={estado.resultado >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"} />
            <Kpi titulo="Existencias contables" valor={eur(estado.existencias)} color="" />
            <Kpi titulo="Ejercicio" valor={cerrado ? "Cerrado" : "Abierto"} color={cerrado ? "text-muted-foreground" : "text-emerald-600 dark:text-emerald-400"} />
          </div>
          <ol className="divide-y overflow-hidden rounded-lg border bg-card sm:max-w-3xl">
            {estado.pasos.map((p, i) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${p.estado === "hecho" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                  {p.estado === "hecho" ? <TickCircle className="size-4" /> : <span className="text-xs font-medium">{i + 1}</span>}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{p.titulo}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.asiento ? (
                      <button type="button" className="underline-offset-2 hover:underline" onClick={() => setDetalleId(p.asiento!.id)}>{p.detalle}</button>
                    ) : p.estado === "pendiente" && ["pendientes", "amortizacion"].includes(p.id) ? (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"><Warning2 className="size-3" /> {p.detalle}</span>
                    ) : (
                      p.detalle
                    )}
                  </div>
                </div>
                {accionDe(p)}
              </li>
            ))}
          </ol>
          {cerrado && (
            <div className="flex flex-wrap items-center gap-2 sm:max-w-3xl">
              <Input className="h-8 min-w-64 flex-1" placeholder="Motivo para reabrir (mín. 10 caracteres)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
              <Button size="sm" variant="outline" disabled={motivo.trim().length < 10 || trabajando !== null} onClick={() => accion("reabrir", "cierre/reabrir", { motivo }, `Ejercicio ${anio} reabierto`)}>Reabrir ejercicio</Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            La regularización del resultado y el asiento de cierre no cuentan en Pérdidas y Ganancias, IVA ni antigüedad de clientes. El resultado queda en la cuenta 129; su aplicación a reservas o remanente se hace con un asiento manual cuando la gestoría lo indique.
          </p>
        </>
      )}
      <AsientoDialog id={detalleId} onClose={() => setDetalleId(null)} onCambio={cargar} onEditar={() => setDetalleId(null)} />
    </div>
  );
}
