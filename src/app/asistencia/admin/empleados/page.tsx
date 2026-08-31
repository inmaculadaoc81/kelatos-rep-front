"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEsSuperadmin } from "@/hooks/use-es-superadmin";
import { colorAvatar, iniciales } from "@/lib/registro-acciones-estilo";
import { Add, Edit2, SecuritySafe, Lock } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface Calendario { id: number; nombre: string; }
interface Empleado {
  id: number;
  nombre: string;
  email: string | null;
  dni: string | null;
  resource_calendar_id: number | null;
  activo: boolean;
}

interface FormEmpleado { nombre: string; email: string; dni: string; }
const FORM_VACIO: FormEmpleado = { nombre: "", email: "", dni: "" };

/** Alta/baja de empleados que pueden fichar — restringido a superadmin,
    tanto aquí (sidebar + esta página) como en el backend (las rutas POST/
    PATCH de asistencia/admin/empleados comprueban esSuperadmin, no solo
    esManager). Petición del usuario, 2026-08-31. */
export default function EmpleadosPage() {
  const esSuperadmin = useEsSuperadmin();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [calendarios, setCalendarios] = useState<Calendario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [editando, setEditando] = useState<Empleado | null>(null);
  const [form, setForm] = useState<FormEmpleado>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [empleadoPass, setEmpleadoPass] = useState<Empleado | null>(null);
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [guardandoPass, setGuardandoPass] = useState(false);

  async function cargar() {
    setCargando(true);
    try {
      const [rEmp, rCal] = await Promise.all([
        fetch("/api/asistencia/admin/empleados").then((r) => r.json()),
        fetch("/api/asistencia/admin/calendarios").then((r) => r.json()),
      ]);
      if (rEmp.ok) setEmpleados(rEmp.empleados);
      if (rCal.ok) setCalendarios(rCal.calendarios);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function abrirNuevo() {
    setEditando(null);
    setForm(FORM_VACIO);
    setDialogoAbierto(true);
  }

  function abrirEditar(e: Empleado) {
    setEditando(e);
    setForm({ nombre: e.nombre, email: e.email || "", dni: e.dni || "" });
    setDialogoAbierto(true);
  }

  async function guardar() {
    if (!form.nombre.trim()) return toast.error("El nombre es obligatorio");
    if (!form.email.trim()) return toast.error("El email es obligatorio");
    setGuardando(true);
    try {
      const url = editando ? `/api/asistencia/admin/empleados/${editando.id}` : "/api/asistencia/admin/empleados";
      const res = await fetch(url, {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: form.nombre.trim(), email: form.email.trim(), dni: form.dni.trim() || null }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(editando ? "Empleado actualizado" : "Empleado creado");
      setDialogoAbierto(false);
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  async function alternarActivo(e: Empleado) {
    try {
      const res = await fetch(`/api/asistencia/admin/empleados/${e.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !e.activo }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(e.activo ? "Empleado desactivado — ya no puede fichar" : "Empleado reactivado");
      await cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  async function guardarPassword() {
    if (!empleadoPass) return;
    if (nuevaPassword.length < 6) return toast.error("La contraseña debe tener al menos 6 caracteres");
    setGuardandoPass(true);
    try {
      const res = await fetch(`/api/asistencia/admin/empleados/${empleadoPass.id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: nuevaPassword }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Contraseña actualizada");
      setEmpleadoPass(null);
      setNuevaPassword("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardandoPass(false);
    }
  }

  function nombreCalendario(id: number | null): string {
    if (!id) return "Sin horario";
    return calendarios.find((c) => c.id === id)?.nombre || `#${id}`;
  }

  if (!esSuperadmin) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border bg-card py-16 text-center text-muted-foreground">
        <SecuritySafe className="size-6" />
        <p className="text-sm">Solo el superadministrador puede gestionar empleados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Empleados</h1>
          <p className="text-xs text-muted-foreground">Quién puede fichar en el kiosco — dar de alta, editar o quitar acceso.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={abrirNuevo}>
          <Add className="size-3.5" /> Nuevo empleado
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>DNI</TableHead>
              <TableHead>Horario</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            ))}
            {!cargando && empleados.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Sin empleados dados de alta</TableCell></TableRow>
            )}
            {!cargando && empleados.map((e) => (
              <TableRow key={e.id} className={cn(!e.activo && "opacity-60")}>
                <TableCell className="font-medium">
                  <span className="inline-flex items-center gap-2">
                    <Avatar size="sm">
                      <AvatarFallback className={colorAvatar(e.nombre)}>{iniciales(e.nombre)}</AvatarFallback>
                    </Avatar>
                    {e.nombre}
                  </span>
                </TableCell>
                <TableCell className="text-sm">{e.email || <span className="text-muted-foreground">Sin email — no puede iniciar sesión</span>}</TableCell>
                <TableCell className="text-sm">{e.dni || "—"}</TableCell>
                <TableCell className="text-sm">{nombreCalendario(e.resource_calendar_id)}</TableCell>
                <TableCell>
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    e.activo ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"
                  )}>
                    {e.activo ? "Activo" : "Inactivo"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => abrirEditar(e)}>
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" title="Establecer contraseña" onClick={() => { setEmpleadoPass(e); setNuevaPassword(""); }}>
                      <Lock className="size-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn("h-7 text-xs", e.activo ? "text-destructive" : "text-emerald-700")}
                      onClick={() => alternarActivo(e)}
                    >
                      {e.activo ? "Quitar acceso" : "Reactivar"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar empleado" : "Nuevo empleado"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input value={form.nombre} onChange={(ev) => setForm((f) => ({ ...f, nombre: ev.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Email (cuenta de Google para el kiosco)</Label>
              <Input type="email" value={form.email} onChange={(ev) => setForm((f) => ({ ...f, email: ev.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>DNI/NIE (opcional)</Label>
              <Input value={form.dni} onChange={(ev) => setForm((f) => ({ ...f, dni: ev.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogoAbierto(false)} disabled={guardando}>Cancelar</Button>
            <Button size="sm" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!empleadoPass} onOpenChange={(o) => { if (!o) setEmpleadoPass(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Contraseña de {empleadoPass?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Alternativa a Google para iniciar sesión en el kiosco — útil si <strong>{empleadoPass?.email}</strong> no
              está asociado a una cuenta de Gmail real. Mínimo 6 caracteres.
            </p>
            <div className="space-y-1">
              <Label>Nueva contraseña</Label>
              <Input type="text" value={nuevaPassword} onChange={(ev) => setNuevaPassword(ev.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEmpleadoPass(null)} disabled={guardandoPass}>Cancelar</Button>
            <Button size="sm" onClick={guardarPassword} disabled={guardandoPass}>{guardandoPass ? "Guardando…" : "Guardar contraseña"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
