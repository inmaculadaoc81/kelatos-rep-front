"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Element3, Refresh2, TickCircle, Warning2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiC, hoyISO, num } from "@/lib/contabilidad";
import { Cabecera, CajaError, FiltroFechas, rangoAnioActual } from "../_ui";

interface CuentaBal {
  codigo: string;
  nombre: string;
  importe: number;
  nota?: string;
}
interface SeccionBal {
  seccion: string;
  nombre: string;
  total: number;
  cuentas: CuentaBal[];
}
interface Balance {
  hasta: string;
  activo: SeccionBal[];
  pasivo: SeccionBal[];
  totalActivo: number;
  totalPasivo: number;
  resultado: number;
  cuadra: boolean;
}
interface LineaPyG {
  id: string;
  nombre: string;
  total: number;
  subtotal?: boolean;
  cuentas: { codigo: string; nombre: string; importe: number }[];
}
interface PyG {
  lineas: LineaPyG[];
  sinClasificar: { codigo: string; nombre: string; importe: number }[];
  resultado: number;
  aviso: string | null;
}

export default function BalancePage() {
  const [pestana, setPestana] = useState("balance");
  const [hasta, setHasta] = useState(hoyISO());
  const [{ desde, hasta: hastaPyg }, setRango] = useState(rangoAnioActual);
  const [borradores, setBorradores] = useState(false);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [pyg, setPyg] = useState<PyG | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      if (pestana === "balance") setBalance(await apiC<Balance>("balance", { query: { hasta, borradores } }));
      else setPyg(await apiC<PyG>("pyg", { query: { desde, hasta: hastaPyg, borradores } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }, [pestana, hasta, desde, hastaPyg, borradores]);
  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="space-y-3 p-6">
      <Cabecera
        icono={<Element3 className="size-4.5" />}
        titulo="Balance y resultados"
        descripcion="Situación patrimonial a una fecha y pérdidas y ganancias de un periodo, calculadas desde los asientos"
        acciones={
          <>
            {pestana === "balance" && balance && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${balance.cuadra ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-red-500/15 text-red-700 dark:text-red-300"}`}>
                {balance.cuadra ? <TickCircle className="size-3.5" /> : <Warning2 className="size-3.5" />}
                {balance.cuadra ? "Activo = Pasivo + Patrimonio" : "Descuadrado"}
              </span>
            )}
            <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar">
              <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
            </Button>
          </>
        }
      />
      <CajaError mensaje={error} />
      <Tabs value={pestana} onValueChange={(v) => setPestana(String(v))}>
        <TabsList>
          <TabsTrigger value="balance">Balance de situación</TabsTrigger>
          <TabsTrigger value="pyg">Pérdidas y ganancias</TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap items-center gap-3 pt-3">
          {pestana === "balance" ? (
            <label className="flex items-center gap-2 text-sm">
              A fecha de <Input type="date" className="h-8 w-40" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </label>
          ) : (
            <FiltroFechas desde={desde} hasta={hastaPyg} onChange={(d, h) => setRango({ desde: d, hasta: h })} />
          )}
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={borradores} onCheckedChange={(c) => setBorradores(!!c)} /> Incluir borradores y validados
          </label>
        </div>

        <TabsContent value="balance" className="pt-3">
          {cargando && !balance && <Skeleton className="h-64 w-full" />}
          {balance && (
            <div className="grid gap-3 lg:grid-cols-2">
              <Lado titulo="ACTIVO" secciones={balance.activo} total={balance.totalActivo} />
              <Lado titulo="PATRIMONIO NETO Y PASIVO" secciones={balance.pasivo} total={balance.totalPasivo} />
            </div>
          )}
          {balance && balance.totalActivo === 0 && balance.totalPasivo === 0 && <p className="pt-3 text-sm text-muted-foreground">Todavía no hay asientos contabilizados hasta esa fecha.</p>}
        </TabsContent>

        <TabsContent value="pyg" className="pt-3">
          {cargando && !pyg && <Skeleton className="h-64 w-full" />}
          {pyg && (
            <div className="overflow-hidden rounded-lg border bg-card sm:max-w-3xl">
              {pyg.lineas.map((l) => (
                <div key={l.id} className={l.subtotal ? "border-t bg-muted/50" : ""}>
                  <div className={`flex items-center justify-between px-3 py-1.5 ${l.subtotal ? "font-semibold" : "text-sm font-medium"}`}>
                    <span>{l.nombre}</span>
                    <span className={`tabular-nums ${l.total < 0 ? "text-red-600 dark:text-red-400" : ""}`}>{num(l.total)}</span>
                  </div>
                  {l.cuentas.map((c) => (
                    <div key={c.codigo} className="flex items-center justify-between px-3 py-0.5 pl-8 text-xs text-muted-foreground">
                      <Link href={`/contabilidad/mayor?cuenta=${c.codigo}&desde=${desde}&hasta=${hastaPyg}`} className="hover:underline">{c.codigo} · {c.nombre}</Link>
                      <span className="tabular-nums">{num(c.importe)}</span>
                    </div>
                  ))}
                </div>
              ))}
              {pyg.aviso && <p className="border-t px-3 py-2 text-xs text-amber-700 dark:text-amber-300">{pyg.aviso}</p>}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Lado({ titulo, secciones, total }: { titulo: string; secciones: SeccionBal[]; total: number }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="bg-muted/60 px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground">{titulo}</div>
      {secciones.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground">Sin saldos.</p>}
      {secciones.map((s) => (
        <div key={s.seccion} className="border-t">
          <div className="flex items-center justify-between px-3 py-1.5 text-sm font-medium">
            <span>{s.nombre}</span>
            <span className="tabular-nums">{num(s.total)}</span>
          </div>
          {s.cuentas.map((c) => (
            <div key={c.codigo + c.nombre} className="flex items-center justify-between px-3 py-0.5 pl-8 text-xs text-muted-foreground">
              <Link href={`/contabilidad/mayor?cuenta=${c.codigo}`} className="hover:underline" title={c.nota}>{c.codigo} · {c.nombre}</Link>
              <span className="tabular-nums">{num(c.importe)}</span>
            </div>
          ))}
        </div>
      ))}
      <div className="flex items-center justify-between border-t bg-muted/40 px-3 py-2 text-sm font-semibold">
        <span>TOTAL</span>
        <span className="tabular-nums">{num(total)}</span>
      </div>
    </div>
  );
}
