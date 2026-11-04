"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Coin1, Refresh2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiC, eur, num } from "@/lib/contabilidad";
import { Cabecera, CajaError, FilaVacia, FilasCarga, InfoVista, Kpi } from "../_ui";
import { EfectivoTransito } from "./efectivo-transito";

interface Movimiento {
  id: number;
  fecha_hora: string;
  importe: number;
  motivo: string;
  tipo: "retirada" | "ingreso";
  usuario: string | null;
  categoria: string | null;
  banco_id: number | null;
  anulada: boolean;
  contabilizado: boolean;
}
interface CobroEfectivo {
  asiento_id: number;
  fecha: string;
  concepto: string;
  origen_tipo: string | null;
  origen_id: string | null;
  estado: string;
  importe: number;
  contabilizado: boolean;
}
const ORIGEN_COBRO: Record<string, string> = { reparaciones: "Reparación", ventas: "Venta", alquileres: "Alquiler", tickets_manuales: "Ticket manual", facturas_manuales: "Factura manual" };
interface Datos {
  movimientos: Movimiento[];
  /** Cobros y devoluciones en efectivo de ventas, reparaciones y alquileres (apuntes de la 570), solo lectura. */
  cobros?: CobroEfectivo[];
  cobrosPendiente?: number;
  categorias: { retirada: string[]; ingreso: string[]; nombres: Record<string, string> };
  bancos: { id: number; nombre: string }[];
  saldoCaja: number;
  /** Cuenta con acceso estrecho a esta página únicamente (ver
      puedeVerEfectivoSoloLectura) — oculta los controles de clasificar,
      que el backend rechazaría de todas formas. */
  soloLectura?: boolean;
}

const ETIQUETA: Record<string, string> = {
  retirada_gasto: "Gasto menor",
  retirada_socio: "Retirada del socio",
  retirada_material: "Compra de material",
  retirada_alimentacion_personal: "Alimentación ocasional del personal",
  retirada_agua_personal: "Agua para consumo del personal",
  retirada_bolsas_embalajes: "Bolsas y embalajes",
  retirada_limpieza: "Productos y útiles de limpieza",
  retirada_publicidad: "Publicidad, banners y carteles promocionales",
  retirada_material_oficina: "Material de oficina",
  deposito_banco: "Retirada para ingreso en banco (efectivo en tránsito)",
  apertura_caja: "Efectivo de apertura (ya estaba en caja)",
  aportacion_socio: "Aportación del socio",
};

