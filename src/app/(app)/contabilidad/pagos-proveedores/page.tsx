"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Wallet } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiC, fechaCorta, hoyISO, num } from "@/lib/contabilidad";
import { Cabecera, CajaError, FilaVacia, FilasCarga, InfoVista, Kpi } from "../_ui";

type Estado = "pendiente" | "realizado" | "contabilizado" | "conciliado" | "verificar";
interface Pago {
  id: number; factura_id: number; fecha: string; importe: number; comision: number; dif_cambio: number; medio: string; medio_nombre: string | null; banco_nombre: string | null;
  tipo: "pago" | "devolucion"; referencia: string | null; numero: string | null; proveedor: string | null; estado: Estado; motivo_verificar: string | null;
  movimiento_id: number | null; liquidacion_id: number | null; asiento_numero: string | null; asiento_estado: string | null; paypal_mov_id: number | null;
}
interface SinDatos { factura_id: number; numero: string | null; fecha: string; forma_pago: string | null; total: number; proveedor: string | null }
interface Medio {
  id: number; tipo: "tarjeta_debito" | "tarjeta_credito" | "paypal"; nombre: string; ultimos4: string | null; banco_id: number | null; banco: string | null; paypal_fuente: string | null;
  tarjeta_id: number | null; tarjeta: string | null; dia_liquidacion: number | null; cuenta_codigo: string | null; activa: boolean; deuda_pendiente: number;
}
interface Banco { id: number; nombre: string }
interface DatosPagos { pagos: Pago[]; sin_datos: SinDatos[]; totales: Partial<Record<Estado, number>>; medios: Medio[]; bancos: Banco[] }
interface Movimiento { id: number; banco: string; fecha: string; importe: number; concepto: string | null }
interface Par { pago: { id: number; fecha: string; importe: number; numero: string | null; proveedor: string | null; tipo: string; medio: string }; movimiento: Movimiento; segura: boolean; pista: boolean }
interface Conciliacion {
  pares: Par[];
  sin_pago: { movimiento: Movimiento; facturas: { id: number; numero: string | null; fecha: string; proveedor: string | null; pendiente: number }[] }[];
  credito: { medio_pago_id: number; nombre: string; total: number; compras: { pago_id: number; fecha: string; importe: number; numero: string | null; proveedor: string | null }[]; movimientos: Movimiento[] }[];
}
interface MovPayPal { id: number; medio_pago_id: number; fecha: string; tipo: string | null; nombre: string | null; bruto: number; tarifa: number; neto: number; divisa: string | null; id_transaccion: string | null; asunto: string | null; pago_id: number | null; es_reembolso: boolean }
interface DatosPayPal { movimientos: MovPayPal[]; sugerencias: { movimiento_id: number; pagos: { id: number; fecha: string; importe: number; numero: string | null; proveedor: string | null }[] }[]; saldos: { medio_pago_id: number; neto: number }[] }
interface Propuesta { asiento_id: number; numero: string | null; estado: string; fecha: string; concepto: string; importe_555: number | null; proveedor: string | null; numero_factura: string | null; forma_pago: string | null; accion: string; propuesta: string }

const ETIQUETA_ESTADO: Record<Estado, { texto: string; clase: string; ayuda: string }> = {
  pendiente: { texto: "Pendiente", clase: "bg-amber-100 text-amber-800", ayuda: "Registrado, pero el cargo aún no está confirmado en el banco: la deuda sigue en la 400 y no hay asiento" },
  realizado: { texto: "Realizado", clase: "bg-sky-100 text-sky-800", ayuda: "Pago firme: genera su asiento al sincronizar" },
  contabilizado: { texto: "Contabilizado", clase: "bg-violet-100 text-violet-800", ayuda: "Su asiento ya está contabilizado" },
  conciliado: { texto: "Conciliado", clase: "bg-emerald-100 text-emerald-800", ayuda: "Vinculado con el extracto, la liquidación de la tarjeta o PayPal" },
  verificar: { texto: "Por verificar", clase: "bg-red-100 text-red-800", ayuda: "Faltan datos del medio de pago: no genera asiento hasta completarlos" },
};
const ETIQUETA_MEDIO: Record<string, string> = { transferencia: "Transferencia", paypal: "PayPal", tarjeta_debito: "Tarjeta de débito", tarjeta_credito: "Tarjeta de crédito", efectivo: "Efectivo", tarjeta: "Tarjeta", otro: "Otro" };
const TABS = [["pagos", "Pagos"], ["conciliacion", "Conciliación"], ["medios", "Medios de pago"], ["paypal", "PayPal"], ["revision", "Revisión 555"]] as const;
type Tab = (typeof TABS)[number][0];
const CLASE_SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm";

