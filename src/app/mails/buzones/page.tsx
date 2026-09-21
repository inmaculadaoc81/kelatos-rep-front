"use client";

import { useCallback, useEffect, useState } from "react";
import { Refresh2, Add, Edit2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Buzon, etiquetaProveedor } from "@/lib/mails";
import { BuzonDialog } from "./buzon-dialog";

function fechaHora(iso: string | null): string {
  if (!iso) return "Nunca";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function BuzonesPage() {
  const [buzones, setBuzones] = useState<Buzon[]>([]);
  const [puedeGestionar, setPuedeGestionar] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // `n` cambia en cada apertura: el formulario arranca limpio (o con el buzón elegido).
  const [dialogo, setDialogo] = useState<{ abierto: boolean; buzon: Buzon | null; n: number }>({ abierto: false, buzon: null, n: 0 });
  const [sincronizando, setSincronizando] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/mails/buzones");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setBuzones(data.buzones as Buzon[]);
      setPuedeGestionar(!!data.puedeGestionar);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function sincronizar(b: Buzon) {
    setSincronizando(b.id);
    try {
      const res = await fetch(`/api/mails/buzones/${b.id}/sincronizar`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      if (data.yaEnCurso) toast.info("Este buzón ya se está sincronizando");
      else if (data.error) toast.error(`Sincronización con errores: ${data.error}`);
      else toast.success(data.nuevos > 0 ? `${data.nuevos} mensajes nuevos` : "Sin mensajes nuevos");
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSincronizando(null);
    }
  }

  async function alternarActivo(b: Buzon) {
    try {
      const res = await fetch(`/api/mails/buzones/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !b.activo }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(b.activo ? "Buzón desactivado: deja de sincronizarse" : "Buzón activado");
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Buzones</h1>
          <p className="text-sm text-muted-foreground">Correos conectados (IMAP para leer, SMTP para enviar) de cualquier dominio</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
          {puedeGestionar && (
            <Button size="sm" className="gap-1.5" onClick={() => setDialogo((d) => ({ abierto: true, buzon: null, n: d.n + 1 }))}>
              <Add className="size-4" /> Añadir buzón
            </Button>
          )}
        </div>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Buzón</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Servidores</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Mensajes</TableHead>
              <TableHead>Última sincronización</TableHead>
              {puedeGestionar && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: puedeGestionar ? 7 : 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!cargando && buzones.length === 0 && (
              <TableRow>
                <TableCell colSpan={puedeGestionar ? 7 : 6} className="py-8 text-center text-muted-foreground">
                  Todavía no hay buzones{puedeGestionar ? ". Pulsa «Añadir buzón» para conectar el primero." : "."}
                </TableCell>
              </TableRow>
            )}
            {!cargando &&
              buzones.map((b) => (
                <TableRow key={b.id} className={b.activo ? undefined : "opacity-60"}>
                  <TableCell>
                    <div className="text-sm font-medium">{b.nombre}</div>
                    <div className="text-xs text-muted-foreground">{b.email}</div>
                  </TableCell>
                  <TableCell className="text-sm">{etiquetaProveedor(b.proveedor)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div>IMAP {b.imap_host}:{b.imap_port}</div>
                    <div>SMTP {b.smtp_host}:{b.smtp_port}</div>
                  </TableCell>
                  <TableCell>
                    {!b.activo ? (
                      <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Desactivado</span>
                    ) : b.ultimo_error ? (
                      <span className="inline-flex max-w-56 rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600" title={b.ultimo_error}>
                        <span className="truncate">Con errores</span>
                      </span>
                    ) : b.ultima_sincronizacion ? (
                      <span className="inline-flex rounded-md bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">Sincronizado</span>
                    ) : (
                      <span className="inline-flex rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">Pendiente</span>
                    )}
                    {b.activo && b.ultimo_error && <div className="mt-1 max-w-56 truncate text-[11px] text-red-600" title={b.ultimo_error}>{b.ultimo_error}</div>}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {b.mensajes.toLocaleString("es-ES")}
                    {b.sin_leer > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{b.sin_leer}</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{fechaHora(b.ultima_sincronizacion)}</TableCell>
                  {puedeGestionar && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 gap-1" disabled={sincronizando === b.id || !b.activo} onClick={() => sincronizar(b)}>
                          <Refresh2 className={`size-3.5 ${sincronizando === b.id ? "animate-spin" : ""}`} /> Sincronizar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => setDialogo((d) => ({ abierto: true, buzon: b, n: d.n + 1 }))}>
                          <Edit2 className="size-3.5" /> Editar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => alternarActivo(b)}>
                          {b.activo ? "Desactivar" : "Activar"}
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {puedeGestionar && (
        <BuzonDialog
          key={`${dialogo.buzon?.id ?? "nuevo"}-${dialogo.n}`}
          buzon={dialogo.buzon}
          open={dialogo.abierto}
          onOpenChange={(o) => setDialogo((d) => ({ ...d, abierto: o }))}
          onGuardado={cargar}
        />
      )}
    </div>
  );
}
