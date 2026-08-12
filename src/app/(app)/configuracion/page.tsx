"use client";

import { useEffect, useState } from "react";
import { Setting2, Profile2User, Refresh2, ShieldTick, TickCircle, CloseCircle } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Empleado } from "@/app/api/empleados/route";

/**
 * Configuración — solo para el rol Administrador (gated en proxy.ts).
 * Reproduce el listado de "usuarios" del sistema a partir del directorio
 * de empleados (kelatos_app.empleados) — no hay una tabla propia de
 * cuentas: cualquier @kelatos.com puede iniciar sesión, así que "los
 * usuarios" son las personas registradas como empleados.
 */
export default function ConfiguracionPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/empleados?todos=1");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setEmpleados(data.empleados);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Setting2 className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold">Configuración</h1>
          <p className="text-sm text-muted-foreground">Solo visible para el Administrador.</p>
        </div>
        <Button variant="outline" size="icon" className="ml-auto size-8" onClick={cargar} title="Actualizar">
          <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar: {error}
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        <Profile2User className="size-4.5 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Usuarios</h2>
        {!cargando && <span className="ml-auto text-sm text-muted-foreground">{empleados.length} empleados</span>}
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="text-center">Técnico</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}

            {!cargando && empleados.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Sin empleados registrados
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              empleados.map((e) => (
                <TableRow key={e.empleadoId}>
                  <TableCell className="font-medium">{e.nombre || "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.email || "-"}</TableCell>
                  <TableCell className="text-sm">{e.rol || "-"}</TableCell>
                  <TableCell className="text-center">
                    {e.esTecnico ? (
                      <ShieldTick className="mx-auto size-4 text-primary" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {e.activo ? (
                      <Badge className="gap-1 bg-emerald-600 text-white">
                        <TickCircle className="size-3" /> Activo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <CloseCircle className="size-3" /> Inactivo
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
