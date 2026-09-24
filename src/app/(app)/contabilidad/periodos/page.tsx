"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Add, Clock, Refresh2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiC, MESES, type Periodo } from "@/lib/contabilidad";
import { Cabecera, CajaError, FilaVacia, FilasCarga } from "../_ui";

interface Auditoria {
  id: number;
  ts: string;
  usuario: string | null;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  detalle: unknown;
}

export default function PeriodosPage() {
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [auditoria, setAuditoria] = useState<Auditoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reabriendo, setReabriendo] = useState<Periodo | null>(null);
  const [motivo, setMotivo] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [p, a] = await Promise.all([apiC<{ periodos: Periodo[] }>("periodos"), apiC<{ auditoria: Auditoria[] }>("auditoria", { query: { limit: 200 } })]);
      setPeriodos(p.periodos);
      setAuditoria(a.auditoria);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => {
    cargar();
  }, [cargar]);

  async function accion(ruta: string, cuerpo: unknown, ok: string) {
    setTrabajando(true);
    try {
      await apiC(ruta, { metodo: "POST", cuerpo });
      toast.success(ok);
      setReabriendo(null);
      setMotivo("");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setTrabajando(false);
    }
  }

  const anios = [...new Set(periodos.map((p) => p.anio))];
  const siguiente = (anios.length ? Math.max(...anios) : new Date().getFullYear()) + 1;

  return (
    <div className="space-y-3 p-6">
      <Cabecera
        icono={<Clock className="size-4.5" />}
        titulo="Periodos y auditoría"
        descripcion="Cerrar un mes bloquea nuevos apuntes en él; reabrirlo exige un motivo y queda registrado"
        acciones={
          <>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => accion("ejercicios", { anio: siguiente }, `Ejercicio ${siguiente} creado`)}>
              <Add className="size-4" /> Crear ejercicio {siguiente}
            </Button>
            <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar"><Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} /></Button>
          </>
        }
      />
      <CajaError mensaje={error} />
      <Tabs defaultValue="periodos">
        <TabsList>
          <TabsTrigger value="periodos">Periodos</TabsTrigger>
          <TabsTrigger value="auditoria">Registro de auditoría</TabsTrigger>
        </TabsList>

        <TabsContent value="periodos" className="space-y-4 pt-3">
          {reabriendo && (
            <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
              <p className="text-sm">Reabrir <strong>{MESES[reabriendo.mes - 1]} {reabriendo.anio}</strong>. Indica el motivo (mínimo 10 caracteres); quedará en la auditoría.</p>
              <div className="flex flex-wrap gap-2">
                <Input className="min-w-72 flex-1" placeholder="Motivo de la reapertura" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                <Button size="sm" disabled={trabajando || motivo.trim().length < 10} onClick={() => accion("periodos/reabrir", { anio: reabriendo.anio, mes: reabriendo.mes, motivo }, "Periodo reabierto")}>Reabrir</Button>
                <Button size="sm" variant="ghost" onClick={() => { setReabriendo(null); setMotivo(""); }}>Cancelar</Button>
              </div>
            </div>
          )}
          {cargando && <FilasCargaSuelta />}
          {!cargando &&
            anios.map((anio) => (
              <div key={anio} className="space-y-1.5">
                <h2 className="text-sm font-semibold">Ejercicio {anio}</h2>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {periodos.filter((p) => p.anio === anio).map((p) => (
                    <div key={p.mes} className="flex flex-col gap-1 rounded-lg border bg-card p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">{MESES[p.mes - 1]}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.estado === "cerrado" ? "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"}`}>{p.estado === "cerrado" ? "Cerrado" : "Abierto"}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{p.contabilizados} contabilizados · {p.pendientes} pendientes</div>
                      {p.estado === "abierto" ? (
                        <Button size="sm" variant="outline" className="mt-1 h-7" disabled={trabajando || p.pendientes > 0} title={p.pendientes > 0 ? "Hay asientos sin contabilizar" : undefined} onClick={() => accion("periodos/cerrar", { anio: p.anio, mes: p.mes }, "Periodo cerrado")}>Cerrar periodo</Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="mt-1 h-7" onClick={() => setReabriendo(p)}>Reabrir…</Button>
                      )}
                      {p.reabierto_motivo && p.estado === "abierto" && <div className="text-[11px] text-muted-foreground">Reabierto: {p.reabierto_motivo}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </TabsContent>

        <TabsContent value="auditoria" className="pt-3">
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Fecha</TableHead><TableHead>Usuario</TableHead><TableHead>Acción</TableHead><TableHead>Elemento</TableHead><TableHead>Detalle</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {cargando && <FilasCarga columnas={5} />}
                {!cargando && auditoria.length === 0 && <FilaVacia columnas={5} texto="Sin actividad registrada todavía." />}
                {auditoria.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums">{new Date(a.ts).toLocaleString("es-ES")}</TableCell>
                    <TableCell className="text-xs">{a.usuario}</TableCell>
                    <TableCell className="text-sm font-medium">{a.accion}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.entidad} {a.entidad_id}</TableCell>
                    <TableCell className="max-w-md truncate text-xs text-muted-foreground">{a.detalle ? JSON.stringify(a.detalle) : ""}</TableCell>
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

function FilasCargaSuelta() {
  return <div className="h-40 animate-pulse rounded-lg bg-muted/50" />;
}
