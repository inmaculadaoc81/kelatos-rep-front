"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Formulario de email+contraseña — deliberadamente client-side con
    signIn() de next-auth/react en vez de un Server Action: la redirección
    que dispara un Server Action hacia una ruta interna (p.ej. "/" tras
    entrar) se rompe en este hosting ("This page couldn't load", mismo
    síntoma ya visto al cerrar sesión). redirect:false + navegación manual
    por window.location evita ese mecanismo por completo. El botón de
    Google no sufre esto porque redirige a un dominio externo, así que se
    deja como Server Action en page.tsx. 2026-08-31. */
export function CredentialsForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [entrando, setEntrando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEntrando(true);
    setError(false);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setError(true);
        setEntrando(false);
      } else {
        window.location.href = "/";
      }
    } catch {
      setError(true);
      setEntrando(false);
    }
  }

  return (
    <form className="space-y-3 text-left" onSubmit={onSubmit}>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p className="text-xs text-destructive">Email o contraseña incorrectos.</p>}
      <Button type="submit" className="w-full" disabled={entrando}>{entrando ? "Entrando…" : "Iniciar sesión"}</Button>
    </form>
  );
}
