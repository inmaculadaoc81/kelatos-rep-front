"use client";

import { useCallback, useEffect, useState } from "react";
import { ReceiptItem, Refresh2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiC, eur, fechaCorta, num, type EstadoAsiento } from "@/lib/contabilidad";
import { Cabecera, CajaError, EstadoBadge, FilaVacia, FilasCarga, FiltroFechas, Kpi, rangoAnioActual } from "../_ui";
import { AsientoDialog } from "../asiento-dialog";

interface Doc {
  asiento_id: number;
  numero: string | null;
  fecha: string;
  estado: EstadoAsiento;
  concepto: string;
  tercero: string | null;
  base: number;
  cuota: number;
}
interface Trimestre {
  trimestre: string;
  base_repercutida: number;
  cuota_repercutida: number;
  base_soportada: number;
  cuota_soportada: number;
  resultado: number;
}
interface Iva {
  repercutido: Doc[];
  soportado: Doc[];
  trimestres: Trimestre[];
  totales: { base_repercutida: number; cuota_repercutida: number; base_soportada: number; cuota_soportada: number; resultado: number };
  nota: string;
}

/** Libro de IVA (repercutido y soportado) con el resultado por trimestre. Orientativo: lo presenta la gestoría. */
export default function IvaPage() {
  const [{ desde, hasta }, setRango] = useState(rangoAnioActual);
  const [borradores, setBorradores] = useState(false);
  const [datos, setDatos] = useState<Iva | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detalleId, setDetalleId] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await apiC<Iva>("iva", { query: { desde, hasta, borradores } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, borradores]);
  useEffect(() => {
    cargar();
  }, [cargar]);

  const tabla = (docs: Doc[], vacio: string) => (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Asiento</TableHead>
            <TableHead>Concepto</TableHead>
            <TableHead className="text-right">Base</TableHead>
            <TableHead className="text-right">Cuota IVA</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cargando && !datos && <FilasCarga columnas={5} />}
          {datos && docs.length === 0 && <FilaVacia columnas={5} texto={vacio} />}
          {docs.map((d) => (
            <TableRow key={d.asiento_id} className="cursor-pointer" onClick={() => setDetalleId(d.asiento_id)}>
              <TableCell className="tabular-nums">{fechaCorta(d.fecha)}</TableCell>
              <TableCell className="tabular-nums">
                <span className="mr-1.5 font-medium">{d.numero || `#${d.asiento_id}`}</span>
                {d.estado !== "CONTABILIZADO" && d.estado !== "CERRADO" && <EstadoBadge estado={d.estado} />}
              </TableCell>
              <TableCell className="max-w-md truncate text-sm">{d.concepto}</TableCell>
              <TableCell className="text-right tabular-nums">{num(d.base)}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">{num(d.cuota)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-3 p-6">
      <Cabecera
        icono={<ReceiptItem className="size-4.5" />}
        titulo="Libro de IVA"
        descripcion="IVA repercutido (ventas) y soportado (compras) con el resultado de cada trimestre"
        acciones={
          <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <FiltroFechas desde={desde} hasta={hasta} onChange={(d, h) => setRango({ desde: d, hasta: h })} />
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={borradores} onCheckedChange={(c) => setBorradores(!!c)} /> Incluir borradores y validados
        </label>
      </div>
      <CajaError mensaje={error} />

      {datos && (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Kpi titulo="IVA repercutido" valor={eur(datos.totales.cuota_repercutida)} color="" />
            <Kpi titulo="IVA soportado" valor={eur(datos.totales.cuota_soportada)} color="" />
            <Kpi titulo={datos.totales.resultado >= 0 ? "A ingresar" : "A compensar"} valor={eur(Math.abs(datos.totales.resultado))} color={datos.totales.resultado >= 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"} />
            <Kpi titulo="Base de ventas" valor={eur(datos.totales.base_repercutida)} color="" />
          </div>

          {datos.trimestres.length > 0 && (
            <div className="overflow-x-auto rounded-lg border bg-card sm:max-w-4xl">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trimestre</TableHead>
                    <TableHead className="text-right">Base repercutida</TableHead>
                    <TableHead className="text-right">IVA repercutido</TableHead>
                    <TableHead className="text-right">IVA soportado</TableHead>
                    <TableHead className="text-right">Resultado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datos.trimestres.map((t) => (
                    <TableRow key={t.trimestre}>
                      <TableCell className="font-medium">{t.trimestre}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(t.base_repercutida)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(t.cuota_repercutida)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(t.cuota_soportada)}</TableCell>
                      <TableCell className={`text-right font-semibold tabular-nums ${t.resultado >= 0 ? "" : "text-emerald-600 dark:text-emerald-400"}`}>{num(t.resultado)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <Tabs defaultValue="repercutido">
            <TabsList>
              <TabsTrigger value="repercutido">Repercutido ({datos.repercutido.length})</TabsTrigger>
              <TabsTrigger value="soportado">Soportado ({datos.soportado.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="repercutido" className="pt-3">{tabla(datos.repercutido, "No hay IVA repercutido en este periodo.")}</TabsContent>
            <TabsContent value="soportado" className="pt-3">{tabla(datos.soportado, "No hay IVA soportado en este periodo.")}</TabsContent>
          </Tabs>
          <p className="text-xs text-muted-foreground">{datos.nota}</p>
        </>
      )}
      <AsientoDialog id={detalleId} onClose={() => setDetalleId(null)} onCambio={cargar} onEditar={() => setDetalleId(null)} />
    </div>
  );
}
