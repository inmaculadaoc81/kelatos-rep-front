"use client";

import { useCallback, useEffect, useState } from "react";
import { CloseCircle, Refresh2, TickCircle } from "@/lib/icons";
import { Button } from "@/components/ui/button";

type Estado = { cargando: true } | { cargando: false; configurado: boolean; total?: number; error?: string };

/** Estado de la conexión con Chatwoot: comprueba que el servidor tiene el token y que Chatwoot responde. */
export default function ConexionWhatsappPage() {
  const [estado, setEstado] = useState<Estado>({ cargando: true });

  const comprobar = useCallback(async () => {
    setEstado({ cargando: true });
    try {
      const res = await fetch("/api/whatsapp/conversaciones?estado=open", { cache: "no-store" });
      const d = await res.json();
      if (!d.ok) return setEstado({ cargando: false, configurado: true, error: d.error || "Error desconocido" });
      setEstado({ cargando: false, configurado: d.configurado !== false, total: d.total });
    } catch (e) {
      setEstado({ cargando: false, configurado: true, error: e instanceof Error ? e.message : "Error desconocido" });
    }
  }, []);

  useEffect(() => { comprobar(); }, [comprobar]);

  const ok = !estado.cargando && estado.configurado && !estado.error;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Conexión con Chatwoot</h1>
          <p className="text-sm text-muted-foreground">El dashboard lee y escribe los WhatsApp a través de la API de Chatwoot, que sigue funcionando igual.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={comprobar} disabled={estado.cargando}>
          <Refresh2 className={`size-4 ${estado.cargando ? "animate-spin" : ""}`} /> Comprobar
        </Button>
      </div>

      <div className={`flex items-start gap-3 rounded-lg border p-4 ${estado.cargando ? "" : ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/10"}`}>
        {estado.cargando ? <Refresh2 className="mt-0.5 size-5 animate-spin text-muted-foreground" /> : ok ? <TickCircle className="mt-0.5 size-5 text-emerald-600" /> : <CloseCircle className="mt-0.5 size-5 text-amber-600" />}
        <div className="text-sm">
          {estado.cargando && <p className="font-medium">Comprobando…</p>}
          {!estado.cargando && ok && (
            <>
              <p className="font-medium text-emerald-700 dark:text-emerald-400">Conectado</p>
              <p className="text-muted-foreground">Chatwoot responde. Hay {estado.total?.toLocaleString("es-ES")} conversaciones abiertas en la bandeja de WhatsApp.</p>
            </>
          )}
          {!estado.cargando && !estado.configurado && (
            <>
              <p className="font-medium text-amber-700 dark:text-amber-300">Sin configurar</p>
              <p className="text-muted-foreground">El servidor no tiene el token de Chatwoot (variable <code>CHATWOOT_API_TOKEN</code>).</p>
            </>
          )}
          {!estado.cargando && estado.configurado && estado.error && (
            <>
              <p className="font-medium text-amber-700 dark:text-amber-300">No se pudo conectar</p>
              <p className="text-muted-foreground">{estado.error}</p>
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 text-sm">
        <p className="mb-2 font-semibold">Datos de la conexión</p>
        <dl className="grid grid-cols-[9rem_1fr] gap-y-1.5">
          <dt className="text-muted-foreground">Servidor</dt><dd>chat.affirmatechnology.com</dd>
          <dt className="text-muted-foreground">Cuenta</dt><dd>2</dd>
          <dt className="text-muted-foreground">Bandeja</dt><dd>1 (WhatsApp de Kelatos)</dd>
          <dt className="text-muted-foreground">Token</dt><dd>guardado en el servidor (no se muestra)</dd>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Para cambiar el token (por ejemplo, si lo rotas en Chatwoot) hay que actualizarlo en la configuración del servidor. Si Chatwoot cambia de dirección, también.
        </p>
        <a href="https://chat.affirmatechnology.com/app/accounts/2/dashboard" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs underline-offset-2 hover:underline">Abrir Chatwoot</a>
      </div>
    </div>
  );
}
