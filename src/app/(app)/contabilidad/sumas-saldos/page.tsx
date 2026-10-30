"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Chart, Refresh2, SearchNormal1, TickCircle, Warning2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiC, eur, num } from "@/lib/contabilidad";
import { BotonCsv, Cabecera, CajaError, FilaVacia, FilasCarga, FiltroFechas, InfoVista, Kpi, rangoAnioActual } from "../_ui";

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
const r2 = (n: number) => Math.round(n * 100) / 100;
const suma = (fs: FilaSS[], k: keyof Totales) => r2(fs.reduce((s, f) => s + f[k], 0));

export default function SumasSaldosPage() {
  const [{ desde, hasta }, setRango] = useState(rangoAnioActual);
  const [borradores, setBorradores] = useState(false);
  const [busqueda, setBusqueda] = useState("");
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

  // Filtro por código o nombre; los totales de arriba siguen siendo los de todo el periodo.
  const visibles = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    return t ? filas.filter((f) => f.codigo.includes(t) || f.nombre.toLowerCase().includes(t)) : filas;
  }, [filas, busqueda]);

  return (
    <div className="space-y-3 p-6">
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
            <BotonCsv
              nombre="sumas-y-saldos" disabled={visibles.length === 0}
              cabecera={["Cuenta", "Nombre", "Saldo inicial", "Debe", "Haber", "Saldo deudor", "Saldo acreedor"]}
              filas={() => visibles.map((f) => [f.codigo, f.nombre, f.saldo_inicial || "", f.debe || "", f.haber || "", f.saldo_deudor || "", f.saldo_acreedor || ""])}
            />
            <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar">
              <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
            </Button>
          </>
        }
      />
      <InfoVista>Resume, a una fecha, cuánto ha sumado cada cuenta en el Debe y en el Haber y su saldo — sirve para comprobar que todo cuadra antes de cerrar el periodo. Ejemplo: si el total del Debe no coincide con el del Haber, hay un asiento descuadrado que revisar. Pulsa el código de una cuenta para ver todos sus movimientos en el Libro Mayor.</InfoVista>
      <div className="flex flex-wrap items-center gap-3">
        <FiltroFechas desde={desde} hasta={hasta} onChange={(d, h) => setRango({ desde: d, hasta: h })} />
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={borradores} onCheckedChange={(c) => setBorradores(!!c)} /> Incluir borradores y validados
        </label>
        <div className="relative w-full max-w-xs">
          <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar cuenta por código o nombre…" className="h-8 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
      </div>
      <CajaError mensaje={error} />

      {totales && (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Kpi titulo="Total Debe" valor={eur(totales.debe)} color="" />
          <Kpi titulo="Total Haber" valor={eur(totales.haber)} color={cuadra ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"} />
          <Kpi titulo="Saldos deudores" valor={eur(totales.saldo_deudor)} color="" />
          <Kpi titulo="Saldos acreedores" valor={eur(totales.saldo_acreedor)} color="" />
        </div>
      )}

      <div className="max-h-[70vh] overflow-auto rounded-lg border bg-card">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_var(--border)]">
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
            {!cargando && filas.length > 0 && visibles.length === 0 && <FilaVacia columnas={7} texto="Ninguna cuenta coincide con la búsqueda." />}
            {!cargando &&
              visibles.map((f, i) => {
                const primeraDelGrupo = i === 0 || visibles[i - 1].grupo !== f.grupo;
                const ultimaDelGrupo = i === visibles.length - 1 || visibles[i + 1].grupo !== f.grupo;
                const delGrupo = visibles.filter((x) => x.grupo === f.grupo);
                return (
                  <Fragment key={f.codigo}>
                    {primeraDelGrupo && (
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableCell colSpan={7} className="py-1 text-xs font-semibold text-muted-foreground">{NOMBRE_GRUPO[f.grupo] || `Grupo ${f.grupo}`}</TableCell>
                      </TableRow>
                    )}
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="font-medium tabular-nums">
                        <Link href={`/contabilidad/mayor?cuenta=${f.codigo}&desde=${desde}&hasta=${hasta}`} className="underline-offset-2 hover:underline" title="Ver en el Libro Mayor">{f.codigo}</Link>
                      </TableCell>
                      <TableCell>{f.nombre}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{f.saldo_inicial ? num(f.saldo_inicial) : ""}</TableCell>
                      <TableCell className="text-right tabular-nums">{f.debe ? num(f.debe) : ""}</TableCell>
                      <TableCell className="text-right tabular-nums">{f.haber ? num(f.haber) : ""}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{f.saldo_deudor ? num(f.saldo_deudor) : ""}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{f.saldo_acreedor ? num(f.saldo_acreedor) : ""}</TableCell>
                    </TableRow>
                    {ultimaDelGrupo && delGrupo.length > 1 && (
                      <TableRow className="bg-muted/20 text-xs text-muted-foreground hover:bg-muted/20">
                        <TableCell colSpan={2} className="py-1 text-right">Subtotal del grupo {f.grupo}</TableCell>
                        <TableCell className="py-1 text-right tabular-nums">{suma(delGrupo, "saldo_inicial") ? num(suma(delGrupo, "saldo_inicial")) : ""}</TableCell>
                        <TableCell className="py-1 text-right tabular-nums">{num(suma(delGrupo, "debe"))}</TableCell>
                        <TableCell className="py-1 text-right tabular-nums">{num(suma(delGrupo, "haber"))}</TableCell>
                        <TableCell className="py-1 text-right tabular-nums">{num(suma(delGrupo, "saldo_deudor"))}</TableCell>
                        <TableCell className="py-1 text-right tabular-nums">{num(suma(delGrupo, "saldo_acreedor"))}</TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
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
