"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Rol = "Cliente" | "Empresa";
interface Acceso { telegram_id: string; nombre: string | null; rol: Rol; activo: boolean }
interface Datos { ok: boolean; origen: "base_de_datos" | "servidor"; accesos: Acceso[] }

const SELECT = "h-9 rounded-md border bg-background px-2 text-sm";

async function llamar(ruta: string, cuerpo?: unknown): Promise<Datos & { error?: string }> {
  const res = await fetch(ruta, cuerpo === undefined ? { cache: "no-store" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || d.ok === false) throw new Error(d.error || `Error ${res.status}`);
  return d;
}

/** Quién puede subir comprobantes al grupo de transferencias de Telegram y con qué rol: Cliente (voucher del cliente) o Empresa (voucher del banco). */
export function AccesosTelegramVista() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [id, setId] = useState("");
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<Rol>("Cliente");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setDatos(await llamar("/api/transferencias/telegram-accesos"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function guardar(a: Partial<Acceso> & { telegram_id: string }, aviso: string) {
    setGuardando(true);
    try {
      await llamar("/api/transferencias/telegram-accesos", a);
      toast.success(aviso);
      await cargar();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
      return false;
    } finally {
      setGuardando(false);
    }
  }

  async function quitar(a: Acceso) {
    if (!window.confirm(`¿Quitar el acceso de ${a.nombre || a.telegram_id}? Dejará de poder subir comprobantes.`)) return;
    try {
      await llamar("/api/transferencias/telegram-accesos/quitar", { telegram_id: a.telegram_id });
      toast.success("Acceso quitado");
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }

  async function anadir() {
    if (await guardar({ telegram_id: id.trim(), nombre: nombre.trim() || null, rol }, "Acceso añadido; ya funciona")) {
      setId("");
      setNombre("");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Accesos de Telegram</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Quién puede subir comprobantes al grupo de transferencias y cómo se registran: <strong>Cliente</strong> = voucher de la transferencia del cliente; <strong>Empresa</strong> = voucher del banco.
          Un número tiene un solo rol. Los cambios valen al instante (sin reiniciar nada) y solo afectan a lo que se suba a partir de ahora.
        </p>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">No se pudo cargar: {error}</div>}
      {datos?.origen === "servidor" && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Esta lista todavía sale de la configuración del servidor. En cuanto hagas el primer cambio aquí, pasa a guardarse en la base de datos (con los mismos accesos de ahora) y desde entonces se gestiona solo desde esta pantalla.
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Nombre</TableHead><TableHead>ID de Telegram</TableHead><TableHead>Rol</TableHead><TableHead>Estado</TableHead><TableHead /></TableRow>
          </TableHeader>
          <TableBody>
            {!datos && !error && <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>}
            {datos?.accesos.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nadie tiene acceso: el bot ignora todos los mensajes.</TableCell></TableRow>}
            {datos?.accesos.map((a) => (
              <TableRow key={a.telegram_id} className={a.activo ? "" : "opacity-50"}>
                <TableCell>
                  <Input
                    defaultValue={a.nombre ?? ""}
                    placeholder="Sin nombre"
                    className="h-8 max-w-56"
                    maxLength={80}
                    onBlur={(e) => { const v = e.target.value.trim(); if (v !== (a.nombre ?? "")) guardar({ telegram_id: a.telegram_id, rol: a.rol, nombre: v || null }, "Nombre guardado"); }}
                  />
                </TableCell>
                <TableCell className="font-mono text-sm tabular-nums">{a.telegram_id}</TableCell>
                <TableCell>
                  <select className={SELECT} value={a.rol} disabled={guardando} onChange={(e) => guardar({ telegram_id: a.telegram_id, rol: e.target.value as Rol }, `Ahora es ${e.target.value}: vale desde ya`)} aria-label="Rol">
                    <option value="Cliente">Cliente</option>
                    <option value="Empresa">Empresa</option>
                  </select>
                </TableCell>
                <TableCell>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={a.activo} disabled={guardando} onChange={(e) => guardar({ telegram_id: a.telegram_id, rol: a.rol, activo: e.target.checked }, e.target.checked ? "Acceso activado" : "Acceso desactivado")} />
                    {a.activo ? "Activo" : "Desactivado"}
                  </label>
                </TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" className="text-destructive" onClick={() => quitar(a)}>Quitar</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2 rounded-lg border bg-card p-3">
        <p className="text-sm font-medium">Añadir un acceso</p>
        <div className="grid gap-2 md:grid-cols-4">
          <Input placeholder="ID de Telegram (solo números)" inputMode="numeric" value={id} onChange={(e) => setId(e.target.value.replace(/\D/g, "").slice(0, 15))} />
          <Input placeholder="Nombre (opcional)" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} />
          <select className={SELECT} value={rol} onChange={(e) => setRol(e.target.value as Rol)} aria-label="Rol del nuevo acceso">
            <option value="Cliente">Cliente (voucher del cliente)</option>
            <option value="Empresa">Empresa (voucher del banco)</option>
          </select>
          <Button onClick={anadir} disabled={guardando || id.length < 5}>{guardando ? "Guardando…" : "Añadir"}</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Cómo saber el ID de una persona: que escriba <code>/miid</code> en el grupo de transferencias y el bot le responde con su ID. El teléfono no sirve: hace falta ese número.
        </p>
      </div>
    </div>
  );
}
