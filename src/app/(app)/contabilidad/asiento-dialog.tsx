"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiC, fechaCorta, hoyISO, num, type DetalleAsiento } from "@/lib/contabilidad";
import { CajaError, EstadoBadge } from "./_ui";

const ACCIONES: Record<string, string> = {
  "asiento.generar": "Generado por el motor",
  "asiento.crear_manual": "Creado a mano",
  "asiento.editar_borrador": "Borrador editado",
  "asiento.validar": "Validado",
  "asiento.devolver_borrador": "Devuelto a borrador",
  "asiento.contabilizar": "Contabilizado",
  "asiento.revertir": "Revertido con contra-asiento",
};

export function AsientoDialog({ id, onClose, onCambio, onEditar }: { id: number | null; onClose: () => void; onCambio: () => void; onEditar: (d: DetalleAsiento) => void }) {
  const [d, setD] = useState<DetalleAsiento | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [revirtiendo, setRevirtiendo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [fechaRev, setFechaRev] = useState(hoyISO());
  const [verEvento, setVerEvento] = useState(false);

  const cargar = useCallback(async () => {
    if (id == null) return;
    setError(null);
    try {
      setD(await apiC<DetalleAsiento>(`asientos/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }, [id]);

  useEffect(() => {
    setD(null);
    setRevirtiendo(false);
    setMotivo("");
    setVerEvento(false);
    cargar();
  }, [cargar]);

  async function ejecutar(ruta: string, cuerpo: unknown, ok: string) {
    setTrabajando(true);
    setError(null);
    try {
      await apiC(`asientos/${id}/${ruta}`, { metodo: "POST", cuerpo });
      toast.success(ok);
      onCambio();
      if (ruta === "eliminar") return onClose();
      setRevirtiendo(false);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setTrabajando(false);
    }
  }

  const a = d?.asiento;
  const totalDebe = d?.lineas.reduce((s, l) => s + l.debe, 0) ?? 0;
  const totalHaber = d?.lineas.reduce((s, l) => s + l.haber, 0) ?? 0;
  const posteado = a?.estado === "CONTABILIZADO" || a?.estado === "CERRADO";

  return (
    <Dialog open={id != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] sm:max-w-3xl overflow-y-auto">
        <DialogTitle className="flex flex-wrap items-center gap-2">
          {a ? (a.numero ? a.numero : `Borrador #${a.id}`) : "Asiento"}
          {a && <EstadoBadge estado={a.estado} />}
        </DialogTitle>
        <CajaError mensaje={error} />
        {!d && !error && <Skeleton className="h-40 w-full" />}
        {d && a && (
          <div className="space-y-3">
            <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <div><span className="text-muted-foreground">Fecha: </span>{fechaCorta(a.fecha)}</div>
              <div><span className="text-muted-foreground">Tipo: </span>{a.tipo}</div>
              <div className="sm:col-span-2"><span className="text-muted-foreground">Concepto: </span>{a.concepto}</div>
              {a.origen_id && <div><span className="text-muted-foreground">Origen: </span>{a.origen_tipo} · {a.origen_id}</div>}
              {a.creado_por && <div><span className="text-muted-foreground">Creado por: </span>{a.creado_por}</div>}
              {d.revertidoPor && <div className="text-amber-600 sm:col-span-2 dark:text-amber-400">Revertido por {d.revertidoPor.numero}</div>}
              {a.reversa_de && <div className="sm:col-span-2 text-muted-foreground">Contra-asiento del asiento #{a.reversa_de}</div>}
            </div>

            {d.regla?.requiere_validacion_gestoria && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                <strong>Consultar con la gestoría:</strong> {d.regla.nota || "El tratamiento fiscal de esta operación debe confirmarse."}
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Debe</TableHead>
                    <TableHead className="text-right">Haber</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.lineas.map((l) => (
                    <TableRow key={l.orden}>
                      <TableCell>
                        <div className="font-medium tabular-nums">{l.subcuenta_codigo || l.cuenta_codigo}</div>
                        <div className="text-xs text-muted-foreground">{l.subcuenta_nombre ? `${l.cuenta_nombre} · ${l.subcuenta_nombre}` : l.cuenta_nombre}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.concepto}</TableCell>
                      <TableCell className="text-right tabular-nums">{l.debe ? num(l.debe) : ""}</TableCell>
                      <TableCell className="text-right tabular-nums">{l.haber ? num(l.haber) : ""}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold">
                    <TableCell colSpan={2} className="text-right">Totales</TableCell>
                    <TableCell className="text-right tabular-nums">{num(totalDebe)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(totalHaber)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {d.regla && (
              <p className="text-xs text-muted-foreground">
                Regla aplicada: {d.regla.nombre} (v{d.regla.version}).{" "}
                {d.evento && (
                  <button type="button" className="underline underline-offset-2" onClick={() => setVerEvento((v) => !v)}>
                    {verEvento ? "Ocultar" : "Ver"} documento de origen
                  </button>
                )}
              </p>
            )}
            {verEvento && d.evento && <pre className="max-h-56 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(d.evento.payload, null, 2)}</pre>}

            {d.auditoria.length > 0 && (
              <div className="space-y-0.5 text-xs text-muted-foreground">
                {d.auditoria.map((x, i) => (
                  <div key={i}>
                    {new Date(x.ts).toLocaleString("es-ES")} · {ACCIONES[x.accion] || x.accion}
                    {x.usuario ? ` · ${x.usuario}` : ""}
                  </div>
                ))}
              </div>
            )}

            {revirtiendo && (
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm">Se creará un contra-asiento con los importes invertidos. El original no se modifica.</p>
                <div className="flex flex-wrap gap-2">
                  <Input placeholder="Motivo (obligatorio, mín. 5 caracteres)" className="min-w-64 flex-1" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                  <Input type="date" className="w-40" value={fechaRev} onChange={(e) => setFechaRev(e.target.value)} aria-label="Fecha del contra-asiento" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={trabajando || motivo.trim().length < 5} onClick={() => ejecutar("revertir", { motivo, fecha: fechaRev }, "Contra-asiento creado")}>Crear contra-asiento</Button>
                  <Button size="sm" variant="ghost" onClick={() => setRevirtiendo(false)}>Cancelar</Button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              {a.estado === "BORRADOR" && (
                <>
                  <Button variant="outline" size="sm" disabled={trabajando} onClick={() => ejecutar("eliminar", {}, "Borrador eliminado")}>Eliminar</Button>
                  <Button variant="outline" size="sm" disabled={trabajando} onClick={() => onEditar(d)}>Editar</Button>
                  <Button size="sm" disabled={trabajando} onClick={() => ejecutar("validar", {}, "Asiento validado")}>Validar</Button>
                </>
              )}
              {a.estado === "VALIDADO" && (
                <>
                  <Button variant="outline" size="sm" disabled={trabajando} onClick={() => ejecutar("devolver", {}, "Devuelto a borrador")}>Devolver a borrador</Button>
                  <Button size="sm" disabled={trabajando} onClick={() => ejecutar("contabilizar", {}, "Asiento contabilizado")}>Contabilizar</Button>
                </>
              )}
              {posteado && !d.revertidoPor && !revirtiendo && (
                <Button variant="outline" size="sm" disabled={trabajando} onClick={() => setRevirtiendo(true)}>Revertir…</Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
