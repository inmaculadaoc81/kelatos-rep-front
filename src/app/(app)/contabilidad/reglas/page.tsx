"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Add, Refresh2, Setting2, Trash } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiC, hoyISO, num, type Regla, type ReglaLinea } from "@/lib/contabilidad";
import { Cabecera, CajaError, usePlan } from "../_ui";
import { Skeleton } from "@/components/ui/skeleton";

const DERIVADAS: [string, string][] = [
  ["", "Cuenta fija"],
  ["tercero", "Subcuenta del cliente/proveedor"],
  ["banco", "Banco de la operación"],
  ["banco_destino", "Banco de destino"],
  ["categoria", "Cuenta de la categoría"],
  ["medio_cobro", "Caja o banco según el medio de pago"],
];
const NOMBRE_DERIVADA = Object.fromEntries(DERIVADAS);
const EXPANSIONES: [string, string][] = [
  ["", "Una línea"],
  ["iva_tipo", "Una por tipo de IVA"],
  ["cobros", "Una por medio de pago"],
];

function ejemploDocumento() {
  return {
    fecha: hoyISO(),
    numero: "EJEMPLO-1",
    tercero: { tipo: "cliente", id: "EJ-1", nombre: "Cliente de ejemplo" },
    categoria: "piezas",
    banco: "BBVA",
    banco_destino: "CaixaBank",
    importes: { base: 100, iva: 21, total: 121, iva_aduana: 21, derechos: 5 },
    iva_desglose: [{ tipo: 21, base: 100, cuota: 21 }],
    cobros: [{ medio: "tarjeta", banco: "BBVA", importe: 121 }],
  };
}