function EstadoPago({ e }: { e: Estado }) {
  const x = ETIQUETA_ESTADO[e];
  return <span title={x.ayuda} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${x.clase}`}>{x.texto}</span>;
}

/** Pagos de facturas de proveedor: tres medios (transferencia, PayPal y tarjeta de débito o crédito), cada uno a su cuenta real y conciliado sin duplicar. */
export default function PagosProveedoresPage() {
  const [tab, setTab] = useState<Tab>("pagos");
  return (
    <div className="space-y-4">
      <Cabecera
        icono={<Wallet className="size-5" />}
        titulo="Pagos a proveedores"
        descripcion="Cada pago va a su cuenta real (banco, tarjeta o PayPal) y se concilia con el extracto sin duplicarse. Nunca se manda a la 555: si faltan datos, queda por verificar."
      />
      <InfoVista>
        Reglas: <strong>transferencia</strong> o <strong>débito</strong> confirmados → Debe 400 / Haber 572 (sin confirmar, la deuda sigue en la 400 y no hay asiento). <strong>Tarjeta de crédito</strong> → Debe 400 / Haber deuda de esa tarjeta, que cancela la liquidación del banco.
        <strong> PayPal</strong> → su propia subcuenta (57200101) si paga con saldo, o el banco o la tarjeta de donde salen realmente los fondos (nunca dos veces).
      </InfoVista>
      <div className="flex flex-wrap gap-1 border-b">
        {TABS.map(([id, texto]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`-mb-px rounded-t-md border-b-2 px-3 py-1.5 text-sm ${tab === id ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{texto}</button>
        ))}
      </div>
      {tab === "pagos" && <TabPagos />}
      {tab === "conciliacion" && <TabConciliacion />}
      {tab === "medios" && <TabMedios />}
      {tab === "paypal" && <TabPayPal />}
      {tab === "revision" && <TabRevision />}
    </div>
  );
}

// ── Pagos ────────────────────────────────────────────────────────────────

