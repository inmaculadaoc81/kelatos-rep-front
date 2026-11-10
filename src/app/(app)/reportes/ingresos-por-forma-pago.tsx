"use client";

import { useEffect, useMemo, useState } from "react";
import { Refresh2, DocumentDownload } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { FacturaCliente } from "@/lib/facturas-cliente";
import { descargarXlsxFacturasClientes, resumenIngresos } from "@/lib/facturas-clientes-xlsx";
import { fechaMadrid } from "@/lib/reportes";
import { cn } from "@/lib/utils";

function euros(n: number): string {
  return (n || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

/** YYYY-MM-DD ± días (se calcula a mediodía UTC para no saltar de día). */
function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function ultimoDiaDelMes(anio: number, mes: number): string {
  return new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10);
}

/**
 * Ingresos del día (o del rango elegido) por forma de pago: lo cobrado menos las devoluciones, con efectivo, tarjeta por banco, transferencia…
 * Mismos números que la hoja «Resumen» del Excel de Facturas de Clientes. Solo administradores.
 */
export function IngresosPorFormaPago() {
  const hoy = fechaMadrid(new Date()) || "";
  const [facturas, setFacturas] = useState<FacturaCliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [descargando, setDescargando] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/facturas-clientes", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setFacturas(data.facturas as FacturaCliente[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  const resumen = useMemo(() => resumenIngresos(facturas, desde, hasta), [facturas, desde, hasta]);

  const [anio, mes] = [Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7))];
  const mesPasado = mes === 1 ? { a: anio - 1, m: 12 } : { a: anio, m: mes - 1 };
  const rapidos: { etiqueta: string; d: string; h: string }[] = [
    { etiqueta: "Hoy", d: hoy, h: hoy },
    { etiqueta: "Ayer", d: sumarDias(hoy, -1), h: sumarDias(hoy, -1) },
    { etiqueta: "Últimos 7 días", d: sumarDias(hoy, -6), h: hoy },
    { etiqueta: "Este mes", d: `${hoy.slice(0, 7)}-01`, h: hoy },
    { etiqueta: "Mes pasado", d: `${mesPasado.a}-${String(mesPasado.m).padStart(2, "0")}-01`, h: ultimoDiaDelMes(mesPasado.a, mesPasado.m) },
  ];

  async function descargar() {
    setDescargando(true);
    try {
      await descargarXlsxFacturasClientes(facturas, desde, hasta);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar el Excel");
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="mb-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Ingresos por forma de pago</p>
          <p className="text-xs text-muted-foreground">Cobrado menos devoluciones de facturas, tickets y rectificativas. Pendientes y anulados van aparte.</p>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={cargar}>
            <Refresh2 className={cn("size-4", cargando && "animate-spin")} /> Actualizar
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={descargar} disabled={cargando || descargando || resumen.docs.length === 0}>
            <DocumentDownload className="size-4" /> {descargando ? "Generando…" : "Excel"}
          </Button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {rapidos.map((r) => (
          <button key={r.etiqueta} type="button" onClick={() => { setDesde(r.d); setHasta(r.h); }}
            className={cn("rounded-md border px-2 py-1 text-xs font-medium", desde === r.d && hasta === r.h ? "border-transparent bg-primary text-primary-foreground" : "border-input hover:bg-muted")}>
            {r.etiqueta}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        <Input type="date" aria-label="Desde" title="Desde" className="h-7 w-36 text-xs" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
        <span className="text-xs text-muted-foreground">a</span>
        <Input type="date" aria-label="Hasta" title="Hasta" className="h-7 w-36 text-xs" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
      </div>

      {error && <p className="text-sm text-destructive">No se pudieron cargar las facturas: {error}</p>}
      {cargando && !error && <Skeleton className="h-24 w-full" />}
      {!cargando && !error && (
        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div>
            {resumen.porForma.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No hay ingresos cobrados en ese rango.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-1.5 font-medium">Forma de pago</th>
                    <th className="py-1.5 text-right font-medium">Nº de pagos</th>
                    <th className="py-1.5 text-right font-medium">Importe con IVA</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.porForma.map((f) => (
                    <tr key={f.etiqueta} className="border-b last:border-0">
                      <td className="py-1.5">{f.etiqueta}</td>
                      <td className="py-1.5 text-right tabular-nums">{f.n}</td>
                      <td className={cn("py-1.5 text-right tabular-nums", f.importe < 0 && "text-red-600")}>{euros(f.importe)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-semibold">
                    <td className="py-2">Total ingresos</td>
                    <td />
                    <td className="py-2 text-right tabular-nums">{euros(resumen.totalIngresos)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-xs font-semibold text-muted-foreground">NO CUENTAN COMO INGRESO</p>
            {resumen.otros.length === 0 ? (
              <p className="text-muted-foreground">(ninguno)</p>
            ) : (
              resumen.otros.map((o) => (
                <div key={o.estado} className="flex justify-between gap-2">
                  <span>{o.estado} · {o.n}</span>
                  <span className="tabular-nums text-muted-foreground">{euros(o.importe)}</span>
                </div>
              ))
            )}
            <p className="pt-1 text-xs text-muted-foreground">{resumen.docs.length} documento{resumen.docs.length === 1 ? "" : "s"} en el rango</p>
          </div>
        </div>
      )}
    </div>
  );
}
