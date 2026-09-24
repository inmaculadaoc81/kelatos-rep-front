"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Add, Hierarchy, Refresh2, SearchNormal1 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiC, type Banco, type Categoria } from "@/lib/contabilidad";
import { Cabecera, CajaError, FilaVacia, FilasCarga, usePlan } from "../_ui";

const TIPOS_CATEGORIA = [
  ["gasto", "Gasto"],
  ["existencias", "Existencias"],
  ["inmovilizado", "Inmovilizado"],
  ["retirada", "Retirada de caja"],
] as const;

export default function PlanPage() {
  const plan = usePlan();
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cuentaNueva, setCuentaNueva] = useState(false);
  const [banco, setBanco] = useState<Partial<Banco> | null>(null);
  const [categoria, setCategoria] = useState<Partial<Categoria> | null>(null);

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase();
    return plan.cuentas.filter((c) => !t || c.codigo.startsWith(t) || c.nombre.toLowerCase().includes(t));
  }, [plan.cuentas, q]);

  async function cambiarCuenta(codigo: string, cambios: { activa?: boolean; imputable?: boolean }) {
    try {
      await apiC(`cuentas/${codigo}`, { metodo: "PUT", cuerpo: cambios });
      plan.recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <div className="space-y-3 p-6">
      <Cabecera
        icono={<Hierarchy className="size-4.5" />}
        titulo="Plan contable"
        descripcion="Plan General Contable español como base, con tus cuentas, bancos y categorías de gasto"
        acciones={
          <Button variant="outline" size="icon" className="size-8" onClick={plan.recargar} title="Actualizar">
            <Refresh2 className="size-4" />
          </Button>
        }
      />
      <CajaError mensaje={error || plan.error} />
      <Tabs defaultValue="cuentas">
        <TabsList>
          <TabsTrigger value="cuentas">Cuentas</TabsTrigger>
          <TabsTrigger value="bancos">Bancos</TabsTrigger>
          <TabsTrigger value="categorias">Categorías de gasto</TabsTrigger>
        </TabsList>

        <TabsContent value="cuentas" className="space-y-3 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative w-full max-w-sm">
              <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por código o nombre…" className="h-8 pl-7" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setCuentaNueva(true)}><Add className="size-4" /> Nueva cuenta</Button>
          </div>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Admite apuntes</TableHead>
                  <TableHead>Activa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!plan.cargado && <FilasCarga columnas={5} />}
                {plan.cargado && filtradas.length === 0 && <FilaVacia columnas={5} texto="Ninguna cuenta coincide." />}
                {filtradas.map((c) => (
                  <TableRow key={c.codigo}>
                    <TableCell className="font-medium tabular-nums" style={{ paddingLeft: `${0.5 + Math.max(0, c.codigo.length - 3) * 0.6}rem` }}>{c.codigo}</TableCell>
                    <TableCell>
                      {c.nombre}
                      {c.origen === "propia" && <span className="ml-2 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">propia</span>}
                    </TableCell>
                    <TableCell className="text-sm capitalize text-muted-foreground">{c.tipo}</TableCell>
                    <TableCell><Switch checked={c.imputable} onCheckedChange={(v) => cambiarCuenta(c.codigo, { imputable: v })} aria-label={`Admite apuntes ${c.codigo}`} /></TableCell>
                    <TableCell><Switch checked={c.activa} onCheckedChange={(v) => cambiarCuenta(c.codigo, { activa: v })} aria-label={`Activa ${c.codigo}`} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="bancos" className="space-y-3 pt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Cada banco tiene su cuenta 572. El alias sirve para reconocer cómo aparece el banco en las operaciones (por ejemplo «la caixa»).</p>
            <Button size="sm" className="gap-1.5" onClick={() => setBanco({ alias: [], activa: true })}><Add className="size-4" /> Nuevo banco</Button>
          </div>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banco</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>IBAN</TableHead>
                  <TableHead>Alias</TableHead>
                  <TableHead>Activo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.bancos.map((b) => (
                  <TableRow key={b.id} className="cursor-pointer" onClick={() => setBanco(b)}>
                    <TableCell className="font-medium">{b.nombre}</TableCell>
                    <TableCell className="tabular-nums">{b.cuenta_codigo}</TableCell>
                    <TableCell className="text-sm tabular-nums">{b.iban || <span className="text-muted-foreground">Sin indicar</span>}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{b.alias.join(", ")}</TableCell>
                    <TableCell>{b.activa ? "Sí" : "No"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="categorias" className="space-y-3 pt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Cada categoría de compra o gasto determina la cuenta contable a la que se imputa.</p>
            <Button size="sm" className="gap-1.5" onClick={() => setCategoria({ tipo: "gasto", activa: true })}><Add className="size-4" /> Nueva categoría</Button>
          </div>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Activa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.categorias.map((c) => (
                  <TableRow key={c.codigo} className="cursor-pointer" onClick={() => setCategoria(c)}>
                    <TableCell><div className="font-medium">{c.nombre}</div><div className="text-xs text-muted-foreground">{c.codigo}</div></TableCell>
                    <TableCell className="text-sm">{TIPOS_CATEGORIA.find((t) => t[0] === c.tipo)?.[1] || c.tipo}</TableCell>
                    <TableCell className="text-sm"><span className="tabular-nums">{c.cuenta_codigo}</span> · {c.cuenta_nombre}</TableCell>
                    <TableCell>{c.activa ? "Sí" : "No"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <CuentaNuevaDialog abierto={cuentaNueva} onClose={() => setCuentaNueva(false)} onGuardado={() => { setCuentaNueva(false); plan.recargar(); }} />
      <BancoDialog banco={banco} onClose={() => setBanco(null)} onGuardado={() => { setBanco(null); plan.recargar(); }} />
      <CategoriaDialog categoria={categoria} cuentas={plan.cuentas.filter((c) => c.imputable && c.activa)} onClose={() => setCategoria(null)} onGuardado={() => { setCategoria(null); plan.recargar(); }} onError={setError} />
    </div>
  );
}

function CuentaNuevaDialog({ abierto, onClose, onGuardado }: { abierto: boolean; onClose: () => void; onGuardado: () => void }) {
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function guardar() {
    setError(null);
    try {
      await apiC("cuentas", { metodo: "POST", cuerpo: { codigo, nombre } });
      toast.success("Cuenta creada");
      setCodigo("");
      setNombre("");
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }
  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Nueva cuenta</DialogTitle>
        <p className="text-sm text-muted-foreground">Código de 3 a 10 dígitos (por ejemplo 62900001). Hereda el tipo de su cuenta padre.</p>
        <Input placeholder="Código" inputMode="numeric" className="tabular-nums" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))} maxLength={10} />
        <Input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={200} />
        <CajaError mensaje={error} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} disabled={codigo.length < 3 || !nombre.trim()}>Crear</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BancoDialog({ banco, onClose, onGuardado }: { banco: Partial<Banco> | null; onClose: () => void; onGuardado: () => void }) {
  const [nombre, setNombre] = useState("");
  const [iban, setIban] = useState("");
  const [alias, setAlias] = useState("");
  const [activa, setActiva] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visto, setVisto] = useState<Partial<Banco> | null>(null);
  if (banco !== visto) {
    setVisto(banco);
    if (banco) {
      setNombre(banco.nombre || "");
      setIban(banco.iban || "");
      setAlias((banco.alias || []).join(", "));
      setActiva(banco.activa !== false);
      setError(null);
    }
  }
  async function guardar() {
    setError(null);
    try {
      const cuerpo = { nombre, iban, alias: alias.split(",").map((a) => a.trim()).filter(Boolean), activa };
      if (banco?.id) await apiC(`bancos/${banco.id}`, { metodo: "PUT", cuerpo });
      else await apiC("bancos", { metodo: "POST", cuerpo });
      toast.success("Banco guardado");
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }
  return (
    <Dialog open={!!banco} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>{banco?.id ? "Editar banco" : "Nuevo banco"}</DialogTitle>
        <Input placeholder="Nombre del banco" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Input placeholder="IBAN (opcional)" className="tabular-nums" value={iban} onChange={(e) => setIban(e.target.value)} />
        <Input placeholder="Alias separados por comas" value={alias} onChange={(e) => setAlias(e.target.value)} />
        <label className="flex items-center gap-2 text-sm"><Switch checked={activa} onCheckedChange={setActiva} /> Activo</label>
        <CajaError mensaje={error} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} disabled={!nombre.trim()}>Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategoriaDialog({ categoria, cuentas, onClose, onGuardado, onError }: { categoria: Partial<Categoria> | null; cuentas: { codigo: string; nombre: string }[]; onClose: () => void; onGuardado: () => void; onError: (m: string | null) => void }) {
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [cuenta, setCuenta] = useState("");
  const [tipo, setTipo] = useState("gasto");
  const [activa, setActiva] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visto, setVisto] = useState<Partial<Categoria> | null>(null);
  if (categoria !== visto) {
    setVisto(categoria);
    if (categoria) {
      setCodigo(categoria.codigo || "");
      setNombre(categoria.nombre || "");
      setCuenta(categoria.cuenta_codigo || "");
      setTipo(categoria.tipo || "gasto");
      setActiva(categoria.activa !== false);
      setError(null);
    }
  }
  async function guardar() {
    setError(null);
    onError(null);
    try {
      await apiC("categorias", { metodo: "PUT", cuerpo: { codigo, nombre, cuenta_codigo: cuenta, tipo, activa } });
      toast.success("Categoría guardada");
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }
  return (
    <Dialog open={!!categoria} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>{categoria?.codigo ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
        <Input placeholder="Código (minúsculas y _)" disabled={!!categoria?.codigo} value={codigo} onChange={(e) => setCodigo(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} />
        <Input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo">
          {TIPOS_CATEGORIA.map(([v, et]) => <option key={v} value={v}>{et}</option>)}
        </select>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={cuenta} onChange={(e) => setCuenta(e.target.value)} aria-label="Cuenta contable">
          <option value="">Cuenta contable…</option>
          {cuentas.map((c) => <option key={c.codigo} value={c.codigo}>{c.codigo} · {c.nombre}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm"><Switch checked={activa} onCheckedChange={setActiva} /> Activa</label>
        <CajaError mensaje={error} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} disabled={!codigo || !nombre.trim() || !cuenta}>Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
