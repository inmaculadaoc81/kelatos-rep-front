"use client";

import { useEffect, useState, useTransition } from "react";
import type { Session } from "next-auth";
import {
  Personalcard,
  Sms,
  ShieldTick,
  Setting2,
  TickCircle,
  CloseCircle,
  Logout,
} from "@/lib/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Empleado } from "@/app/api/empleados/route";
import { cerrarSesion } from "../acciones";

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function Fila({ icono: Icono, etiqueta, valor }: { icono: typeof Sms; etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
      <Icono className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{etiqueta}</p>
        <p className="truncate text-sm font-medium">{valor}</p>
      </div>
    </div>
  );
}

/**
 * "Mi perfil" — no existe en el Apps Script original (no había roles ni
 * concepto de cuenta propia, solo restricción de dominio). Es una pantalla
 * nueva: la identidad la gestiona Google (nombre/email vienen de la
 * sesión, no son editables aquí), así que se limita a mostrar quién ha
 * iniciado sesión y, si el email coincide con un registro del directorio
 * de empleados (mismo origen que usa el desplegable "Responsable" y la
 * tabla de Configuración), sus datos de empleado.
 */
export function PerfilContenido({ session }: { session: Session | null }) {
  const [empleado, setEmpleado] = useState<Empleado | null | undefined>(undefined);
  const [cerrando, startTransition] = useTransition();

  const nombre = session?.user?.name || session?.user?.email || "Usuario";
  const email = session?.user?.email || "";
  const esAdmin = session?.user?.role === "admin";

  useEffect(() => {
    if (!email) return;
    const emailBuscado = email.toLowerCase();
    fetch("/api/empleados?todos=1")
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) { setEmpleado(null); return; }
        const encontrado = (data.empleados as Empleado[]).find((e) => e.email.toLowerCase() === emailBuscado);
        setEmpleado(encontrado || null);
      })
      .catch(() => setEmpleado(null));
  }, [email]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Personalcard className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold">Mi perfil</h1>
          <p className="text-sm text-muted-foreground">Datos de tu cuenta, gestionados por tu sesión de Google.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="flex flex-col items-center gap-3 border-b bg-muted/30 px-4 py-6 text-center">
            <Avatar size="lg" className="size-16 rounded-xl">
              <AvatarFallback className="rounded-xl bg-primary/12 text-lg text-primary">
                {iniciales(nombre)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-semibold">{nombre}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
            <Badge variant={esAdmin ? "default" : "secondary"} className="gap-1">
              <ShieldTick className="size-3" /> {esAdmin ? "Administrador" : "Usuario"}
            </Badge>
          </div>
          <div className="p-3">
            <Button
              variant="outline"
              className="w-full gap-1.5 text-destructive hover:text-destructive"
              disabled={cerrando}
              onClick={() => startTransition(() => cerrarSesion())}
            >
              <Logout className="size-4" /> {cerrando ? "Cerrando sesión..." : "Cerrar sesión"}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="border-b bg-muted/30 px-4 py-2.5">
              <h2 className="text-sm font-semibold">Cuenta</h2>
            </div>
            <Fila icono={Personalcard} etiqueta="Nombre" valor={nombre} />
            <Fila icono={Sms} etiqueta="Email" valor={email || "—"} />
            <Fila icono={ShieldTick} etiqueta="Rol en el sistema" valor={esAdmin ? "Administrador" : "Usuario"} />
          </div>

          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5">
              <h2 className="text-sm font-semibold">Ficha de empleado</h2>
              {empleado && (
                <Badge className={`ml-auto gap-1 ${empleado.activo ? "bg-emerald-600 text-white" : ""}`} variant={empleado.activo ? "default" : "outline"}>
                  {empleado.activo ? <TickCircle className="size-3" /> : <CloseCircle className="size-3" />}
                  {empleado.activo ? "Activo" : "Inactivo"}
                </Badge>
              )}
            </div>

            {empleado === undefined && (
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}

            {empleado === null && (
              <p className="p-4 text-sm text-muted-foreground">
                No hay ningún registro de empleado vinculado a <strong>{email}</strong> en el directorio (kelatos_app.empleados).
              </p>
            )}

            {empleado && (
              <>
                <Fila icono={Personalcard} etiqueta="Nombre de empleado" valor={empleado.nombre || "—"} />
                <Fila icono={ShieldTick} etiqueta="Rol de empleado" valor={empleado.rol || "—"} />
                <Fila icono={Setting2} etiqueta="¿Técnico?" valor={empleado.esTecnico ? "Sí" : "No"} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
