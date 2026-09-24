"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Chart, Refresh2, TickCircle, Warning2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiC, num } from "@/lib/contabilidad";
import { Cabecera, CajaError, FilaVacia, FilasCarga, FiltroFechas, rangoAnioActual } from "../_ui";

interface FilaSS {
  codigo: string;
  nombre: string;
  grupo: number;
  saldo_inicial: number;
  debe: number;
  haber: number;
  saldo_deudor: number;
  saldo_acreedor: number;
}
interface Totales {
  saldo_inicial: number;
  debe: number;
  haber: number;
  saldo_deudor: number;
  saldo_acreedor: number;
}

const NOMBRE_GRUPO: Record<number, string> = {
  1: "Grupo 1 · Financiación básica",
  2: "Grupo 2 · Inmovilizado",
  3: "Grupo 3 · Existencias",
  4: "Grupo 4 · Acreedores y deudores",
  5: "Grupo 5 · Cuentas financieras",
  6: "Grupo 6 · Compras y gastos",
  7: "Grupo 7 · Ventas e ingresos",
};

export default function SumasSaldosPage() {
  const [{ desde, hasta }, setRango] = useState(rangoAnioActual);
  const [borradores, setBorradores] = useState(false);
  const [filas, setFilas] = useState<FilaSS[]>([]);
  const [totales, setTotales] = useState<Totales | null>(null);
  const [cuadra, setCuadra] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const d = await apiC<{ filas: FilaSS[]; totales: Totales; cuadra: boolean }>("sumas-saldos", { query: { desde, hasta, borradores } });
      setFilas(d.filas);
      setTotales(d.totales);
      setCuadra(d.cuadra);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, borradores]);
  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="space-y-3">
      <Cabecera
        icono={<Chart className="size-4.5" />}
        titulo="Balance de Sumas y Saldos"
        descripcion="Suma del Debe y del Haber de cada cuenta y su saldo; debe cuadrar siempre"
        acciones={
          <>
            {totales && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${cuadra ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-red-500/15 text-red-700 dark:text-red-300"}`}>
                {cuadra ? <TickCircle className="size-3.5" /> : <Warning2 className="size-3.5" />}
                {cuadra ? "Cuadra" : "Descuadrado"}
              </span>
            )}
            <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar">
              <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <FiltroFechas desde={desde} hasta={hasta} onChange={(d, h) => setRango({ desde: d, hasta: h })} />
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={borradores} onCheckedChange={(c) => setBorradores(!!c)} /> Incluir borradores y validados
        </label>
      </div>
      <CajaError mensaje={error} />

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cuenta</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">Saldo inicial</TableHead>
              <TableHead className="text-right">Debe</TableHead>
              <TableHead className="text-right">Haber</TableHead>
              <TableHead className="text-right">Saldo deudor</TableHead>
              <TableHead className="text-right">Saldo acreedor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && <FilasCarga columnas={7} />}
            {!cargando && filas.length === 0 && <FilaVacia columnas={7} texto="Sin movimientos contabilizados en este periodo." />}
            {!cargando &&
              filas.map((f, i) => (
                <Fragment key={f.codigo}>
                  {(i === 0 || filas[i - 1].grupo !== f.grupo) && (
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableCell colSpan={7} className="py-1 text-xs font-semibold text-muted-foreground">{NOMBRE_GRUPO[f.grupo] || `Grupo ${f.grupo}`}</TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell className="font-medium tabular-nums">
                      <Link href={`/contabilidad/mayor?cuenta=${f.codigo}&desde=${desde}&hasta=${hasta}`} className="underline-offset-2 hover:underline">{f.codigo}</Link>
                    </TableCell>
                    <TableCell>{f.nombre}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{f.saldo_inicial ? num(f.saldo_inicial) : ""}</TableCell>
                    <TableCell className="text-right tabular-nums">{f.debe ? num(f.debe) : ""}</TableCell>
                    <TableCell className="text-right tabular-nums">{f.haber ? num(f.haber) : ""}</TableCell>
                    <TableCell className="text-right tabular-nums">{f.saldo_deudor ? num(f.saldo_deudor) : ""}</TableCell>
                    <TableCell className="text-right tabular-nums">{f.saldo_acreedor ? num(f.saldo_acreedor) : ""}</TableCell>
                  </TableRow>
                </Fragment>
              ))}
            {!cargando && totales && filas.length > 0 && (
              <TableRow className="font-semibold">
                <TableCell colSpan={2} className="text-right">Totales</TableCell>
                <TableCell className="text-right tabular-nums">{num(totales.saldo_inicial)}</TableCell>
                <TableCell className="text-right tabular-nums">{num(totales.debe)}</TableCell>
                <TableCell className="text-right tabular-nums">{num(totales.haber)}</TableCell>
                <TableCell className="text-right tabular-nums">{num(totales.saldo_deudor)}</TableCell>
                <TableCell className="text-right tabular-nums">{num(totales.saldo_acreedor)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
