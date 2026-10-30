"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardText, Refresh2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiC, eur, fechaCorta, num, type EstadoAsiento } from "@/lib/contabilidad";
import { BotonCsv, Cabecera, CajaError, EstadoBadge, FilaVacia, FilasCarga, FiltroFechas, InfoVista, Kpi, rangoAnioActual, usePlan } from "../_ui";
import { AsientoDialog } from "../asiento-dialog";

interface Movimiento {
  fecha: string;
  asiento_id: number;
  numero: string | null;
  estado: EstadoAsiento;
  asiento_concepto: string;
  orden: number;
  cuenta_codigo: string;
  subcuenta_codigo: string | null;
  subcuenta_nombre: string | null;
  concepto: string;
  debe: number;
  haber: number;
  saldo: number;
}
interface RespuestaMayor {
  cuenta: { codigo: string; nombre: string };
  saldoInicial: number;
  saldoFinal: number;
  totales: { debe: number; haber: number };
  movimientos: Movimiento[];
}

export default function MayorPage() {
  const inicial = rangoAnioActual();
  const [cuenta, setCuenta] = useState("");
  const [desde, setDesde] = useState(inicial.desde);
  const [hasta, setHasta] = useState(inicial.hasta);
  const [borradores, setBorradores] = useState(false);
  const [datos, setDatos] = useState<RespuestaMayor | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const plan = usePlan();

  // Permite llegar desde Sumas y Saldos con ?cuenta=430&desde=…&hasta=…
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("cuenta")) setCuenta(p.get("cuenta")!);
    if (p.get("desde")) setDesde(p.get("desde")!);
    if (p.get("hasta")) setHasta(p.get("hasta")!);
  }, []);

  const cargar = useCallback(async () => {
    if (!/^\d{1,10}$/.test(cuenta)) {
      setDatos(null);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      setDatos(await apiC<RespuestaMayor>("libro-mayor", { query: { cuenta, desde, hasta, borradores } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }, [cuenta, desde, hasta, borradores]);
  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [cargar]);

  return (
    <div className="space-y-3 p-6">
      <Cabecera
        icono={<ClipboardText className="size-4.5" />}
        titulo="Libro Mayor"
        descripcion="Movimientos de una cuenta con su saldo acumulado; una cuenta de control incluye sus subcuentas"
        acciones={
          <>
            <BotonCsv
              nombre={`mayor-${cuenta || "cuenta"}`} disabled={!datos || datos.movimientos.length === 0}
              cabecera={["Fecha", "Asiento", "Concepto", "Subcuenta", "Debe", "Haber", "Saldo"]}
              filas={() => (datos?.movimientos || []).map((m) => [m.fecha.slice(0, 10), m.numero || `#${m.asiento_id}`, m.concepto || m.asiento_concepto, m.subcuenta_codigo ? `${m.subcuenta_codigo} ${m.subcuenta_nombre || ""}` : m.cuenta_codigo, m.debe || "", m.haber || "", m.saldo])}
            />
            <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar">
              <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
            </Button>
          </>
        }
      />
      <InfoVista>Muestra el movimiento de UNA cuenta a lo largo del tiempo, con el saldo tras cada apunte. Ejemplo: elige la cuenta 572 (Bancos) para ver cada cobro y pago de esa cuenta y cuánto queda en cada momento.</InfoVista>
      <datalist id="cuentas-mayor">
        {plan.cuentas.map((c) => (
          <option key={c.codigo} value={c.codigo}>{c.nombre}</option>
        ))}
      </datalist>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Cuentas habituales:</span>
        {[["430", "Clientes"], ["570", "Caja"], ["57200001", "BBVA"], ["57200002", "CaixaBank"], ["57200003", "Sabadell"], ["57200004", "Santander"], ["477", "IVA repercutido"], ["472", "IVA soportado"], ["700", "Ventas"], ["705", "Servicios"], ["555", "Pendientes"]].map(([c, n]) => (
          <Button key={c} size="sm" variant={cuenta === c ? "secondary" : "outline"} className="h-7 px-2 text-xs" onClick={() => setCuenta(c)}>{c} <span className="ml-1 font-normal text-muted-foreground">{n}</span></Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Input list="cuentas-mayor" placeholder="Cuenta (p. ej. 430, 572, 705)" className="h-8 w-56 tabular-nums" value={cuenta} onChange={(e) => setCuenta(e.target.value.trim())} />
        <FiltroFechas desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); }} />
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={borradores} onCheckedChange={(c) => setBorradores(!!c)} /> Incluir borradores y validados
        </label>
      </div>
      <CajaError mensaje={error} />

      {datos && (
        <>
          <div className="text-sm font-medium">{datos.cuenta.codigo} · {datos.cuenta.nombre}</div>
          <div className="grid grid-cols-2 gap-2 sm:max-w-3xl sm:grid-cols-4">
            <Kpi titulo="Saldo inicial" valor={eur(datos.saldoInicial)} color="" />
            <Kpi titulo="Total Debe" valor={eur(datos.totales.debe)} color="" />
            <Kpi titulo="Total Haber" valor={eur(datos.totales.haber)} color="" />
            <Kpi titulo="Saldo final" valor={eur(datos.saldoFinal)} color="text-emerald-600 dark:text-emerald-400" />
          </div>
        </>
      )}

      <div className="max-h-[70vh] overflow-auto rounded-lg border bg-card">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_var(--border)]">
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Asiento</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Subcuenta</TableHead>
              <TableHead className="text-right">Debe</TableHead>
              <TableHead className="text-right">Haber</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && !datos && <FilasCarga columnas={7} />}
            {!datos && !cargando && <FilaVacia columnas={7} texto="Indica una cuenta para ver su mayor." />}
            {datos && datos.movimientos.length === 0 && <FilaVacia columnas={7} texto="Sin movimientos en este periodo." />}
            {datos?.movimientos.map((m) => (
              <TableRow key={`${m.asiento_id}-${m.orden}`} className="cursor-pointer even:bg-muted/20 hover:bg-muted/50" onClick={() => setDetalleId(m.asiento_id)}>
                <TableCell className="tabular-nums">{fechaCorta(m.fecha)}</TableCell>
                <TableCell className="tabular-nums">
                  <span className="mr-1.5 font-medium">{m.numero || `#${m.asiento_id}`}</span>
                  {m.estado !== "CONTABILIZADO" && m.estado !== "CERRADO" && <EstadoBadge estado={m.estado} />}
                </TableCell>
                <TableCell className="max-w-sm truncate text-sm">{m.concepto || m.asiento_concepto}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{m.subcuenta_codigo ? `${m.subcuenta_codigo} · ${m.subcuenta_nombre}` : m.cuenta_codigo}</TableCell>
                <TableCell className="text-right tabular-nums">{m.debe ? num(m.debe) : ""}</TableCell>
                <TableCell className="text-right tabular-nums">{m.haber ? num(m.haber) : ""}</TableCell>
                <TableCell className={`text-right font-medium tabular-nums ${m.saldo < 0 ? "text-red-600 dark:text-red-400" : ""}`}>{num(m.saldo)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <AsientoDialog id={detalleId} onClose={() => setDetalleId(null)} onCambio={cargar} onEditar={() => setDetalleId(null)} />
    </div>
  );
}