export default function ReglasPage() {
  const plan = usePlan();
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historial, setHistorial] = useState(false);
  const [simulando, setSimulando] = useState<Regla | null>(null);
  const [editando, setEditando] = useState<Regla | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setReglas((await apiC<{ reglas: Regla[] }>("reglas")).reglas);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => {
    cargar();
  }, [cargar]);

  async function activar(r: Regla, activa: boolean) {
    try {
      await apiC(`reglas/${r.id}/activar`, { metodo: "POST", cuerpo: { activa } });
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }

  const visibles = reglas.filter((r) => historial || r.activa);

  return (
    <div className="space-y-3">
      <Cabecera
        icono={<Setting2 className="size-4.5" />}
        titulo="Reglas contables"
        descripcion="Cómo se convierte cada operación en apuntes. Cambiar una regla crea una versión nueva; las anteriores se conservan"
        acciones={
          <>
            <label className="flex cursor-pointer items-center gap-2 text-sm"><Switch checked={historial} onCheckedChange={setHistorial} /> Ver versiones anteriores</label>
            <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar"><Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} /></Button>
          </>
        }
      />
      <CajaError mensaje={error} />
      {cargando && <Skeleton className="h-48 w-full" />}
      <div className="grid gap-3 xl:grid-cols-2">
        {!cargando &&
          visibles.map((r) => (
            <div key={r.id} className={`rounded-lg border bg-card p-3 ${r.activa ? "" : "opacity-70"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{r.nombre} <span className="text-xs font-normal text-muted-foreground">v{r.version}</span></div>
                  <div className="text-xs text-muted-foreground">Evento: {r.tipo_evento} · {r.asientos} asiento(s) generados</div>
                </div>
                <Switch checked={r.activa} onCheckedChange={(v) => activar(r, v)} aria-label={`Regla ${r.nombre} activa`} />
              </div>
              {r.requiere_validacion_gestoria && (
                <div className="mt-2 rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-800 dark:text-amber-200">Confirmar con la gestoría{r.nota ? `: ${r.nota}` : ""}</div>
              )}
              <table className="mt-2 w-full text-sm">
                <tbody>
                  {r.lineas.map((l) => (
                    <tr key={l.orden} className="border-t">
                      <td className="w-14 py-1 text-xs font-medium uppercase text-muted-foreground">{l.lado}</td>
                      <td className="py-1 tabular-nums">{l.cuenta_fija || ""}</td>
                      <td className="py-1 text-muted-foreground">{l.cuenta_derivada ? NOMBRE_DERIVADA[l.cuenta_derivada] : l.descripcion}</td>
                      <td className="py-1 text-right text-xs text-muted-foreground">{l.formula}{l.expandir ? ` × ${l.expandir === "iva_tipo" ? "IVA" : "pagos"}` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setSimulando(r)}>Simular</Button>
                <Button size="sm" variant="outline" onClick={() => setEditando(r)}>Nueva versión…</Button>
              </div>
            </div>
          ))}
      </div>
      <SimuladorDialog regla={simulando} onClose={() => setSimulando(null)} />
      <EditorReglaDialog regla={editando} cuentas={plan.cuentas.filter((c) => c.imputable && c.activa)} onClose={() => setEditando(null)} onGuardado={() => { setEditando(null); cargar(); }} />
    </div>
  );
}

function SimuladorDialog({ regla, onClose }: { regla: Regla | null; onClose: () => void }) {
  const [texto, setTexto] = useState("");
  const [res, setRes] = useState<{ concepto: string; lineas: { cuenta_codigo: string; cuenta_nombre: string; debe: number; haber: number; concepto: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visto, setVisto] = useState<Regla | null>(null);
  if (regla !== visto) {
    setVisto(regla);
    setTexto(JSON.stringify(ejemploDocumento(), null, 2));
    setRes(null);
    setError(null);
  }
  async function simular() {
    setError(null);
    setRes(null);
    try {
      setRes(await apiC("reglas/probar", { metodo: "POST", cuerpo: { tipo_evento: regla!.tipo_evento, payload: JSON.parse(texto) } }));
    } catch (e) {
      setError(e instanceof SyntaxError ? "El documento no es un JSON válido" : e instanceof Error ? e.message : "Error");
    }
  }
  return (
    <Dialog open={!!regla} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] sm:max-w-3xl overflow-y-auto">
        <DialogTitle>Simular «{regla?.nombre}»</DialogTitle>
        <p className="text-sm text-muted-foreground">Prueba con un documento de ejemplo. No se guarda nada.</p>
        <Textarea className="h-56 font-mono text-xs" value={texto} onChange={(e) => setTexto(e.target.value)} spellCheck={false} />
        <div className="flex justify-end"><Button onClick={simular}>Simular asiento</Button></div>
        <CajaError mensaje={error} />
        {res && (
          <table className="w-full text-sm">
            <tbody>
              {res.lineas.map((l, i) => (
                <tr key={i} className="border-t">
                  <td className="py-1 font-medium tabular-nums">{l.cuenta_codigo}</td>
                  <td className="py-1 text-muted-foreground">{l.cuenta_nombre}{l.concepto ? ` · ${l.concepto}` : ""}</td>
                  <td className="w-24 py-1 text-right tabular-nums">{l.debe ? num(l.debe) : ""}</td>
                  <td className="w-24 py-1 text-right tabular-nums">{l.haber ? num(l.haber) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditorReglaDialog({ regla, cuentas, onClose, onGuardado }: { regla: Regla | null; cuentas: { codigo: string; nombre: string }[]; onClose: () => void; onGuardado: () => void }) {
  const [nombre, setNombre] = useState("");
  const [concepto, setConcepto] = useState("");
  const [gestoria, setGestoria] = useState(false);
  const [nota, setNota] = useState("");
  const [lineas, setLineas] = useState<ReglaLinea[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [visto, setVisto] = useState<Regla | null>(null);
  if (regla !== visto) {
    setVisto(regla);
    if (regla) {
      setNombre(regla.nombre);
      setConcepto(regla.concepto);
      setGestoria(regla.requiere_validacion_gestoria);
      setNota(regla.nota || "");
      setLineas(regla.lineas.map((l) => ({ ...l })));
      setError(null);
    }
  }
  const cambiar = (i: number, cambios: Partial<ReglaLinea>) => setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, ...cambios } : l)));

  async function guardar() {
    setError(null);
    try {
      await apiC("reglas", {
        metodo: "POST",
        cuerpo: {
          codigo: regla!.codigo,
          tipo_evento: regla!.tipo_evento,
          nombre,
          concepto,
          requiere_validacion_gestoria: gestoria,
          nota,
          condicion: [],
          lineas: lineas.map((l) => ({ lado: l.lado, cuenta_fija: l.cuenta_fija || null, cuenta_derivada: l.cuenta_derivada || null, expandir: l.expandir || null, formula: l.formula, descripcion: l.descripcion })),
        },
      });
      toast.success("Nueva versión creada y activada");
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <Dialog open={!!regla} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] sm:max-w-4xl overflow-y-auto">
        <DialogTitle>Nueva versión de «{regla?.nombre}»</DialogTitle>
        <p className="text-sm text-muted-foreground">Los asientos ya generados no cambian. La versión nueva se aplicará a las operaciones que se procesen a partir de ahora.</p>
        <datalist id="cuentas-regla">{cuentas.map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}</datalist>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <Input placeholder="Concepto del asiento (usa {numero} y {tercero})" value={concepto} onChange={(e) => setConcepto(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm"><Switch checked={gestoria} onCheckedChange={setGestoria} /> Requiere confirmar con la gestoría</label>
        {gestoria && <Input placeholder="Nota para quien revise el asiento" value={nota} onChange={(e) => setNota(e.target.value)} />}
        <div className="space-y-1.5">
          {lineas.map((l, i) => (
            <div key={i} className="grid grid-cols-2 items-start gap-2 rounded-md border p-2 lg:grid-cols-[6rem_1fr_8rem_10rem_9rem_2rem]">
              <select className="h-9 rounded-md border bg-background px-2 text-sm" value={l.lado} onChange={(e) => cambiar(i, { lado: e.target.value as "debe" | "haber" })} aria-label="Lado">
                <option value="debe">Debe</option><option value="haber">Haber</option>
              </select>
              <select className="h-9 rounded-md border bg-background px-2 text-sm" value={l.cuenta_derivada || ""} onChange={(e) => cambiar(i, { cuenta_derivada: e.target.value || null })} aria-label="Origen de la cuenta">
                {DERIVADAS.map(([v, et]) => <option key={v} value={v}>{et}</option>)}
              </select>
              <Input list="cuentas-regla" placeholder={l.cuenta_derivada === "tercero" ? "Cuenta de control" : "Cuenta"} className="tabular-nums" value={l.cuenta_fija || ""} onChange={(e) => cambiar(i, { cuenta_fija: e.target.value.trim() || null })} />
              <select className="h-9 rounded-md border bg-background px-2 text-sm" value={l.expandir || ""} onChange={(e) => cambiar(i, { expandir: e.target.value || null })} aria-label="Repetición">
                {EXPANSIONES.map(([v, et]) => <option key={v} value={v}>{et}</option>)}
              </select>
              <Input placeholder="Importe (base, iva, total…)" value={l.formula} onChange={(e) => cambiar(i, { formula: e.target.value.toLowerCase().replace(/[^a-z_]/g, "") })} />
              <Button variant="ghost" size="icon" className="size-8" disabled={lineas.length <= 2} onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))} title="Quitar"><Trash className="size-4" /></Button>
              <Input className="col-span-2 lg:col-span-6" placeholder="Descripción de la línea" value={l.descripcion} onChange={(e) => cambiar(i, { descripcion: e.target.value })} />
            </div>
          ))}
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => setLineas((ls) => [...ls, { orden: ls.length + 1, lado: "debe", cuenta_fija: null, cuenta_derivada: null, expandir: null, formula: "total", descripcion: "" }])}>
            <Add className="size-4" /> Añadir línea
          </Button>
        </div>
        <CajaError mensaje={error} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} disabled={!nombre.trim()}>Crear versión</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
