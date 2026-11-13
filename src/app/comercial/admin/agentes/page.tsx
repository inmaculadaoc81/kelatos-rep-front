"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiComercial, type AgenteComercial } from "@/lib/comercial";
import { cn } from "@/lib/utils";

/** Agentes comerciales: quién puede entrar al panel. Solo administradores (lo exige también la API). */
export default function AgentesPage() {
  const [agentes, setAgentes] = useState<AgenteComercial[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setAgentes((await apiComercial<{ agentes: AgenteComercial[] }>("agentes")).agentes);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void cargar(), 0);
    return () => clearTimeout(t);
  }, [cargar]);

  async function alta() {
    if (!email.trim() || !nombre.trim()) return toast.error("Escribe el correo y el nombre");
    setGuardando(true);
    try {
      await apiComercial("agentes", { metodo: "POST", cuerpo: { email: email.trim(), nombre: nombre.trim() } });
      setEmail(""); setNombre("");
      toast.success("Agente dado de alta. Ya puede entrar con esa cuenta de Google.");
      void cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo dar de alta");
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarActivo(a: AgenteComercial) {
    try {
      await apiComercial(`agentes/${encodeURIComponent(a.email)}`, { metodo: "PATCH", cuerpo: { activo: !a.activo } });
      toast.success(a.activo ? "Agente desactivado (deja de poder entrar en unos minutos)" : "Agente activado");
      void cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Agentes</h1>
        <p className="text-sm text-muted-foreground">Las personas que llaman desde su ordenador. Entran con su cuenta de Google y solo ven este panel: no tienen acceso al resto del dashboard ni a las transcripciones.</p>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-primary">Dar de alta a un agente</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Nombre</label>
            <Input className="w-56" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Correo de su cuenta de Google</label>
            <Input className="w-72" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@gmail.com" />
          </div>
          <Button onClick={alta} disabled={guardando}>{guardando ? "Guardando…" : "Dar de alta"}</Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      {!agentes && !error && <Skeleton className="h-32 w-full" />}
      {agentes && agentes.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Todavía no hay agentes.</p>}
      {agentes && agentes.length > 0 && (
        <ul className="space-y-2">
          {agentes.map((a) => (
            <li key={a.email} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{a.nombre}</div>
                <div className="text-sm text-muted-foreground">{a.email} · {a.contactos ?? 0} contactos asignados</div>
              </div>
              <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", a.activo ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-slate-500/10 text-slate-600 dark:text-slate-300")}>{a.activo ? "Activo" : "Desactivado"}</span>
              <Button variant="outline" size="sm" onClick={() => cambiarActivo(a)}>{a.activo ? "Desactivar" : "Activar"}</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
