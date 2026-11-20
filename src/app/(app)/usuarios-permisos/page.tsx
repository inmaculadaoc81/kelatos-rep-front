"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { InfoCircle, Refresh2, ShieldTick, TickCircle, UserAdd, CloseCircle } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Rol = "super_admin" | "empleado_local" | "empleado_remoto";
const ROLES: { clave: Rol; etiqueta: string; clase: string; ayuda: string }[] = [
  { clave: "super_admin", etiqueta: "Super admin", clase: "bg-violet-500/15 text-violet-700 dark:text-violet-300", ayuda: "Todos los permisos, sin restricción de IP." },
  { clave: "empleado_local", etiqueta: "Empleado local", clase: "bg-sky-500/15 text-sky-700 dark:text-sky-300", ayuda: "Trabaja en el local: entra desde el local o sus equipos autorizados." },
  { clave: "empleado_remoto", etiqueta: "Empleado remoto", clase: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", ayuda: "Trabaja a distancia: entra desde el equipo de acceso remoto." },
];
const rolDe = (r: string) => ROLES.find((x) => x.clave === r) ?? ROLES[1];

interface Permiso { clave: string; modulo: string; etiqueta: string; descripcion: string | null; orden: number }
interface Usuario {
  id: number; email: string; nombre: string; rol: Rol; activo: boolean; compartida: boolean; empleado_asistencia_id: number | null; notas: string | null;
  fijo: boolean; excepciones: Record<string, boolean>; efectivos: Record<string, boolean>;
}
interface Todo { catalogo: Permiso[]; roles: Record<string, Record<string, boolean>>; usuarios: Usuario[]; modo: string; aplicar: string[]; migrables: string[] }
const NOMBRE_MODULO: Record<string, string> = { stock: "Stock (ver, crear, editar y borrar piezas)" };
interface Registro { id: number; fecha: string; actor: string | null; accion: string; usuario_email: string | null; detalle: Record<string, unknown> }

const ACCIONES: Record<string, string> = {
  carga_inicial: "Carga inicial", usuario_creado: "Usuario creado", usuario_editado: "Usuario editado", rol_cambiado: "Rol cambiado", usuario_activado: "Usuario activado",
  usuario_desactivado: "Usuario desactivado", permisos_usuario: "Permisos de usuario", permisos_rol: "Permisos de rol", permisos_copiados: "Permisos copiados",
};
const fechaHora = (iso: string) => new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

async function api(url: string, metodo: string, cuerpo?: unknown) {
  const r = await fetch(url, { method: metodo, headers: { "Content-Type": "application/json" }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || "Error");
  return j;
}

/** Usuarios y permisos (solo superadmins): roles Empleado local / Empleado remoto / Super admin, plantilla de permisos por rol y excepciones por usuario. */
export default function UsuariosPermisosPage() {
  const [todo, setTodo] = useState<Todo | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState("usuarios");
  const [editando, setEditando] = useState<Usuario | "nuevo" | null>(null);
  const [cambiosRol, setCambiosRol] = useState<Record<string, Record<string, boolean>>>({});
  const [guardandoRol, setGuardandoRol] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [t, a] = await Promise.all([api("/api/usuarios-permisos", "GET"), api("/api/usuarios-permisos/auditoria", "GET")]);
      setTodo(t as Todo);
      setRegistros(a.registros || []);
      setCambiosRol({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void cargar(), 0);
    return () => clearTimeout(t);
  }, [cargar]);

  const modulos = useMemo(() => {
    const m = new Map<string, Permiso[]>();
    for (const p of todo?.catalogo ?? []) {
      if (!m.has(p.modulo)) m.set(p.modulo, []);
      m.get(p.modulo)!.push(p);
    }
    return Array.from(m.entries());
  }, [todo]);

  const valorRol = (rol: Rol, clave: string) => cambiosRol[rol]?.[clave] ?? todo?.roles[rol]?.[clave] ?? false;
  const hayCambiosRol = Object.values(cambiosRol).some((x) => Object.keys(x).length > 0);

  async function guardarRoles() {
    setGuardandoRol(true);
    try {
      for (const [rol, cambios] of Object.entries(cambiosRol)) {
        if (Object.keys(cambios).length) await api(`/api/usuarios-permisos/roles/${rol}/permisos`, "PUT", { cambios });
      }
      toast.success("Plantillas de rol guardadas");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardandoRol(false);
    }
  }

  async function alternarModulo(modulo: string, activar: boolean) {
    if (!todo) return;
    if (activar && !window.confirm(`A partir de ahora el acceso a ${NOMBRE_MODULO[modulo] ?? modulo} lo deciden los permisos de esta pantalla, no las listas de antes. ¿Activar?`)) return;
    try {
      const nuevos = activar ? [...todo.aplicar, modulo] : todo.aplicar.filter((x) => x !== modulo);
      await api("/api/usuarios-permisos/modulos", "PUT", { modulos: nuevos });
      toast.success(activar ? "Permisos aplicados en ese módulo" : "Ese módulo vuelve al sistema anterior");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar");
    }
  }

  async function alternarActivo(u: Usuario) {
    try {
      await api(`/api/usuarios-permisos/usuarios/${u.id}`, "PATCH", { activo: !u.activo });
      toast.success(u.activo ? `${u.nombre} desactivado` : `${u.nombre} activado`);
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar");
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold"><ShieldTick className="size-5" /> Usuarios y permisos</h1>
          <p className="text-sm text-muted-foreground">Quién puede entrar al Dashboard y qué puede hacer cada persona. Tres roles: super admin, empleado local y empleado remoto.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setEditando("nuevo")}><UserAdd className="size-4" /> Nuevo usuario</Button>
          <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar"><Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} /></Button>
        </div>
      </div>

      {todo && todo.aplicar.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
          <ShieldTick className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <p>Los permisos <span className="font-medium">ya mandan</span> en: {todo.aplicar.map((m) => NOMBRE_MODULO[m] ?? m).join(", ")}. En el resto de módulos todavía decide el sistema anterior.</p>
        </div>
      )}
      {todo && todo.aplicar.length === 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <InfoCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium">Modo observar: estos permisos todavía no mandan.</p>
            <p className="text-muted-foreground">Ya reflejan lo que cada persona puede hacer hoy, pero el acceso real lo sigue decidiendo el sistema anterior. Se irá pasando a estos permisos módulo a módulo, y los cambios que hagas aquí no quitan ni dan acceso todavía.</p>
          </div>
        </div>
      )}
      {error && <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>}

      <Tabs value={pestana} onValueChange={(v) => setPestana(String(v))}>
        <TabsList>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="roles">Plantillas por rol</TabsTrigger>
          <TabsTrigger value="registro">Registro de cambios</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios">
          <div className="mt-3 overflow-hidden rounded-lg border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-sky-50 dark:bg-sky-950/40">
                  <TableHead className="text-[.78rem] tracking-wide uppercase">Usuario</TableHead>
                  <TableHead className="text-[.78rem] tracking-wide uppercase">Rol</TableHead>
                  <TableHead className="text-[.78rem] tracking-wide uppercase">Permisos</TableHead>
                  <TableHead className="text-[.78rem] tracking-wide uppercase">Activo</TableHead>
                  <TableHead className="text-right text-[.78rem] tracking-wide uppercase">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargando && !todo ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>) : null}
                {todo?.usuarios.map((u) => {
                  const r = rolDe(u.rol);
                  const concedidos = Object.values(u.efectivos).filter(Boolean).length;
                  const exc = Object.keys(u.excepciones).length;
                  return (
                    <TableRow key={u.id} className={cn(!u.activo && "opacity-50")}>
                      <TableCell>
                        <div className="text-sm font-medium">{u.nombre}{u.compartida && <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300" title="Cuenta usada por varias personas: no se sabe quién hizo cada acción">compartida</span>}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </TableCell>
                      <TableCell><span className={`rounded px-2 py-0.5 text-xs font-medium ${r.clase}`}>{r.etiqueta}</span></TableCell>
                      <TableCell className="text-sm">
                        {concedidos} de {todo.catalogo.length}
                        {exc > 0 && <span className="ml-1 text-xs text-muted-foreground">· {exc} excepcion{exc !== 1 ? "es" : ""}</span>}
                      </TableCell>
                      <TableCell><Switch checked={u.activo} disabled={u.fijo} onCheckedChange={() => alternarActivo(u)} /></TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm" className="h-7" onClick={() => setEditando(u)}>Editar y permisos</Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Las cuatro cuentas de super admin son fijas: no se pueden degradar ni desactivar desde aquí, para no quedarse fuera por error.</p>
        </TabsContent>

        <TabsContent value="roles">
          <div className="mt-3 overflow-hidden rounded-lg border bg-card shadow-sm">
            {todo && todo.migrables.length > 0 && (
              <div className="border-b px-3 py-3">
                <p className="mb-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">Módulos donde los permisos ya mandan</p>
                {todo.migrables.map((m) => (
                  <label key={m} className="flex cursor-pointer items-center gap-2 py-0.5 text-sm">
                    <Switch checked={todo.aplicar.includes(m)} onCheckedChange={(v) => alternarModulo(m, v === true)} />
                    {NOMBRE_MODULO[m] ?? m}
                    <span className="text-xs text-muted-foreground">{todo.aplicar.includes(m) ? "· mandan los permisos" : "· decide el sistema anterior"}</span>
                  </label>
                ))}
                <p className="mt-1 text-[11px] text-muted-foreground">Se puede volver atrás en cualquier momento apagando el interruptor. Quien no figure en la lista de usuarios sigue con el sistema anterior.</p>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
              <span className="text-xs text-muted-foreground">Lo que puede hacer por defecto cada rol. El super admin siempre lo tiene todo. A cada usuario se le pueden dar excepciones.</span>
              <Button size="sm" className="h-7" disabled={!hayCambiosRol || guardandoRol} onClick={guardarRoles}>{guardandoRol ? "Guardando…" : "Guardar cambios"}</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-sky-50 dark:bg-sky-950/40">
                  <TableHead className="text-[.78rem] tracking-wide uppercase">Permiso</TableHead>
                  {ROLES.map((r) => <TableHead key={r.clave} className="w-36 text-center text-[.78rem] tracking-wide uppercase" title={r.ayuda}>{r.etiqueta}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {modulos.map(([modulo, permisos]) => (
                  <>
                    <TableRow key={`m-${modulo}`} className="bg-muted/40 hover:bg-muted/40"><TableCell colSpan={4} className="py-1 text-xs font-bold tracking-wider text-muted-foreground uppercase">{modulo}</TableCell></TableRow>
                    {permisos.map((p) => (
                      <TableRow key={p.clave}>
                        <TableCell className="text-sm"><div className="font-medium">{p.etiqueta}</div>{p.descripcion && <div className="text-xs text-muted-foreground">{p.descripcion}</div>}</TableCell>
                        {ROLES.map((r) => (
                          <TableCell key={r.clave} className="text-center">
                            {r.clave === "super_admin" || p.clave === "usuarios.administrar" ? (
                              r.clave === "super_admin" ? <TickCircle className="mx-auto size-4 text-emerald-600" /> : <span className="text-muted-foreground">—</span>
                            ) : (
                              <Checkbox
                                checked={valorRol(r.clave, p.clave)}
                                onCheckedChange={(v) => setCambiosRol((prev) => ({ ...prev, [r.clave]: { ...(prev[r.clave] || {}), [p.clave]: v === true } }))}
                              />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="registro">
          <div className="mt-3 overflow-hidden rounded-lg border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-sky-50 dark:bg-sky-950/40">
                  <TableHead className="text-[.78rem] tracking-wide uppercase">Fecha</TableHead>
                  <TableHead className="text-[.78rem] tracking-wide uppercase">Quién</TableHead>
                  <TableHead className="text-[.78rem] tracking-wide uppercase">Qué</TableHead>
                  <TableHead className="text-[.78rem] tracking-wide uppercase">Sobre</TableHead>
                  <TableHead className="text-[.78rem] tracking-wide uppercase">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registros.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="text-sm whitespace-nowrap">{fechaHora(g.fecha)}</TableCell>
                    <TableCell className="text-sm">{g.actor || "—"}</TableCell>
                    <TableCell className="text-sm">{ACCIONES[g.accion] || g.accion}</TableCell>
                    <TableCell className="text-sm">{g.usuario_email || "—"}</TableCell>
                    <TableCell className="max-w-lg truncate text-xs text-muted-foreground" title={JSON.stringify(g.detalle)}>{JSON.stringify(g.detalle)}</TableCell>
                  </TableRow>
                ))}
                {registros.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Sin cambios registrados.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {editando && todo && (
        <EditarUsuario
          key={editando === "nuevo" ? "nuevo" : editando.id}
          usuario={editando === "nuevo" ? null : editando}
          todo={todo}
          modulos={modulos}
          onCerrar={() => setEditando(null)}
          onGuardado={async () => { setEditando(null); await cargar(); }}
        />
      )}
    </div>
  );
}

type Estado = "hereda" | "permite" | "deniega";

function EditarUsuario({ usuario, todo, modulos, onCerrar, onGuardado }: {
  usuario: Usuario | null; todo: Todo; modulos: [string, Permiso[]][]; onCerrar: () => void; onGuardado: () => Promise<void>;
}) {
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [rol, setRol] = useState<Rol>(usuario?.rol ?? "empleado_local");
  const [compartida, setCompartida] = useState(usuario?.compartida ?? false);
  const [notas, setNotas] = useState(usuario?.notas ?? "");
  const [estados, setEstados] = useState<Record<string, Estado>>(() => {
    const e: Record<string, Estado> = {};
    for (const [k, v] of Object.entries(usuario?.excepciones ?? {})) e[k] = v ? "permite" : "deniega";
    return e;
  });
  const [guardando, setGuardando] = useState(false);
  const [copiarDe, setCopiarDe] = useState("");

  const esSuper = rol === "super_admin";
  const rolOriginal = usuario?.rol;

  function efectivo(clave: string): boolean {
    if (esSuper) return true;
    const st = estados[clave] ?? "hereda";
    return st === "permite" ? true : st === "deniega" ? false : todo.roles[rol]?.[clave] ?? false;
  }

  async function guardar() {
    if (!nombre.trim() || (!usuario && !email.trim())) return toast.error("Nombre y correo son obligatorios");
    setGuardando(true);
    try {
      let id = usuario?.id;
      if (!usuario) {
        const r = await api("/api/usuarios-permisos/usuarios", "POST", { email: email.trim(), nombre: nombre.trim(), rol, compartida, notas });
        id = r.id as number;
      } else {
        await api(`/api/usuarios-permisos/usuarios/${usuario.id}`, "PATCH", { nombre: nombre.trim(), rol, compartida, notas });
      }
      if (id && rol !== "super_admin") {
        const cambios: Record<string, boolean | null> = {};
        for (const [, ps] of modulos) for (const p of ps) {
          const nuevo = estados[p.clave] ?? "hereda";
          const antes: Estado = usuario ? (usuario.excepciones[p.clave] === undefined ? "hereda" : usuario.excepciones[p.clave] ? "permite" : "deniega") : "hereda";
          if (nuevo !== antes) cambios[p.clave] = nuevo === "hereda" ? null : nuevo === "permite";
        }
        if (Object.keys(cambios).length) await api(`/api/usuarios-permisos/usuarios/${id}/permisos`, "PUT", { cambios });
      }
      toast.success("Usuario guardado");
      await onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function copiar() {
    if (!usuario || !copiarDe) return;
    try {
      const r = await api(`/api/usuarios-permisos/usuarios/${usuario.id}/copiar/${copiarDe}`, "POST");
      toast.success(r.mismoRol ? "Permisos copiados" : "Permisos copiados (el otro usuario tiene un rol distinto)");
      await onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo copiar");
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !guardando) onCerrar(); }}>
      <DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-5 py-3">
          <DialogTitle>{usuario ? `Editar a ${usuario.nombre}` : "Nuevo usuario"}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Correo</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!usuario} placeholder="nombre@kelatos.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={rol} onValueChange={(v) => v && setRol(v as Rol)} disabled={usuario?.fijo}>
                <SelectTrigger><SelectValue>{(v: string) => rolDe(v).etiqueta}</SelectValue></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r.clave} value={r.clave}>{r.etiqueta}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">{rolDe(rol).ayuda}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={compartida} onCheckedChange={(v) => setCompartida(v === true)} /> Cuenta compartida (la usan varias personas)
          </label>
          {rolOriginal && rolOriginal !== rol && <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">Cambias el rol de {rolDe(rolOriginal).etiqueta} a {rolDe(rol).etiqueta}: sus permisos pasan a heredar de la plantilla del nuevo rol, salvo las excepciones que tenga.</p>}

          {esSuper ? (
            <p className="rounded-md border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">El super admin tiene todos los permisos y no admite excepciones.</p>
          ) : (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Permisos</h3>
                {usuario && (
                  <div className="flex items-center gap-1.5">
                    <Select value={copiarDe || "__ninguno__"} onValueChange={(v) => setCopiarDe(!v || v === "__ninguno__" ? "" : v)}>
                      <SelectTrigger className="h-7 w-52 text-xs"><SelectValue>{(v: string) => (v === "__ninguno__" ? "Copiar permisos de…" : todo.usuarios.find((x) => String(x.id) === v)?.nombre ?? v)}</SelectValue></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__ninguno__">Copiar permisos de…</SelectItem>
                        {todo.usuarios.filter((x) => x.id !== usuario.id && x.rol !== "super_admin").map((x) => <SelectItem key={x.id} value={String(x.id)}>{x.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="h-7" disabled={!copiarDe} onClick={copiar}>Copiar</Button>
                  </div>
                )}
              </div>
              <div className="overflow-hidden rounded-md border">
                {modulos.map(([modulo, permisos]) => (
                  <div key={modulo}>
                    <div className="bg-muted/40 px-3 py-1 text-xs font-bold tracking-wider text-muted-foreground uppercase">{modulo}</div>
                    {permisos.filter((p) => p.clave !== "usuarios.administrar").map((p) => {
                      const st = estados[p.clave] ?? "hereda";
                      const porRol = todo.roles[rol]?.[p.clave] ?? false;
                      return (
                        <div key={p.clave} className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-1.5">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm">{p.etiqueta}</div>
                            <div className="text-[11px] text-muted-foreground">Rol: {porRol ? "permitido" : "no permitido"}</div>
                          </div>
                          <Select value={st} onValueChange={(v) => v && setEstados((prev) => ({ ...prev, [p.clave]: v as Estado }))}>
                            <SelectTrigger className="h-7 w-44 text-xs"><SelectValue>{(v: string) => (v === "permite" ? "Permitir (excepción)" : v === "deniega" ? "Denegar (excepción)" : "Heredar del rol")}</SelectValue></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hereda">Heredar del rol</SelectItem>
                              <SelectItem value="permite">Permitir (excepción)</SelectItem>
                              <SelectItem value="deniega">Denegar (excepción)</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className={cn("flex w-16 items-center justify-end gap-1 text-xs font-medium", efectivo(p.clave) ? "text-emerald-600" : "text-muted-foreground")}>
                            {efectivo(p.clave) ? <><TickCircle className="size-3.5" /> Sí</> : <><CloseCircle className="size-3.5" /> No</>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="border-t px-5 py-3">
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
          <Button onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
