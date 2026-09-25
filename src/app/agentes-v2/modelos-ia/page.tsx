"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { enviarV2, useV2 } from "@/components/agentes-v2/use-v2";
import { Cabecera, CargandoFilas, ErrorCaja } from "@/components/agentes-v2/componentes";
import { fechaHora } from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";

interface Perfil {
  slug: string;
  label: string;
  host: string;
  default_model: string | null;
  available: boolean;
  private_api: boolean;
}

interface Estado {
  ok: boolean;
  settings: { profile: string; model: string | null; timeout_seconds: number; max_tokens: number; temperature: number; updated_at: string | null; updated_by: string | null };
  profiles: Perfil[];
  effective: { profile: string; host: string; model: string | null; ready: boolean };
}

interface Prueba {
  ok: boolean;
  host?: string;
  model?: string;
  latency_ms?: number;
  json_ok?: boolean;
  error?: string;
}

/** Modelos IA: qué servidor y modelo usan el AI CMO y los departamentos. Las direcciones y claves siguen en el servidor
    (nunca se muestran); aquí solo se elige el perfil y los parámetros. Los agentes de captación actuales no cambian. */
export default function ModelosIaPage() {
  const { datos, error, cargando, recargar } = useV2<Estado>("llm-config");
  const [perfil, setPerfil] = useState("");
  const [modelo, setModelo] = useState("");
  const [timeout, setTimeoutS] = useState("90");
  const [tokens, setTokens] = useState("1500");
  const [temperatura, setTemperatura] = useState("0.1");
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);
  const [prueba, setPrueba] = useState<Prueba | null>(null);

  useEffect(() => {
    if (!datos) return;
    setPerfil(datos.settings.profile);
    setModelo(datos.settings.model ?? "");
    setTimeoutS(String(datos.settings.timeout_seconds));
    setTokens(String(datos.settings.max_tokens));
    setTemperatura(String(datos.settings.temperature));
  }, [datos]);

  const ajustes = () => ({ profile: perfil, model: modelo.trim() || null, timeout_seconds: Number(timeout), max_tokens: Number(tokens), temperature: Number(temperatura) });
  const perfilElegido = datos?.profiles.find((p) => p.slug === perfil);

  const guardar = async () => {
    setGuardando(true);
    try {
      await enviarV2("PUT", "llm-config", ajustes());
      toast.success("Configuración guardada");
      setPrueba(null);
      recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  const probar = async () => {
    setProbando(true);
    setPrueba(null);
    try {
      const r = await enviarV2<{ ok: boolean; test: Prueba }>("POST", "llm-config/test", { settings: ajustes() });
      setPrueba(r.test);
    } catch (e) {
      setPrueba({ ok: false, error: e instanceof Error ? e.message : "No se pudo probar la conexión" });
    } finally {
      setProbando(false);
    }
  };

  return (
    <div>
      <Cabecera titulo="Modelos IA" descripcion="Qué servidor y modelo de IA usan el AI CMO y los departamentos. Cambiar de servidor no afecta a los agentes de captación actuales." />
      {error && <ErrorCaja mensaje={error} />}
      {cargando && !datos ? (
        <CargandoFilas n={3} />
      ) : datos ? (
        <div className="max-w-3xl space-y-6">
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">Servidor</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {datos.profiles.map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  disabled={!p.available}
                  aria-pressed={perfil === p.slug}
                  onClick={() => { setPerfil(p.slug); setPrueba(null); }}
                  className={cn("rounded-lg border p-3 text-left transition-colors", perfil === p.slug ? "border-primary bg-primary/5" : "hover:bg-muted/40", !p.available && "cursor-not-allowed opacity-50")}
                >
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{p.host || "—"}</p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {p.available ? (p.private_api ? "API privada · lista" : "Nube · lista") : "No configurado en el servidor"}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="modelo">Modelo</Label>
              <Input id="modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder={perfilElegido?.default_model ? `Por defecto: ${perfilElegido.default_model}` : "Nombre del modelo"} />
              <p className="text-xs text-muted-foreground">Déjalo vacío para usar el modelo por defecto del servidor elegido.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timeout">Tiempo máximo de espera (segundos)</Label>
              <Input id="timeout" type="number" min={5} max={300} value={timeout} onChange={(e) => setTimeoutS(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tokens">Máximo de tokens por respuesta</Label>
              <Input id="tokens" type="number" min={100} max={8000} value={tokens} onChange={(e) => setTokens(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="temp">Temperatura (0 = más preciso, 1,5 = más creativo)</Label>
              <Input id="temp" type="number" step="0.05" min={0} max={1.5} value={temperatura} onChange={(e) => setTemperatura(e.target.value)} />
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={guardar} disabled={guardando || !perfil}>{guardando ? "Guardando…" : "Guardar"}</Button>
            <Button variant="outline" onClick={probar} disabled={probando || !perfil}>{probando ? "Probando…" : "Probar conexión"}</Button>
            <span className="text-xs text-muted-foreground">
              Ahora se usa: {datos.effective.model ?? "—"} en {datos.effective.host || "—"}
              {datos.settings.updated_at ? ` · guardado ${fechaHora(datos.settings.updated_at)}${datos.settings.updated_by ? ` por ${datos.settings.updated_by}` : ""}` : ""}
            </span>
          </div>

          {prueba && (
            <div className={cn("rounded-lg border p-3 text-sm", prueba.ok ? "border-green-500/30 bg-green-500/5 text-green-800" : "border-red-500/30 bg-red-500/5 text-red-700")}>
              {prueba.ok
                ? `Conexión correcta con ${prueba.host} (${prueba.model}) en ${((prueba.latency_ms ?? 0) / 1000).toFixed(1)} s${prueba.json_ok ? "; responde en formato JSON." : "; ojo: no devolvió JSON válido."}`
                : `No se pudo conectar: ${prueba.error}`}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            «Probar conexión» usa los valores del formulario sin guardarlos. Las direcciones y claves de acceso se gestionan en el servidor y no se muestran aquí.
          </p>
        </div>
      ) : null}
    </div>
  );
}
