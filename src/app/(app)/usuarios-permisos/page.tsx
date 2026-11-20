"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight2, ArrowSwapHorizontal, Call, Chart, ClipboardTick, Clock, CloseCircle, Flash, Global, Message, Profile2User, Refresh2,
  SearchNormal1, Send2, Setting2, ShieldTick, Sms, TickCircle, UserAdd,
} from "@/lib/icons";
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
import { GRUPOS, GRUPO_CONTABILIDAD, GRUPO_ADMIN, ITEM_LLAMADAS } from "../navegacion";

type Vistas = [string, [string, Permiso[]][]][];
type Rol = "super_admin" | "empleado_local" | "empleado_remoto";
const ROLES: { clave: Rol; etiqueta: string; clase: string; ayuda: string }[] = [
  { clave: "super_admin", etiqueta: "Super admin", clase: "bg-violet-500/15 text-violet-700 dark:text-violet-300", ayuda: "Todos los permisos, sin restricción de IP." },
  { clave: "empleado_local", etiqueta: "Empleado local", clase: "bg-sky-500/15 text-sky-700 dark:text-sky-300", ayuda: "Trabaja en el local: entra desde el local o sus equipos autorizados." },
  { clave: "empleado_remoto", etiqueta: "Empleado remoto", clase: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", ayuda: "Trabaja a distancia: entra desde el equipo de acceso remoto." },
];
const rolDe = (r: string) => ROLES.find((x) => x.clave === r) ?? ROLES[1];

interface Permiso { clave: string; es_entrada?: boolean; vista: string; modulo: string; etiqueta: string; descripcion: string | null; orden: number }
interface Usuario {
  id: number; email: string; nombre: string; rol: Rol; activo: boolean; compartida: boolean; empleado_asistencia_id: number | null; notas: string | null;
  fijo: boolean; excepciones: Record<string, boolean>; efectivos: Record<string, boolean>;
}
interface Todo { catalogo: Permiso[]; roles: Record<string, Record<string, boolean>>; usuarios: Usuario[]; modo: string; aplicar: string[]; migrables: string[] }
interface Registro { id: number; fecha: string; actor: string | null; accion: string; usuario_email: string | null; detalle: Record<string, unknown> }

const NOMBRE_MODULO: Record<string, string> = {
  stock: "Stock (ver, crear, editar y borrar piezas)",
  compras: "Compras (ver y subir pedido con IA)",
  informes: "Informes (reportes, registro de acciones, notificaciones y reseñas)",
  tareas: "Tareas",
  extractor_discos: "Extractor de discos",
  equipos_entregados: "Equipos entregados",
  transferencias: "Transferencias (vista completa y devoluciones)",
  llamadas: "Llamadas (transcripciones y grabaciones)",
  webs_kelatos: "Webs Kelatos",
  mails: "Gestión MAILS (centro de mails y administración)",
  crm: "CRM (leads, propuestas, correos y N8N Labs)",
  agentes: "Agentes IA, Redes sociales y Programar contenido",
  reparaciones: "Reparaciones (historial, presupuestos, recogidas, Punto Limpio y casilleros)",
  clientes: "Clientes, proveedores y Formulario Web",
  equipos: "Equipos, alquileres y precio de venta",
  ventas: "Ventas",
  facturacion: "Facturación (facturas, seguimiento y reporte)",
  efectivo: "Efectivo y Facturación del día",
  n8nlabs: "N8N Labs",
  prospeccion: "Prospección",
};

/** Aspecto de cada vista (dashboard) en la pantalla de inicio. */
const VISTAS_INFO: Record<string, { icono: React.ElementType; color: string; descripcion: string }> = {
  "Reparaciones": { icono: Setting2, color: "bg-blue-500/15 text-blue-600 dark:text-blue-400", descripcion: "Reparaciones, catálogos, stock y compras, facturación, informes y contabilidad" },
  "Tareas": { icono: ClipboardTick, color: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400", descripcion: "Asignar y seguir las tareas del equipo" },
  "Transferencias": { icono: ArrowSwapHorizontal, color: "bg-sky-500/15 text-sky-600 dark:text-sky-400", descripcion: "Conciliar transferencias y gestionar devoluciones" },
  "Asistencias": { icono: Clock, color: "bg-violet-500/15 text-violet-600 dark:text-violet-400", descripcion: "Panel de fichajes y asistencia" },
  "Webs Kelatos": { icono: Global, color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", descripcion: "Sitios web, catálogo y analítica" },
  "Redes sociales y Agentes": { icono: Chart, color: "bg-rose-500/15 text-rose-600 dark:text-rose-400", descripcion: "Instagram, agentes IA y programación de contenido" },
  "Gestión MAILS": { icono: Sms, color: "bg-red-500/15 text-red-600 dark:text-red-400", descripcion: "Centro de mails, buzones, leads y direcciones" },
  "WhatsApp": { icono: Message, color: "bg-green-500/15 text-green-600 dark:text-green-400", descripcion: "Conversaciones de WhatsApp dentro del dashboard" },
  "CRM": { icono: Profile2User, color: "bg-orange-500/15 text-orange-600 dark:text-orange-400", descripcion: "Leads, propuestas y correos" },
  "Comercial": { icono: Call, color: "bg-teal-500/15 text-teal-600 dark:text-teal-400", descripcion: "Agentes comerciales y llamadas a listas de empresas" },
  "Prospección": { icono: Send2, color: "bg-blue-500/15 text-blue-600 dark:text-blue-400", descripcion: "Prospección de empresas y análisis SEO" },
  "N8N Labs": { icono: Flash, color: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400", descripcion: "Diagnósticos y leads de N8N Labs" },
  "Administración": { icono: ShieldTick, color: "bg-slate-500/15 text-slate-600 dark:text-slate-300", descripcion: "Usuarios y permisos del Dashboard" },
};
const infoVista = (v: string) => VISTAS_INFO[v] ?? { icono: Setting2, color: "bg-muted text-muted-foreground", descripcion: "" };

const ACCIONES: Record<string, string> = {
  carga_inicial: "Carga inicial", usuario_creado: "Usuario creado", usuario_editado: "Usuario editado", rol_cambiado: "Rol cambiado", usuario_activado: "Usuario activado",
  usuario_desactivado: "Usuario desactivado", permisos_usuario: "Permisos de usuario", permisos_rol: "Permisos de rol", permisos_copiados: "Permisos copiados", modulos_aplicados: "Módulos donde mandan los permisos",
};
const fechaHora = (iso: string) => new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

async function api(url: string, metodo: string, cuerpo?: unknown) {
  const r = await fetch(url, { method: metodo, headers: { "Content-Type": "application/json" }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || "Error");
  return j;
}

const prefijo = (clave: string) => clave.split(".")[0];

/** Usuarios y permisos (solo superadmins): se entra por vista → módulo → permisos, y en cada módulo se ve qué roles y personas tienen cada permiso. */
export default function UsuariosPermisosPage() {
  const [todo, setTodo] = useState<Todo | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState("vistas");
  const [editando, setEditando] = useState<Usuario | "nuevo" | null>(null);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    setError(null);
    try {
      const [t, a] = await Promise.all([api("/api/usuarios-permisos", "GET"), api("/api/usuarios-permisos/auditoria", "GET")]);
      setTodo(t as Todo);
      setRegistros(a.registros || []);
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

  // Vista (dashboard) → módulo → permisos, en el orden del catálogo.
  const vistas = useMemo<Vistas>(() => {
    const v = new Map<string, Map<string, Permiso[]>>();
    for (const p of todo?.catalogo ?? []) {
      if (!v.has(p.vista)) v.set(p.vista, new Map());
      const m = v.get(p.vista)!;
      if (!m.has(p.modulo)) m.set(p.modulo, []);
      m.get(p.modulo)!.push(p);
    }
    return Array.from(v.entries()).map(([vista, m]) => [vista, Array.from(m.entries())] as [string, [string, Permiso[]][]]);
  }, [todo]);

  async function alternarPrefijos(prefijos: string[], activar: boolean) {
    if (!todo || prefijos.length === 0) return;
    const nombres = prefijos.map((m) => NOMBRE_MODULO[m] ?? m.replace(/_/g, " ")).join(", ");
    if (activar && !window.confirm(`A partir de ahora el acceso a: ${nombres} lo deciden los permisos de esta pantalla, no las listas de antes. ¿Activar?`)) return;
    try {
      const nuevos = activar ? Array.from(new Set([...todo.aplicar, ...prefijos])) : todo.aplicar.filter((x) => !prefijos.includes(x));
      await api("/api/usuarios-permisos/modulos", "PUT", { modulos: nuevos });
      toast.success(activar ? "Ahora mandan los permisos" : "Vuelve al sistema anterior");
      await cargar(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar");
    }
  }

  async function alternarActivo(u: Usuario) {
    try {
      await api(`/api/usuarios-permisos/usuarios/${u.id}`, "PATCH", { activo: !u.activo });
      toast.success(u.activo ? `${u.nombre} desactivado` : `${u.nombre} activado`);
      await cargar(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar");
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold"><ShieldTick className="size-5" /> Usuarios y permisos</h1>
          <p className="text-sm text-muted-foreground">Quién puede entrar a cada vista del Dashboard y qué puede hacer dentro. Roles: super admin, empleado local y empleado remoto.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setEditando("nuevo")}><UserAdd className="size-4" /> Nuevo usuario</Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar"><Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} /></Button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>}

      <Tabs value={pestana} onValueChange={(v) => setPestana(String(v))}>
        <TabsList>
          <TabsTrigger value="vistas">Vistas y permisos</TabsTrigger>
          <TabsTrigger value="personas">Personas</TabsTrigger>
          <TabsTrigger value="registro">Registro de cambios</TabsTrigger>
        </TabsList>

        {/* ───────── Vistas y permisos ───────── */}
        <TabsContent value="vistas">
          {!todo ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
          ) : (
            <PermisosPorPersona todo={todo} vistas={vistas} onCambio={() => cargar(true)} onAlternar={alternarPrefijos} onEditar={(u) => setEditando(u)} />
          )}
        </TabsContent>

        {/* ───────── Personas ───────── */}
        <TabsContent value="personas">
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

        {/* ───────── Registro ───────── */}
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
          vistas={vistas}
          onCerrar={() => setEditando(null)}
          onGuardado={async () => { setEditando(null); await cargar(true); }}
        />
      )}
    </div>
  );
}

// ───────────────────────── Detalle de una vista / módulo ─────────────────────────

/** ¿Mandan ya los permisos sobre estos permisos? (según los módulos preparados y encendidos). */
function estadoMando(todo: Todo, permisos: Permiso[]) {
  const prefijos = Array.from(new Set(permisos.map((p) => prefijo(p.clave))));
  const migrables = prefijos.filter((x) => todo.migrables.includes(x));
  const encendidos = migrables.filter((x) => todo.aplicar.includes(x));
  const estado: "si" | "parcial" | "no" | "sin" =
    migrables.length === 0 ? "sin"
    : encendidos.length === migrables.length ? (migrables.length < prefijos.length ? "parcial" : "si")
    : encendidos.length > 0 ? "parcial"
    : "no";
  return { prefijos, migrables, encendidos, estado };
}

const TEXTO_MANDO: Record<string, string> = {
  si: "Mandan los permisos",
  parcial: "Parcialmente",
  no: "Aún decide el sistema anterior",
  sin: "Sin preparar",
};
const CLASE_MANDO: Record<string, string> = {
  si: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  parcial: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  no: "bg-muted text-muted-foreground",
  sin: "bg-muted text-muted-foreground",
};

const iniciales = (nombre: string) => nombre.replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("") || "?";

// ───────────────────────── Permisos por persona ─────────────────────────

/** Izquierda: roles y personas. Derecha: las vistas de la persona elegida; con «Puede entrar» activado salen sus acciones (ver, crear, editar, borrar…). */
function PermisosPorPersona({ todo, vistas, onCambio, onAlternar, onEditar }: {
  todo: Todo; vistas: Vistas; onCambio: () => Promise<void>;
  onAlternar: (prefijos: string[], activar: boolean) => Promise<void>; onEditar: (u: Usuario) => void;
}) {
  const primera = todo.usuarios.find((u) => u.activo && u.rol !== "super_admin");
  const [sel, setSel] = useState<string>(primera ? `u:${primera.id}` : "r:empleado_local");
  const [q, setQ] = useState("");
  const [cerradas, setCerradas] = useState<Set<string>>(new Set());
  const [guardando, setGuardando] = useState<string | null>(null);

  const usuario = sel.startsWith("u:") ? todo.usuarios.find((u) => u.id === Number(sel.slice(2))) : undefined;
  const rolSel = sel.startsWith("r:") ? (sel.slice(2) as Rol) : undefined;
  const esSuper = usuario?.rol === "super_admin";
  const bloqueadoTodo = esSuper || (!!usuario && !usuario.activo);

  const valor = (clave: string): boolean => {
    if (esSuper) return true;
    if (usuario) return usuario.efectivos[clave] === true;
    return rolSel ? todo.roles[rolSel]?.[clave] === true : false;
  };

  async function cambiar(clave: string, v: boolean) {
    setGuardando(clave);
    try {
      if (usuario) {
        const delRol = todo.roles[usuario.rol]?.[clave] ?? false;
        await api(`/api/usuarios-permisos/usuarios/${usuario.id}/permisos`, "PUT", { cambios: { [clave]: v === delRol ? null : v } });
      } else if (rolSel) {
        await api(`/api/usuarios-permisos/roles/${rolSel}/permisos`, "PUT", { cambios: { [clave]: v } });
      }
      await onCambio();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(null);
    }
  }

  async function quitarExcepciones() {
    if (!usuario) return;
    const cambios: Record<string, null> = {};
    for (const k of Object.keys(usuario.excepciones)) cambios[k] = null;
    try {
      await api(`/api/usuarios-permisos/usuarios/${usuario.id}/permisos`, "PUT", { cambios });
      toast.success("Vuelve a lo que le corresponde por su rol");
      await onCambio();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    }
  }

  const alternarAbierta = (v: string) => setCerradas((prev) => { const n = new Set(prev); if (n.has(v)) n.delete(v); else n.add(v); return n; });

  // Vistas con algo que decidir (se oculta el permiso de administrar usuarios: no se reparte desde aquí).
  const filas = vistas.map(([vista, mods]) => {
    const todos = mods.flatMap(([, ps]) => ps).filter((p) => p.clave !== "usuarios.administrar");
    const entrada = todos.find((p) => p.es_entrada);
    const acciones = todos.filter((p) => !p.es_entrada);
    return { vista, mods, todos, entrada, acciones };
  }).filter((f) => f.todos.length > 0);

  const entradas = (u: Usuario) => filas.filter((f) => f.entrada && u.efectivos[f.entrada.clave]).length;
  const totalConEntrada = filas.filter((f) => f.entrada).length;
  const filtro = q.trim().toLowerCase();
  const personas = todo.usuarios.filter((u) => !filtro || u.nombre.toLowerCase().includes(filtro) || u.email.toLowerCase().includes(filtro));
  const rolesEditables = ROLES.filter((r) => r.clave !== "super_admin");
  const nExc = usuario ? Object.keys(usuario.excepciones).length : 0;

  return (
    <div className="mt-4 grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* ── Izquierda: a quién se le dan permisos ── */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm lg:sticky lg:top-4">
        <div className="border-b bg-muted/30 p-2">
          <div className="relative">
            <SearchNormal1 className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar persona…" className="h-8 pl-7 text-xs" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
          <div className="bg-muted/40 px-3 py-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Por defecto de cada rol</div>
          {rolesEditables.map((r) => (
            <button key={r.clave} type="button" onClick={() => setSel(`r:${r.clave}`)}
              className={cn("flex w-full items-center justify-between gap-2 border-t px-3 py-2 text-left text-sm transition hover:bg-muted/50", sel === `r:${r.clave}` && "bg-primary/10")}>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${r.clase}`}>{r.etiqueta}</span>
              <span className="text-[11px] text-muted-foreground">todos los de este rol</span>
            </button>
          ))}
          <div className="bg-muted/40 px-3 py-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Personas</div>
          {personas.map((u) => (
            <button key={u.id} type="button" onClick={() => setSel(`u:${u.id}`)}
              className={cn("flex w-full items-center gap-2.5 border-t px-3 py-2 text-left transition hover:bg-muted/50", sel === `u:${u.id}` && "bg-primary/10", !u.activo && "opacity-50")}>
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", rolDe(u.rol).clase)}>{iniciales(u.nombre)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{u.nombre}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {rolDe(u.rol).etiqueta}{!u.activo ? " · desactivado" : u.rol === "super_admin" ? " · todo" : ` · ${entradas(u)} de ${totalConEntrada} vistas`}
                </span>
              </span>
            </button>
          ))}
          {personas.length === 0 && <div className="border-t px-3 py-5 text-center text-sm text-muted-foreground">Nadie coincide.</div>}
        </div>
      </div>

      {/* ── Derecha: sus vistas y lo que puede hacer en cada una ── */}
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
          {usuario ? (
            <span className={cn("flex size-10 items-center justify-center rounded-full text-sm font-semibold", rolDe(usuario.rol).clase)}>{iniciales(usuario.nombre)}</span>
          ) : (
            <span className="flex size-10 items-center justify-center rounded-full bg-muted"><Profile2User className="size-5" /></span>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{usuario ? usuario.nombre : `Todos los «${rolDe(rolSel ?? "").etiqueta}»`}</div>
            <div className="text-xs text-muted-foreground">
              {esSuper ? "Super admin: puede entrar a todo y hacerlo todo."
                : usuario ? `${rolDe(usuario.rol).etiqueta}${nExc > 0 ? ` · ${nExc} excepcion${nExc !== 1 ? "es" : ""} sobre su rol` : " · sin excepciones, igual que su rol"}`
                : "Lo que marques aquí vale para todas las personas de este rol (salvo las que tengan excepciones)."}
            </div>
          </div>
          {usuario && nExc > 0 && !esSuper && <Button variant="outline" size="sm" className="h-8" onClick={quitarExcepciones}>Volver a lo del rol</Button>}
          {usuario && <Button variant="outline" size="sm" className="h-8" onClick={() => onEditar(usuario)}>Editar datos</Button>}
        </div>

        <p className="text-xs text-muted-foreground">Activa «Puede entrar» en cada vista y, dentro, marca lo que puede hacer. Se guarda al momento.</p>

        <div className="space-y-2">
          {filas.map(({ vista, mods, entrada, acciones, todos }) => {
            const info = infoVista(vista);
            const Icono = info.icono;
            const entra = entrada ? valor(entrada.clave) : true;
            const abierta = !cerradas.has(vista) && entra;
            const nOn = acciones.filter((p) => valor(p.clave)).length;
            const { migrables, estado } = estadoMando(todo, todos);
            return (
              <div key={vista} className={cn("overflow-hidden rounded-xl border bg-card shadow-sm", !entra && "bg-muted/20")}>
                <div className="flex items-center gap-3 p-3">
                  <button type="button" onClick={() => entra && acciones.length > 0 && alternarAbierta(vista)} className="flex min-w-0 flex-1 items-center gap-3 text-left" disabled={!entra || acciones.length === 0}>
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", info.color, !entra && "opacity-50")}><Icono className="size-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{vista}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {!entra ? "Sin acceso: no la ve en su menú" : acciones.length === 0 ? "Entra y ve la vista" : `Puede hacer ${nOn} de ${acciones.length} cosas`}
                      </span>
                      {entrada && (PAGINAS_POR_PERMISO[entrada.clave]?.length ?? 0) > 0 && (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {PAGINAS_POR_PERMISO[entrada.clave].map((n) => <span key={n} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{n}</span>)}
                        </span>
                      )}
                    </span>
                    {entra && acciones.length > 0 && <ArrowRight2 className={cn("size-4 shrink-0 text-muted-foreground transition", abierta && "rotate-90")} />}
                  </button>
                  {entrada && (
                    <label className="flex shrink-0 items-center gap-2 text-xs font-medium">
                      Puede entrar
                      <Switch
                        checked={entra}
                        disabled={bloqueadoTodo || guardando === entrada.clave}
                        onCheckedChange={(v) => { void cambiar(entrada.clave, v === true); if (v === true) setCerradas((p) => { const n = new Set(p); n.delete(vista); return n; }); }}
                      />
                    </label>
                  )}
                </div>

                {abierta && (
                  <div className="grid gap-3 border-t bg-muted/10 p-3 md:grid-cols-2">
                    {mods.map(([modulo, ps]) => {
                      const propios = ps.filter((p) => !p.es_entrada && p.clave !== "usuarios.administrar");
                      if (propios.length === 0) return null;
                      const nOnMod = propios.filter((p) => valor(p.clave)).length;
                      return (
                        <div key={modulo} className="overflow-hidden rounded-lg border bg-card">
                          <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-1.5">
                            <span className="text-xs font-bold tracking-wider uppercase">{modulo}</span>
                            <span className="text-[11px] text-muted-foreground">{nOnMod} de {propios.length}</span>
                          </div>
                          <div className="divide-y">
                            {propios.map((p) => {
                              const exc = !!usuario && p.clave in usuario.excepciones;
                              const paginas = PAGINAS_POR_PERMISO[p.clave] ?? [];
                              return (
                                <label key={p.clave} className="flex cursor-pointer items-start gap-2.5 px-3 py-2 text-sm hover:bg-muted/30" title={p.descripcion ?? undefined}>
                                  <Checkbox className="mt-0.5" checked={valor(p.clave)} disabled={bloqueadoTodo || guardando === p.clave} onCheckedChange={(v) => cambiar(p.clave, v === true)} />
                                  <span className="min-w-0 flex-1 leading-tight">
                                    <span className="font-medium">{p.etiqueta}</span>
                                    {exc && <span className="ml-1.5 rounded bg-amber-500/15 px-1 py-0.5 text-[9px] font-medium text-amber-700 dark:text-amber-300">excepción</span>}
                                    {p.descripcion && <span className="block text-[11px] font-normal text-muted-foreground">{p.descripcion}</span>}
                                    {paginas.length > 0 && (
                                      <span className="mt-1 flex flex-wrap gap-1">
                                        {paginas.map((n) => <span key={n} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-normal text-primary">{n}</span>)}
                                      </span>
                                    )}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Interruptor general de la vista (vale para todas las personas) */}
                {(abierta || !entrada) && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2 text-xs">
                    <span className="text-muted-foreground">¿Mandan estos permisos en esta vista? <span className={cn("ml-1 rounded px-1.5 py-0.5 text-[10px] font-medium", CLASE_MANDO[estado])}>{TEXTO_MANDO[estado]}</span></span>
                    <Switch checked={estado === "si" || estado === "parcial"} disabled={migrables.length === 0} onCheckedChange={(v) => onAlternar(migrables, v === true)}
                      title={migrables.length > 0 ? "Activa o apaga los permisos de esta vista para todas las personas" : "Todavía no está preparada: la gobierna el sistema anterior"} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Páginas del menú lateral que abre cada permiso (sale del propio menú, así no se desfasa). */
const PAGINAS_POR_PERMISO: Record<string, string[]> = (() => {
  const m: Record<string, string[]> = {};
  const add = (clave: string, etiqueta: string) => { (m[clave] ??= []).push(etiqueta); };
  for (const g of GRUPOS) for (const it of g.items) if (it.permiso) add(it.permiso, it.label);
  add(ITEM_LLAMADAS.permiso ?? "llamadas.ver", ITEM_LLAMADAS.label);
  add("informes.resenas", "Reporte de reseñas");
  add("equipos_entregados.ver", "Equipos entregados");
  add("extractor_discos.ver", "Extractor de discos");
  for (const it of GRUPO_CONTABILIDAD.items) add(it.label === "Efectivo y caja" ? "contabilidad.efectivo" : "contabilidad.ver", it.label);
  for (const it of GRUPO_ADMIN.items) add("admin.eliminar_registros", it.label);
  return m;
})();

type Estado = "hereda" | "permite" | "deniega";

function EditarUsuario({ usuario, todo, vistas, onCerrar, onGuardado }: {
  usuario: Usuario | null; todo: Todo; vistas: Vistas; onCerrar: () => void; onGuardado: () => Promise<void>;
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
        for (const [, mods] of vistas) for (const [, ps] of mods) for (const p of ps) {
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
                {vistas.map(([vista, mods], iv) => {
                  const todos = mods.flatMap(([, ps]) => ps).filter((p) => p.clave !== "usuarios.administrar");
                  if (todos.length === 0) return null;
                  const permitidos = todos.filter((p) => efectivo(p.clave)).length;
                  return (
                  <details key={vista} open={iv === 0} className="group border-t first:border-t-0">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 bg-primary/10 px-3 py-2 text-sm font-bold text-primary">
                      <span>Vista: {vista}</span>
                      <span className="text-xs font-medium text-muted-foreground">{permitidos} de {todos.length} permitidos</span>
                    </summary>
                    {mods.map(([modulo, permisos]) => (
                  <div key={modulo}>
                    <div className="bg-muted/40 px-3 py-1 pl-5 text-xs font-bold tracking-wider text-muted-foreground uppercase">Módulo: {modulo}</div>
                    {permisos.filter((p) => p.clave !== "usuarios.administrar").map((p) => {
                      const st = estados[p.clave] ?? "hereda";
                      const porRol = todo.roles[rol]?.[p.clave] ?? false;
                      return (
                        <div key={p.clave} className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-1.5">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm">{p.etiqueta}{p.es_entrada && <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">entrada a la vista</span>}</div>
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
                  </details>
                  );
                })}
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
