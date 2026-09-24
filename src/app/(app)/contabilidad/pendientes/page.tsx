"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Refresh2, Wallet } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiC, eur, fechaCorta, hoyISO, num } from "@/lib/contabilidad";
import { Cabecera, CajaError, FilaVacia, FilasCarga, Kpi } from "../_ui";

interface Partida {
  linea_id: number;
  asiento_id: number;
  numero: string | null;
  fecha: string;
  asiento_concepto: string;
  origen_tipo: string | null;
  origen_id: string | null;
  debe: number;
  haber: number;
  concepto: string;
  banco_id: number | null;
  aplicado_en: string | null;
  aplicado_por: string | null;
}
interface Banco {
  id: number;
  nombre: string;
}

/** Cobros y pagos cuyo banco no se conoce (van a la cuenta 555 hasta que los apliques a uno). */
export default function PendientesPage() {
  const [pestana, setPestana] = useState("pendientes");
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [saldo, setSaldo] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [bancoId, setBancoId] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [trabajando, setTrabajando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const d = await apiC<{ partidas: Partida[]; bancos: Banco[]; saldo: number }>("pendientes", { query: { estado: pestana === "aplicadas" ? "aplicadas" : "pendientes" } });
      setPartidas(d.partidas);
      setBancos(d.bancos);
      setSaldo(d.saldo);
      setSel(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }, [pestana]);
  useEffect(() => {
    cargar();
  }, [cargar]);

  const nombreBanco = (id: number | null) => bancos.find((b) => b.id === id)?.nombre || "—";
  const elegidas = partidas.filter((p) => sel.has(p.linea_id));
  const totalElegido = elegidas.reduce((s, p) => s + p.debe - p.haber, 0);

  async function aplicar() {
    setTrabajando(true);
    try {
      const r = await apiC<{ numero: string; partidas: number }>("pendientes/aplicar", { metodo: "POST", cuerpo: { lineas: [...sel], banco_id: Number(bancoId), fecha } });
      toast.success(`${r.partidas} partida(s) aplicadas a ${nombreBanco(Number(bancoId))} (${r.numero})`);
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setTrabajando(false);
    }
  }

  const aplicadas = pestana === "aplicadas";
  return (
    <div className="space-y-3 p-6">
      <Cabecera
        icono={<Wallet className="size-4.5" />}
        titulo="Partidas pendientes de aplicar"
        descripcion="Cobros y pagos por transferencia o tarjeta virtual cuyo banco no consta: asígnalos a la cuenta bancaria real"
        acciones={
          <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
        }
      />
      <CajaError mensaje={error} />
      <Tabs value={pestana} onValueChange={(v) => setPestana(String(v))}>
        <TabsList>
          <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
          <TabsTrigger value="aplicadas">Ya aplicadas</TabsTrigger>
        </TabsList>
        <TabsContent value={pestana} className="space-y-3 pt-3">
          {!aplicadas && (
            <div className="grid grid-cols-2 gap-2 sm:max-w-xl">
              <Kpi titulo="Partidas pendientes" valor={String(partidas.length)} color="text-amber-600 dark:text-amber-400" />
              <Kpi titulo="Saldo por aplicar (cobros − pagos)" valor={eur(saldo)} color="" />
            </div>
          )}
          {!aplicadas && sel.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
              <span className="text-sm">
                <strong>{sel.size}</strong> seleccionada(s) · <span className="tabular-nums">{eur(totalElegido)}</span>
              </span>
              <select className="h-8 rounded-md border bg-background px-2 text-sm" value={bancoId} onChange={(e) => setBancoId(e.target.value)} aria-label="Banco">
                <option value="">Banco…</option>
                {bancos.map((b) => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
              <Input type="date" className="h-8 w-40" value={fecha} onChange={(e) => setFecha(e.target.value)} aria-label="Fecha del asiento" />
              <Button size="sm" disabled={trabajando || !bancoId} onClick={aplicar}>Aplicar al banco</Button>
              <span className="text-xs text-muted-foreground">Se crea un asiento nuevo; los originales no se modifican.</span>
            </div>
          )}
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  {!aplicadas && (
                    <TableHead className="w-8">
                      <Checkbox aria-label="Seleccionar todas" checked={partidas.length > 0 && sel.size === partidas.length} onCheckedChange={(c) => setSel(c ? new Set(partidas.map((p) => p.linea_id)) : new Set())} />
                    </TableHead>
                  )}
                  <TableHead>Fecha</TableHead>
                  <TableHead>Asiento</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Cobro</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                  {aplicadas && <TableHead>Banco</TableHead>}
                  {aplicadas && <TableHead>Aplicada</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargando && <FilasCarga columnas={aplicadas ? 7 : 6} />}
                {!cargando && partidas.length === 0 && <FilaVacia columnas={aplicadas ? 7 : 6} texto={aplicadas ? "Todavía no se ha aplicado ninguna partida." : "No hay partidas pendientes. Aparecerán cuando se contabilicen cobros o pagos sin banco."} />}
                {!cargando &&
                  partidas.map((p) => (
                    <TableRow key={p.linea_id}>
                      {!aplicadas && (
                        <TableCell>
                          <Checkbox aria-label={`Seleccionar ${p.numero}`} checked={sel.has(p.linea_id)} onCheckedChange={(c) => setSel((s) => { const n = new Set(s); if (c) n.add(p.linea_id); else n.delete(p.linea_id); return n; })} />
                        </TableCell>
                      )}
                      <TableCell className="tabular-nums">{fechaCorta(p.fecha)}</TableCell>
                      <TableCell className="font-medium tabular-nums">{p.numero}</TableCell>
                      <TableCell className="max-w-md truncate text-sm">{p.asiento_concepto}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.debe ? num(p.debe) : ""}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.haber ? num(p.haber) : ""}</TableCell>
                      {aplicadas && <TableCell>{nombreBanco(p.banco_id)}</TableCell>}
                      {aplicadas && <TableCell className="text-xs text-muted-foreground">{p.aplicado_en ? fechaCorta(p.aplicado_en) : ""}</TableCell>}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