function TabPagos() {
  const [datos, setDatos] = useState<DatosPagos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"" | Estado>("");
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setDatos(await apiC<DatosPagos>("pagos-proveedores"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function accion(ruta: string, mensaje: string, cuerpo?: unknown) {
    try {
      await apiC(ruta, { metodo: "POST", cuerpo: cuerpo ?? {} });
      toast.success(mensaje);
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }

  const filas = (datos?.pagos ?? []).filter((p) => !filtro || p.estado === filtro);
  const t = datos?.totales ?? {};
  return (
    <div className="space-y-4">
      <CajaError mensaje={error} />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {(Object.keys(ETIQUETA_ESTADO) as Estado[]).map((e) => (
          <Kpi key={e} titulo={ETIQUETA_ESTADO[e].texto} valor={String(t[e] ?? 0)} color={e === "verificar" ? "text-red-600" : e === "pendiente" ? "text-amber-600" : "text-foreground"} activo={filtro === e} onClick={() => setFiltro(filtro === e ? "" : e)} />
        ))}
      </div>
      <div className="max-h-[60vh] overflow-auto rounded-lg border bg-card">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_var(--border)]">
            <TableRow>
              <TableHead>Fecha</TableHead><TableHead>Factura</TableHead><TableHead>Medio</TableHead>
              <TableHead className="text-right">Importe</TableHead><TableHead>Estado</TableHead><TableHead>Asiento</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && <FilasCarga columnas={7} />}
            {!cargando && filas.length === 0 && <FilaVacia columnas={7} texto="No hay pagos registrados con este filtro. Se registran desde «Compras y pagos»." />}
            {filas.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="tabular-nums">{fechaCorta(p.fecha)}</TableCell>
                <TableCell><div>{p.numero || `#${p.factura_id}`}</div><div className="text-xs text-muted-foreground">{p.proveedor}</div></TableCell>
                <TableCell>
                  <div>{p.tipo === "devolucion" ? "Devolución · " : ""}{p.medio_nombre || ETIQUETA_MEDIO[p.medio] || p.medio}</div>
                  <div className="text-xs text-muted-foreground">{p.banco_nombre || ""}{p.comision > 0 ? ` · comisión ${num(p.comision)} €` : ""}{p.dif_cambio ? ` · dif. cambio ${num(p.dif_cambio)} €` : ""}</div>
                  {p.motivo_verificar && <div className="text-xs text-red-600">Por verificar: {p.motivo_verificar}</div>}
                </TableCell>
                <TableCell className="text-right tabular-nums">{p.tipo === "devolucion" ? "−" : ""}{num(p.importe)} €</TableCell>
                <TableCell><EstadoPago e={p.estado} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.asiento_numero ? `${p.asiento_numero} · ${p.asiento_estado?.toLowerCase()}` : "—"}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {p.estado === "pendiente" && <Button size="sm" variant="outline" onClick={() => accion(`pagos-proveedores/${p.id}/confirmar`, "Cargo confirmado: se contabilizará al sincronizar")}>Confirmar cargo</Button>}
                  {p.movimiento_id && p.estado === "conciliado" && <Button size="sm" variant="ghost" onClick={() => accion(`pagos-proveedores/${p.id}/desconciliar`, "Conciliación deshecha")}>Deshacer</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {(datos?.sin_datos.length ?? 0) > 0 && (!filtro || filtro === "verificar") && (
        <div className="space-y-2 rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-900 dark:bg-red-950/20">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">Facturas que el Libro de Compras da por pagadas, sin banco, tarjeta ni PayPal ({datos!.sin_datos.length})</p>
          <p className="text-xs text-muted-foreground">No generan asiento de pago. Regístralas en <Link className="underline" href="/contabilidad/compras">Compras y pagos</Link> con su medio real.</p>
          <ul className="space-y-1 text-sm">
            {datos!.sin_datos.map((f) => (
              <li key={f.factura_id} className="flex flex-wrap justify-between gap-2">
                <span>{f.numero || `#${f.factura_id}`} · {f.proveedor} · {fechaCorta(f.fecha)} · «{f.forma_pago || "sin medio"}»</span>
                <span className="tabular-nums">{num(f.total)} €</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Conciliación ─────────────────────────────────────────────────────────

function TabConciliacion() {
  const [datos, setDatos] = useState<Conciliacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<Record<number, Set<number>>>({});
  const [movLiq, setMovLiq] = useState<Record<number, string>>({});
  const cargar = useCallback(async () => {
    try {
      setDatos(await apiC<Conciliacion>("pagos-proveedores/conciliacion"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function accion(ruta: string, mensaje: string, cuerpo: unknown) {
    try {
      await apiC(ruta, { metodo: "POST", cuerpo });
      toast.success(mensaje);
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }
  const seguras = (datos?.pares ?? []).filter((p) => p.segura).length;
  const Mov = ({ m }: { m: Movimiento }) => <div><div className="tabular-nums">{fechaCorta(m.fecha)} · {m.banco} · {num(m.importe)} €</div><div className="max-w-md truncate text-xs text-muted-foreground" title={m.concepto ?? ""}>{m.concepto}</div></div>;

  return (
    <div className="space-y-6">
      <CajaError mensaje={error} />
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Pagos ↔ movimientos del extracto</h2>
          <Button size="sm" disabled={!seguras} onClick={() => accion("pagos-proveedores/conciliar-seguras", "Coincidencias seguras conciliadas", {})}>Conciliar las {seguras} seguras</Button>
        </div>
        <p className="text-xs text-muted-foreground">«Segura»: un único candidato por ambos lados, mismo banco e importe, y el concepto cita la factura o al proveedor. Al importar un extracto se aplican solas; el resto lo confirmas tú.</p>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Pago</TableHead><TableHead>Movimiento del banco</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {!datos && <FilasCarga columnas={3} />}
              {datos && datos.pares.length === 0 && <FilaVacia columnas={3} texto="No hay pagos pendientes de conciliar con movimientos del extracto." />}
              {datos?.pares.map((p) => (
                <TableRow key={`${p.pago.id}-${p.movimiento.id}`}>
                  <TableCell><div>{p.pago.tipo === "devolucion" ? "Devolución · " : ""}{p.pago.numero} · {p.pago.proveedor}</div><div className="text-xs text-muted-foreground tabular-nums">{fechaCorta(p.pago.fecha)} · {num(p.pago.importe)} € · {ETIQUETA_MEDIO[p.pago.medio] || p.pago.medio}</div></TableCell>
                  <TableCell><Mov m={p.movimiento} /></TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <span className={`mr-2 rounded-full px-2 py-0.5 text-xs ${p.segura ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{p.segura ? "Segura" : "Posible"}</span>
                    <Button size="sm" variant="outline" onClick={() => accion("pagos-proveedores/conciliar", "Pago conciliado", { pago_id: p.pago.id, movimiento_id: p.movimiento.id })}>Conciliar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Cargos del banco sin pago anotado</h2>
        <p className="text-xs text-muted-foreground">Cargos cuyo importe coincide con lo pendiente de una factura validada. Al crear el pago se genera su asiento (D 400 / H 572) y el movimiento queda conciliado.</p>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Movimiento del banco</TableHead><TableHead>Factura posible</TableHead></TableRow></TableHeader>
            <TableBody>
              {datos && datos.sin_pago.length === 0 && <FilaVacia columnas={2} texto="No hay cargos pendientes que cuadren con una factura." />}
              {datos?.sin_pago.map((x) => (
                <TableRow key={x.movimiento.id}>
                  <TableCell><Mov m={x.movimiento} /></TableCell>
                  <TableCell className="space-y-1">
                    {x.facturas.map((f) => (
                      <div key={f.id} className="flex items-center justify-between gap-2">
                        <span className="text-sm">{f.numero} · {f.proveedor} · {fechaCorta(f.fecha)} · {num(f.pendiente)} €</span>
                        <Button size="sm" variant="outline" onClick={() => accion("pagos-proveedores/desde-movimiento", "Pago creado y conciliado", { movimiento_id: x.movimiento.id, factura_id: f.id, medio: "transferencia" })}>Es transferencia</Button>
                      </div>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Liquidación de tarjetas de crédito</h2>
        <p className="text-xs text-muted-foreground">Selecciona las compras que cubre la liquidación (pueden ser varias). Se registra Debe deuda de la tarjeta / Haber banco; si eliges el cargo del extracto, queda conciliado.</p>
        {datos && datos.credito.length === 0 && <p className="text-sm text-muted-foreground">No hay compras con tarjeta de crédito pendientes de liquidar.</p>}
        {datos?.credito.map((t) => {
          const elegidas = sel[t.medio_pago_id] ?? new Set<number>();
          const suma = t.compras.filter((c) => elegidas.has(c.pago_id)).reduce((s, c) => s + c.importe, 0);
          return (
            <div key={t.medio_pago_id} className="space-y-2 rounded-lg border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{t.nombre} · pendiente de liquidar {num(t.total)} €</span>
                <Button size="sm" variant="ghost" onClick={() => setSel({ ...sel, [t.medio_pago_id]: new Set(t.compras.map((c) => c.pago_id)) })}>Seleccionar todas</Button>
              </div>
              <ul className="space-y-1 text-sm">
                {t.compras.map((c) => (
                  <li key={c.pago_id}>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={elegidas.has(c.pago_id)} onChange={(e) => { const n = new Set(elegidas); if (e.target.checked) n.add(c.pago_id); else n.delete(c.pago_id); setSel({ ...sel, [t.medio_pago_id]: n }); }} />
                      <span className="flex-1">{fechaCorta(c.fecha)} · {c.numero} · {c.proveedor}</span>
                      <span className="tabular-nums">{num(c.importe)} €</span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-2">
                <select className={`${CLASE_SELECT} max-w-sm`} value={movLiq[t.medio_pago_id] ?? ""} onChange={(e) => setMovLiq({ ...movLiq, [t.medio_pago_id]: e.target.value })} aria-label="Cargo del banco">
                  <option value="">Sin vincular a un cargo del extracto (indicar fecha)</option>
                  {t.movimientos.map((m) => <option key={m.id} value={m.id}>{fechaCorta(m.fecha)} · {num(m.importe)} € · {m.concepto?.slice(0, 40)}</option>)}
                </select>
                <span className="text-sm tabular-nums">Selección: {num(suma)} €</span>
                <Button size="sm" disabled={elegidas.size === 0} onClick={() => accion("pagos-proveedores/liquidar-tarjeta", "Liquidación registrada", { medio_pago_id: t.medio_pago_id, pago_ids: [...elegidas], movimiento_id: movLiq[t.medio_pago_id] ? Number(movLiq[t.medio_pago_id]) : undefined, fecha: hoyISO() })}>Liquidar</Button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

// ── Medios de pago ───────────────────────────────────────────────────────

function TabMedios() {
  const [datos, setDatos] = useState<{ medios: Medio[] } | null>(null);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tipo, setTipo] = useState<Medio["tipo"]>("tarjeta_debito");
  const [nombre, setNombre] = useState("");
  const [ultimos4, setUltimos4] = useState("");
  const [bancoId, setBancoId] = useState("");
  const [fuente, setFuente] = useState("saldo");
  const [tarjetaId, setTarjetaId] = useState("");
  const [dia, setDia] = useState("");
  const [guardando, setGuardando] = useState(false);
  const cargar = useCallback(async () => {
    try {
      setDatos(await apiC<{ medios: Medio[] }>("pagos-proveedores/medios"));
      setBancos((await apiC<DatosPagos>("pagos-proveedores")).bancos);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function crear() {
    setGuardando(true);
    try {
      await apiC("pagos-proveedores/medios", {
        metodo: "POST",
        cuerpo: { tipo, nombre, ultimos4: ultimos4 || null, banco_id: bancoId ? Number(bancoId) : null, paypal_fuente: tipo === "paypal" ? fuente : null, tarjeta_id: tipo === "paypal" && fuente === "tarjeta" && tarjetaId ? Number(tarjetaId) : null, dia_liquidacion: tipo === "tarjeta_credito" && dia ? Number(dia) : null },
      });
      toast.success("Medio de pago creado");
      setNombre(""); setUltimos4(""); setBancoId(""); setDia("");
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(false);
    }
  }
  async function activar(m: Medio) {
    try {
      await apiC(`pagos-proveedores/medios/${m.id}`, { metodo: "PUT", cuerpo: { nombre: m.nombre, ultimos4: m.ultimos4, activa: !m.activa, dia_liquidacion: m.dia_liquidacion, banco_id: m.banco_id } });
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }
  const tarjetas = (datos?.medios ?? []).filter((m) => m.tipo !== "paypal" && m.activa);
  const necesitaBanco = tipo !== "paypal" || fuente === "banco";
  return (
    <div className="space-y-4">
      <CajaError mensaje={error} />
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Tipo</TableHead><TableHead>Banco / origen de fondos</TableHead><TableHead>Cuenta</TableHead><TableHead className="text-right">Deuda pendiente</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {datos && datos.medios.length === 0 && <FilaVacia columnas={6} texto="Todavía no hay tarjetas ni cuentas PayPal. Créalas abajo: sin ellas no se pueden registrar pagos con tarjeta o PayPal." />}
            {datos?.medios.map((m) => (
              <TableRow key={m.id} className={m.activa ? "" : "opacity-50"}>
                <TableCell>{m.nombre}{m.ultimos4 ? ` ·· ${m.ultimos4}` : ""}</TableCell>
                <TableCell>{ETIQUETA_MEDIO[m.tipo]}{m.dia_liquidacion ? ` (liquida el día ${m.dia_liquidacion})` : ""}</TableCell>
                <TableCell className="text-sm">{m.tipo === "paypal" ? (m.paypal_fuente === "saldo" ? "Saldo de PayPal" : m.paypal_fuente === "banco" ? `Banco ${m.banco}` : `Tarjeta ${m.tarjeta}`) : m.banco}</TableCell>
                <TableCell className="tabular-nums text-xs">{m.cuenta_codigo || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{m.tipo === "tarjeta_credito" ? `${num(m.deuda_pendiente)} €` : "—"}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => activar(m)}>{m.activa ? "Desactivar" : "Activar"}</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-2 rounded-lg border bg-card p-3">
        <p className="text-sm font-medium">Añadir tarjeta o cuenta PayPal</p>
        <div className="grid gap-2 md:grid-cols-3">
          <select className={CLASE_SELECT} value={tipo} onChange={(e) => setTipo(e.target.value as Medio["tipo"])} aria-label="Tipo">
            <option value="tarjeta_debito">Tarjeta de débito</option>
            <option value="tarjeta_credito">Tarjeta de crédito</option>
            <option value="paypal">PayPal</option>
          </select>
          <Input placeholder="Nombre (p. ej. Visa Santander)" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} />
          {tipo !== "paypal" && <Input placeholder="Últimos 4 dígitos" inputMode="numeric" value={ultimos4} onChange={(e) => setUltimos4(e.target.value.replace(/\D/g, "").slice(0, 4))} />}
          {tipo === "paypal" && (
            <select className={CLASE_SELECT} value={fuente} onChange={(e) => setFuente(e.target.value)} aria-label="Origen de los fondos">
              <option value="saldo">Paga con el saldo de PayPal</option>
              <option value="banco">PayPal carga a una cuenta bancaria</option>
              <option value="tarjeta">PayPal carga a una tarjeta</option>
            </select>
          )}
          {necesitaBanco && (
            <select className={CLASE_SELECT} value={bancoId} onChange={(e) => setBancoId(e.target.value)} aria-label="Banco">
              <option value="">{tipo === "tarjeta_credito" ? "Banco que carga la liquidación" : tipo === "tarjeta_debito" ? "Banco de la cuenta" : "Banco vinculado"}</option>
              {bancos.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
          )}
          {tipo === "paypal" && fuente === "tarjeta" && (
            <select className={CLASE_SELECT} value={tarjetaId} onChange={(e) => setTarjetaId(e.target.value)} aria-label="Tarjeta vinculada">
              <option value="">Tarjeta vinculada</option>
              {tarjetas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          )}
          {tipo === "tarjeta_credito" && <Input placeholder="Día del mes en que se carga" inputMode="numeric" value={dia} onChange={(e) => setDia(e.target.value.replace(/\D/g, "").slice(0, 2))} />}
        </div>
        <Button onClick={crear} disabled={guardando || !nombre.trim()}>{guardando ? "Guardando…" : "Añadir"}</Button>
      </div>
    </div>
  );
}

// ── PayPal ───────────────────────────────────────────────────────────────

function TabPayPal() {
  const [medios, setMedios] = useState<Medio[]>([]);
  const [medioId, setMedioId] = useState("");
  const [datos, setDatos] = useState<DatosPayPal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const cargar = useCallback(async () => {
    try {
      const m = (await apiC<{ medios: Medio[] }>("pagos-proveedores/medios")).medios.filter((x) => x.tipo === "paypal" && x.activa);
      setMedios(m);
      setMedioId((actual) => actual || (m[0] ? String(m[0].id) : ""));
      setDatos(await apiC<DatosPayPal>("pagos-proveedores/paypal"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function importar(file: File) {
    setImportando(true);
    try {
      const texto = await file.text();
      const r = await apiC<{ nuevos: number; repetidos: number }>("pagos-proveedores/paypal/importar", { metodo: "POST", cuerpo: { medio_pago_id: Number(medioId), texto } });
      toast.success(`${r.nuevos} movimientos nuevos; ${r.repetidos} ya estaban (no se duplican)`);
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setImportando(false);
    }
  }
  async function vincular(movimiento_id: number, pago_id?: number) {
    try {
      await apiC("pagos-proveedores/paypal/vincular", { metodo: "POST", cuerpo: { movimiento_id, pago_id } });
      toast.success(pago_id ? "Movimiento vinculado al pago" : "Vínculo quitado");
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }
  const sug = useMemo(() => new Map((datos?.sugerencias ?? []).map((s) => [s.movimiento_id, s.pagos])), [datos]);
  const saldo = datos?.saldos.find((s) => String(s.medio_pago_id) === medioId)?.neto ?? 0;
  const filas = (datos?.movimientos ?? []).filter((m) => !medioId || String(m.medio_pago_id) === medioId);
  return (
    <div className="space-y-4">
      <CajaError mensaje={error} />
      {medios.length === 0 ? (
        <p className="text-sm text-muted-foreground">Primero da de alta tu cuenta PayPal en «Medios de pago».</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <select className={`${CLASE_SELECT} max-w-xs`} value={medioId} onChange={(e) => setMedioId(e.target.value)} aria-label="Cuenta PayPal">
              {medios.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
            <label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
              {importando ? "Importando…" : "Importar informe de actividad (CSV)"}
              <input type="file" accept=".csv,text/csv" className="hidden" disabled={importando} onChange={(e) => { const f = e.target.files?.[0]; if (f) importar(f); e.target.value = ""; }} />
            </label>
            <span className="text-sm text-muted-foreground">Saldo según el informe: <strong className="text-foreground tabular-nums">{num(saldo)} €</strong></span>
          </div>
          <p className="text-xs text-muted-foreground">Descarga en PayPal: Informes → Actividad → CSV. Reimportar el mismo informe no duplica nada. Vincular un movimiento con su pago lo concilia; las comisiones y reembolsos del informe se ven aquí y se anotan en el pago.</p>
          <div className="max-h-[55vh] overflow-auto rounded-lg border bg-card">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_var(--border)]"><TableRow><TableHead>Fecha</TableHead><TableHead>Movimiento</TableHead><TableHead className="text-right">Bruto</TableHead><TableHead className="text-right">Tarifa</TableHead><TableHead className="text-right">Neto</TableHead><TableHead>Pago</TableHead></TableRow></TableHeader>
              <TableBody>
                {datos && filas.length === 0 && <FilaVacia columnas={6} texto="Todavía no has importado ningún informe de PayPal." />}
                {filas.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="tabular-nums">{fechaCorta(m.fecha)}</TableCell>
                    <TableCell><div>{m.nombre || m.tipo}{m.es_reembolso ? " · reembolso" : ""}</div><div className="max-w-sm truncate text-xs text-muted-foreground">{m.tipo}{m.asunto ? ` · ${m.asunto}` : ""}</div></TableCell>
                    <TableCell className="text-right tabular-nums">{num(m.bruto)}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.tarifa ? num(m.tarifa) : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(m.neto)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {m.pago_id ? <>Pago #{m.pago_id} <Button size="sm" variant="ghost" onClick={() => vincular(m.id)}>Quitar</Button></> : (sug.get(m.id) ?? []).map((p) => (
                        <Button key={p.id} size="sm" variant="outline" className="mr-1" onClick={() => vincular(m.id, p.id)} title={`${p.proveedor} · ${fechaCorta(p.fecha)}`}>Vincular a {p.numero || `#${p.id}`}</Button>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Revisión de la 555 ───────────────────────────────────────────────────

function TabRevision() {
  const [datos, setDatos] = useState<{ total: number; importe: number; propuestas: Propuesta[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    apiC<{ total: number; importe: number; propuestas: Propuesta[] }>("pagos-proveedores/revision-555").then(setDatos).catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, []);
  return (
    <div className="space-y-3">
      <CajaError mensaje={error} />
      <p className="text-sm text-muted-foreground">Pagos de facturas de proveedor que se contabilizaron en la 555. Aquí solo se <strong>proponen</strong> las correcciones: no se modifica ningún asiento ni periodo cerrado.</p>
      {datos && <p className="text-sm">{datos.total} asiento{datos.total === 1 ? "" : "s"} · {num(datos.importe)} € en la 555</p>}
      {datos && datos.propuestas.length === 0 && <p className="text-sm text-emerald-700">No hay pagos de compras en la 555.</p>}
      {datos?.propuestas.map((p) => (
        <div key={p.asiento_id} className="space-y-1 rounded-lg border bg-card p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{p.numero || `#${p.asiento_id}`} · {p.concepto}</span>
            <span className="tabular-nums">{num(p.importe_555 ?? 0)} € · {fechaCorta(p.fecha)} · {p.estado.toLowerCase()}</span>
          </div>
          <div className="text-xs text-muted-foreground">Factura {p.numero_factura} · {p.proveedor} · el Libro dice «{p.forma_pago || "sin medio"}»</div>
          <p>{p.propuesta}</p>
          <Link className="text-xs text-primary underline" href="/contabilidad/asientos">Abrir en Asientos</Link>
        </div>
      ))}
    </div>
  );
}
