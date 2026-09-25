"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Profile2User, Refresh2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiC, eur, hoyISO, num } from "@/lib/contabilidad";
import { Cabecera, CajaError, FilaVacia, FilasCarga, Kpi } from "../_ui";

interface Fila {
  codigo: string;
  nombre: string;
  pendiente: number;
  a_favor: number;
  saldo: number;
  "0-30": number;
  "31-60": number;
  "61-90": number;
  "mas-90": number;
}
interface Datos {
  tipo: "clientes" | "proveedores";
  filas: Fila[];
  totales: Omit<Fila, "codigo" | "nombre">;
}

/** Quién nos debe (clientes) y a quién debemos (proveedores), con la antigüedad de cada deuda. */
export default function TercerosPage() {
  const [tipo, setTipo] = useState<"clientes" | "proveedores">("clientes");
  const [hasta, setHasta] = useState(hoyISO());
  const [borradores, setBorradores] = useState(false);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await apiC<Datos>("terceros", { query: { tipo, hasta, borradores } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }, [tipo, hasta, borradores]);
  useEffect(() => {
    cargar();
  }, [cargar]);

  const celda = (n: number, rojo = false) => <TableCell className={`text-right tabular-nums ${n ? (rojo ? "text-red-600 dark:text-red-400" : "") : "text-muted-foreground"}`}>{n ? num(n) : "—"}</TableCell>;

  return (
    <div className="space-y-3 p-6">
      <Cabecera
        icono={<Profile2User className="size-4.5" />}
        titulo="Clientes y proveedores"
        descripcion="Saldo pendiente de cada tercero con su antigüedad; los cobros y pagos cierran primero las partidas más viejas"
        acciones={
          <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
        }
      />
      <Tabs value={tipo} onValueChange={(v) => setTipo(v === "proveedores" ? "proveedores" : "clientes")}>
        <TabsList>
          <TabsTrigger value="clientes">Clientes (nos deben)</TabsTrigger>
          <TabsTrigger value="proveedores">Proveedores (debemos)</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          A fecha de <Input type="date" className="h-8 w-40" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={borradores} onCheckedChange={(c) => setBorradores(!!c)} /> Incluir borradores y validados
        </label>
      </div>
      <CajaError mensaje={error} />
      {datos && (
        <div className="grid grid-cols-2 gap-2 sm:max-w-2xl sm:grid-cols-3">
          <Kpi titulo={tipo === "clientes" ? "Pendiente de cobro" : "Pendiente de pago"} valor={eur(datos.totales.pendiente)} color="" />
          <Kpi titulo="Vencido a más de 90 días" valor={eur(datos.totales["mas-90"])} color={datos.totales["mas-90"] ? "text-red-600 dark:text-red-400" : ""} />
          <Kpi titulo="Saldos a favor" valor={eur(datos.totales.a_favor)} color="text-emerald-600 dark:text-emerald-400" />
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tipo === "clientes" ? "Cliente" : "Proveedor"}</TableHead>
              <TableHead className="text-right">0-30 días</TableHead>
              <TableHead className="text-right">31-60</TableHead>
              <TableHead className="text-right">61-90</TableHead>
              <TableHead className="text-right">Más de 90</TableHead>
              <TableHead className="text-right">Pendiente</TableHead>
              <TableHead className="text-right">A favor</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && !datos && <FilasCarga columnas={8} />}
            {datos && datos.filas.length === 0 && <FilaVacia columnas={8} texto={tipo === "clientes" ? "Ningún cliente tiene saldo pendiente." : "No se debe nada a ningún proveedor."} />}
            {datos?.filas.map((f) => (
              <TableRow key={f.codigo}>
                <TableCell>
                  <Link href={`/contabilidad/mayor?cuenta=${f.codigo}`} className="font-medium hover:underline">{f.nombre}</Link>
                  <div className="text-xs tabular-nums text-muted-foreground">{f.codigo}</div>
                </TableCell>
                {celda(f["0-30"])}
                {celda(f["31-60"])}
                {celda(f["61-90"], true)}
                {celda(f["mas-90"], true)}
                <TableCell className="text-right font-medium tabular-nums">{num(f.pendiente)}</TableCell>
                {celda(f.a_favor)}
                <TableCell className="text-right font-semibold tabular-nums">{num(f.saldo)}</TableCell>
              </TableRow>
            ))}
            {datos && datos.filas.length > 0 && (
              <TableRow className="font-semibold">
                <TableCell>Totales</TableCell>
                {celda(datos.totales["0-30"])}
                {celda(datos.totales["31-60"])}
                {celda(datos.totales["61-90"])}
                {celda(datos.totales["mas-90"])}
                <TableCell className="text-right tabular-nums">{num(datos.totales.pendiente)}</TableCell>
                {celda(datos.totales.a_favor)}
                <TableCell className="text-right tabular-nums">{num(datos.totales.saldo)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
