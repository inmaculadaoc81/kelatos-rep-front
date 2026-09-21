"use client";

import { useState } from "react";
import { Sms, TickCircle, CloseCircle } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Buzon, PROVEEDORES, ResultadoPrueba, SeguridadMail } from "@/lib/mails";

interface Formulario {
  email: string;
  nombre: string;
  proveedor: string;
  password: string;
  imap_host: string;
  imap_port: string;
  imap_seguridad: SeguridadMail;
  imap_usuario: string;
  smtp_host: string;
  smtp_port: string;
  smtp_seguridad: SeguridadMail;
  smtp_usuario: string;
  smtp_password: string;
  carpetas_vigiladas: string;
  carpeta_enviados: string;
  sincronizar_desde: string;
}

function hoyMenos(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

function formularioInicial(b: Buzon | null): Formulario {
  if (b) {
    return {
      email: b.email,
      nombre: b.nombre,
      proveedor: b.proveedor,
      password: "",
      imap_host: b.imap_host,
      imap_port: String(b.imap_port),
      imap_seguridad: b.imap_seguridad,
      imap_usuario: b.imap_usuario,
      smtp_host: b.smtp_host,
      smtp_port: String(b.smtp_port),
      smtp_seguridad: b.smtp_seguridad,
      smtp_usuario: b.smtp_usuario,
      smtp_password: "",
      carpetas_vigiladas: b.carpetas_vigiladas.join(", "),
      carpeta_enviados: b.carpeta_enviados,
      sincronizar_desde: b.sincronizar_desde,
    };
  }
  const p = PROVEEDORES.hostinger;
  return {
    email: "",
    nombre: "",
    proveedor: "hostinger",
    password: "",
    imap_host: p.imap_host,
    imap_port: String(p.imap_port),
    imap_seguridad: p.imap_seguridad,
    imap_usuario: "",
    smtp_host: p.smtp_host,
    smtp_port: String(p.smtp_port),
    smtp_seguridad: p.smtp_seguridad,
    smtp_usuario: "",
    smtp_password: "",
    carpetas_vigiladas: "INBOX",
    carpeta_enviados: p.carpeta_enviados,
    sincronizar_desde: hoyMenos(30),
  };
}

function SelectorSeguridad({ valor, onChange }: { valor: SeguridadMail; onChange: (v: SeguridadMail) => void }) {
  return (
    <Select value={valor} onValueChange={(v) => v && onChange(v as SeguridadMail)}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="SSL">SSL/TLS</SelectItem>
        <SelectItem value="STARTTLS">STARTTLS</SelectItem>
        <SelectItem value="NINGUNA">Ninguna</SelectItem>
      </SelectContent>
    </Select>
  );
}

/** Alta y edición de un buzón (solo superadmin). Al editar, dejar la
    contraseña en blanco conserva la guardada — nunca se muestra. */
export function BuzonDialog({
  buzon,
  open,
  onOpenChange,
  onGuardado,
}: {
  buzon: Buzon | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuardado: () => void;
}) {
  const esEdicion = buzon !== null;
  const [f, setF] = useState<Formulario>(() => formularioInicial(buzon));
  const [avanzado, setAvanzado] = useState(false);
  const [probando, setProbando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [prueba, setPrueba] = useState<ResultadoPrueba | null>(null);

  const cambiar = <K extends keyof Formulario>(k: K, v: Formulario[K]) => {
    setF((prev) => ({ ...prev, [k]: v }));
    setPrueba(null);
  };

  function elegirProveedor(id: string) {
    const p = PROVEEDORES[id];
    if (!p) return;
    setF((prev) => ({
      ...prev,
      proveedor: id,
      imap_host: p.imap_host,
      imap_port: String(p.imap_port),
      imap_seguridad: p.imap_seguridad,
      smtp_host: p.smtp_host,
      smtp_port: String(p.smtp_port),
      smtp_seguridad: p.smtp_seguridad,
      carpeta_enviados: p.carpeta_enviados,
    }));
    setPrueba(null);
  }

  function cuerpo() {
    const c: Record<string, unknown> = {
      email: f.email.trim(),
      nombre: f.nombre.trim(),
      proveedor: f.proveedor,
      imap_host: f.imap_host.trim(),
      imap_port: Number(f.imap_port),
      imap_seguridad: f.imap_seguridad,
      imap_usuario: f.imap_usuario.trim() || f.email.trim(),
      smtp_host: f.smtp_host.trim(),
      smtp_port: Number(f.smtp_port),
      smtp_seguridad: f.smtp_seguridad,
      smtp_usuario: f.smtp_usuario.trim() || f.imap_usuario.trim() || f.email.trim(),
      carpetas_vigiladas: f.carpetas_vigiladas,
      carpeta_enviados: f.carpeta_enviados.trim(),
      sincronizar_desde: f.sincronizar_desde,
    };
    if (f.password) c.imap_password = f.password;
    if (f.smtp_password) c.smtp_password = f.smtp_password;
    return c;
  }

  async function probar() {
    if (!f.email.trim()) return toast.error("Indica el correo del buzón");
    if (!esEdicion && !f.password) return toast.error("Indica la contraseña");
    setProbando(true);
    setPrueba(null);
    try {
      const res = await fetch("/api/mails/buzones/probar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cuerpo(), ...(esEdicion ? { id: buzon!.id } : {}) }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setPrueba(data.resultado as ResultadoPrueba);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setProbando(false);
    }
  }

  async function guardar() {
    if (!f.email.trim()) return toast.error("Indica el correo del buzón");
    if (!esEdicion && !f.password) return toast.error("Indica la contraseña del buzón");
    setGuardando(true);
    try {
      const res = await fetch(esEdicion ? `/api/mails/buzones/${buzon!.id}` : "/api/mails/buzones", {
        method: esEdicion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo()),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(esEdicion ? "Buzón actualizado" : "Buzón añadido: empezará a sincronizarse en unos minutos");
      onOpenChange(false);
      onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  const ayuda = PROVEEDORES[f.proveedor]?.ayuda;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (guardando) return;
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto sm:max-w-2xl" showCloseButton={!guardando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sms className="size-5" /> {esEdicion ? "Editar buzón" : "Añadir buzón"}
          </DialogTitle>
          <DialogDescription>
            La contraseña se guarda cifrada y no se vuelve a mostrar. El app solo lee el buzón: no marca, mueve ni borra nada en el servidor de correo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mbEmail">Correo *</Label>
              <Input id="mbEmail" type="email" placeholder="soporte@midominio.com" value={f.email} onChange={(e) => cambiar("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mbNombre">Nombre (opcional)</Label>
              <Input id="mbNombre" placeholder="Soporte" value={f.nombre} onChange={(e) => cambiar("nombre", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Proveedor</Label>
              <Select value={f.proveedor} onValueChange={(v) => v && elegirProveedor(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: string) => PROVEEDORES[v]?.etiqueta || v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROVEEDORES).map(([id, p]) => (
                    <SelectItem key={id} value={id}>
                      {p.etiqueta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mbPass">{esEdicion ? "Contraseña (vacía = no cambiar)" : "Contraseña *"}</Label>
              <Input id="mbPass" type="password" autoComplete="new-password" value={f.password} onChange={(e) => cambiar("password", e.target.value)} />
            </div>
          </div>
          {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}

          <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground sm:col-span-3">Recibir (IMAP)</p>
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="mbImapHost">Servidor</Label>
              <Input id="mbImapHost" value={f.imap_host} onChange={(e) => cambiar("imap_host", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mbImapPort">Puerto</Label>
              <Input id="mbImapPort" inputMode="numeric" value={f.imap_port} onChange={(e) => cambiar("imap_port", e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="space-y-1.5">
              <Label>Seguridad</Label>
              <SelectorSeguridad valor={f.imap_seguridad} onChange={(v) => cambiar("imap_seguridad", v)} />
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground sm:col-span-3">Enviar (SMTP)</p>
            <div className="space-y-1.5">
              <Label htmlFor="mbSmtpHost">Servidor</Label>
              <Input id="mbSmtpHost" value={f.smtp_host} onChange={(e) => cambiar("smtp_host", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mbSmtpPort">Puerto</Label>
              <Input id="mbSmtpPort" inputMode="numeric" value={f.smtp_port} onChange={(e) => cambiar("smtp_port", e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="space-y-1.5">
              <Label>Seguridad</Label>
              <SelectorSeguridad valor={f.smtp_seguridad} onChange={(v) => cambiar("smtp_seguridad", v)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mbVigiladas">Carpetas que se leen</Label>
              <Input id="mbVigiladas" placeholder="INBOX, INBOX.Respuestas" value={f.carpetas_vigiladas} onChange={(e) => cambiar("carpetas_vigiladas", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mbEnviados">Carpeta de enviados</Label>
              <Input id="mbEnviados" value={f.carpeta_enviados} onChange={(e) => cambiar("carpeta_enviados", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mbDesde">Sincronizar desde</Label>
              <Input id="mbDesde" type="date" value={f.sincronizar_desde} onChange={(e) => cambiar("sincronizar_desde", e.target.value)} />
            </div>
          </div>

          <button type="button" className="text-xs text-primary underline-offset-2 hover:underline" onClick={() => setAvanzado((v) => !v)}>
            {avanzado ? "Ocultar" : "Mostrar"} usuario y contraseña distintos para IMAP/SMTP
          </button>
          {avanzado && (
            <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="mbImapUser">Usuario IMAP</Label>
                <Input id="mbImapUser" placeholder="por defecto, el correo" value={f.imap_usuario} onChange={(e) => cambiar("imap_usuario", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mbSmtpUser">Usuario SMTP</Label>
                <Input id="mbSmtpUser" placeholder="por defecto, el de IMAP" value={f.smtp_usuario} onChange={(e) => cambiar("smtp_usuario", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mbSmtpPass">Contraseña SMTP</Label>
                <Input id="mbSmtpPass" type="password" autoComplete="new-password" placeholder="por defecto, la misma" value={f.smtp_password} onChange={(e) => cambiar("smtp_password", e.target.value)} />
              </div>
            </div>
          )}

          {prueba && (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
              <p className={`flex items-start gap-1.5 ${prueba.imap.ok ? "text-green-600" : "text-red-600"}`}>
                {prueba.imap.ok ? <TickCircle className="mt-0.5 size-4 shrink-0" /> : <CloseCircle className="mt-0.5 size-4 shrink-0" />}
                <span>
                  <strong>IMAP:</strong> {prueba.imap.ok ? "conexión correcta" : prueba.imap.error}
                </span>
              </p>
              {prueba.imap.ok && prueba.imap.carpetas && (
                <div className="flex flex-wrap items-center gap-1 pl-5.5 text-xs">
                  <span className="text-muted-foreground">Carpetas del servidor (pulsa para usarla como «enviados»):</span>
                  {prueba.imap.carpetas.map((c) => (
                    <button
                      key={c.ruta}
                      type="button"
                      className="rounded border bg-card px-1.5 py-0.5 hover:bg-muted"
                      title={c.especial || undefined}
                      onClick={() => setF((prev) => ({ ...prev, carpeta_enviados: c.ruta }))}
                    >
                      {c.ruta}
                    </button>
                  ))}
                </div>
              )}
              <p className={`flex items-start gap-1.5 ${prueba.smtp.ok ? "text-green-600" : "text-red-600"}`}>
                {prueba.smtp.ok ? <TickCircle className="mt-0.5 size-4 shrink-0" /> : <CloseCircle className="mt-0.5 size-4 shrink-0" />}
                <span>
                  <strong>SMTP:</strong> {prueba.smtp.ok ? "conexión correcta" : prueba.smtp.error}
                </span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={guardando} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="outline" disabled={probando || guardando} onClick={probar}>
            {probando ? "Probando…" : "Probar conexión"}
          </Button>
          <Button disabled={guardando || probando} onClick={guardar}>
            {guardando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Añadir buzón"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