/** Retiradas e ingresos de la caja: cada uno necesita un destino contable. */
export default function EfectivoPage() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await apiC<Datos>("efectivo"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => {
    cargar();
  }, [cargar]);

  async function clasificar(m: Movimiento, categoria: string, bancoId?: number | null) {
    if (!categoria) return;
    if (categoria === "deposito_banco" && !bancoId) {
      // Se elige antes el banco: se guarda al escogerlo.
      setDatos((d) => d && { ...d, movimientos: d.movimientos.map((x) => (x.id === m.id ? { ...x, categoria } : x)) });
      return;
    }
    setGuardando(m.id);
    try {
      await apiC(`efectivo/${m.id}`, { metodo: "PUT", cuerpo: { categoria, banco_id: bancoId || null } });
      toast.success("Clasificado");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(null);
    }
  }

  const sinClasificar = datos?.movimientos.filter((m) => !m.anulada && !m.categoria).length ?? 0;
  return (
    <div className="space-y-3 p-6">
      <Cabecera
        icono={<Coin1 className="size-4.5" />}
        titulo="Efectivo y caja"
        descripcion={datos?.soloLectura ? "Solo lectura — consulta de los movimientos de caja" : "Indica el destino de cada retirada o ingreso de caja para poder contabilizarlo"}
        acciones={
          <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
        }
      />
      <InfoVista>Cada retirada o ingreso de dinero en metálico, clasificado por su motivo, para que se contabilice en la cuenta correcta. Ejemplo: una retirada de 200€ para comprar material se marca como «gasto» en vez de como reparto a un socio.</InfoVista>
      <CajaError mensaje={error} />
      {datos && (
        <div className="grid grid-cols-2 gap-2 sm:max-w-3xl sm:grid-cols-4">
          <Kpi titulo="Sin clasificar" valor={String(sinClasificar)} color={sinClasificar ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"} />
          <Kpi titulo="Saldo contable de caja (570)" valor={eur(datos.saldoCaja)} color="" />
          <Kpi titulo="Cobros por contabilizar" valor={eur(datos.cobrosPendiente ?? 0)} color={datos.cobrosPendiente ? "text-amber-600 dark:text-amber-400" : ""} />
          <Kpi titulo="Caja real estimada" valor={eur(datos.saldoCaja + (datos.cobrosPendiente ?? 0))} color="" />
        </div>
      )}
      {datos && <EfectivoTransito soloLectura={!!datos.soloLectura} onCambio={cargar} />}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Destino contable</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && !datos && <FilasCarga columnas={5} />}
            {datos && datos.movimientos.length === 0 && <FilaVacia columnas={5} texto="No hay movimientos de efectivo." />}
            {datos?.movimientos.map((m) => {
              const opciones = m.tipo === "retirada" ? datos.categorias.retirada : datos.categorias.ingreso;
              return (
                <TableRow key={m.id} className={m.anulada ? "opacity-50" : undefined}>
                  <TableCell className="whitespace-nowrap tabular-nums">{m.fecha_hora}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.tipo === "retirada" ? "bg-red-500/15 text-red-700 dark:text-red-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"}`}>{m.tipo === "retirada" ? "Retirada" : "Ingreso"}</span>
                    {m.anulada && <span className="ml-1 text-xs text-muted-foreground">anulada</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{num(m.importe)}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm">{m.motivo}</TableCell>
                  <TableCell>
                    {m.anulada ? null : m.contabilizado || datos.soloLectura ? (
                      m.categoria ? (
                        <span className="text-sm text-muted-foreground">
                          {ETIQUETA[m.categoria] || m.categoria}
                          {m.contabilizado && " · contabilizado"}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 dark:text-amber-400">Sin clasificar</span>
                      )
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <select className="h-8 rounded-md border bg-background px-2 text-sm" disabled={guardando === m.id} value={m.categoria || ""} onChange={(e) => clasificar(m, e.target.value)} aria-label="Destino">
                          <option value="">Elegir destino…</option>
                          {opciones.map((c) => (
                            <option key={c} value={c}>{ETIQUETA[c] || datos.categorias.nombres[c] || c}</option>
                          ))}
                        </select>
                        {m.categoria === "deposito_banco" && (
                          <select className="h-8 rounded-md border bg-background px-2 text-sm" value={m.banco_id || ""} onChange={(e) => clasificar(m, "deposito_banco", Number(e.target.value))} aria-label="Banco">
                            <option value="">Banco…</option>
                            {datos.bancos.map((b) => (
                              <option key={b.id} value={b.id}>{b.nombre}</option>
                            ))}
                          </select>
                        )}
                        {!m.categoria && <span className="text-xs text-amber-600 dark:text-amber-400">Sin clasificar</span>}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {datos && (datos.cobros?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <div>
            <h2 className="text-sm font-semibold">Cobros y devoluciones en efectivo de ventas, reparaciones y alquileres</h2>
            <p className="text-xs text-muted-foreground">Solo lectura. Los marcados «Borrador» ya están en caja pero aún no cuentan en el saldo contable (570) hasta que se contabilicen; por eso «Caja real estimada» = saldo contable + cobros por contabilizar.</p>
          </div>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datos.cobros!.map((c) => (
                  <TableRow key={c.asiento_id}>
                    <TableCell className="whitespace-nowrap tabular-nums">{c.fecha}</TableCell>
                    <TableCell className="text-sm">{ORIGEN_COBRO[c.origen_tipo || ""] || c.origen_tipo || "—"}</TableCell>
                    <TableCell className={`text-right tabular-nums ${c.importe < 0 ? "text-red-600 dark:text-red-400" : ""}`}>{num(c.importe)}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm">
                      <span title={`Asiento nº ${c.asiento_id}`}>{c.concepto}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.contabilizado ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>{c.contabilizado ? "Contabilizado" : "Borrador"}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
