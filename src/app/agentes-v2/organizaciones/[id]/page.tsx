"use client";

import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { Building, Global, Lock, Refresh2, Verify } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { enviarV2, useV2 } from "@/components/agentes-v2/use-v2";
import { Cabecera, CargandoFilas, ErrorCaja } from "@/components/agentes-v2/componentes";
import { COLOR_ESTADO_ORGANIZACION, ETIQUETA_ESTADO_ORGANIZACION, type DetalleOrganizacion, type EstadoOrganizacion } from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";

/** Cadena aleatoria para el secreto de firmado de las URLs públicas (HMAC): es un valor interno de Kelatos, no
    algo que venga de Meta ni de ningún sitio externo — no tiene sentido pedírselo a quien rellena el formulario. */
function generarSecretoAleatorio(): string {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function CampoSecreto({ id, label, valor, onChange, guardado, ayuda, conGenerar }: { id: string; label: string; valor: string; onChange: (v: string) => void; guardado: boolean; ayuda?: string; conGenerar?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input id={id} type="text" value={valor} onChange={(e) => onChange(e.target.value)} placeholder={guardado ? "•••••••••••••••• (guardado — déjalo vacío para no cambiarlo)" : "Pégalo aquí"} className="font-mono text-xs" />
        {conGenerar && (
          <Button type="button" variant="outline" onClick={() => onChange(generarSecretoAleatorio())}>Generar</Button>
        )}
      </div>
      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  );
}

function PestanaGeneral({ d, recargar }: { d: DetalleOrganizacion; recargar: () => void }) {
  const [name, setName] = useState(d.organization.name);
  const [description, setDescription] = useState(d.organization.description);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { setName(d.organization.name); setDescription(d.organization.description); }, [d.organization.name, d.organization.description]);

  async function guardar() {
    if (!name.trim()) return toast.error("El nombre es obligatorio");
    setGuardando(true);
    try {
      await enviarV2("PATCH", `organizations/${d.organization.id}`, { name: name.trim(), description: description.trim() });
      toast.success("Guardado");
      recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(status: EstadoOrganizacion) {
    setGuardando(true);
    try {
      await enviarV2("PATCH", `organizations/${d.organization.id}`, { status });
      toast.success(status === "active" ? "Organización activada" : status === "paused" ? "Organización en pausa" : "Organización desactivada");
      recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar el estado");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <section className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="key">Clave</Label>
          <Input id="key" value={d.organization.key} disabled />
          <p className="text-xs text-muted-foreground">La clave no se puede cambiar una vez creada la organización.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Descripción</Label>
          <Textarea id="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar cambios"}</Button>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Estado</h2>
        <div className="flex flex-wrap gap-2">
          {(["active", "paused", "disabled"] as const).map((s) => (
            <button
              key={s}
              type="button"
              disabled={guardando}
              onClick={() => cambiarEstado(s)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                d.organization.status === s ? COLOR_ESTADO_ORGANIZACION[s] : "text-muted-foreground hover:bg-muted/40"
              )}
            >
              {ETIQUETA_ESTADO_ORGANIZACION[s]}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">En pausa o desactivada: sus workflows automáticos (redes sociales, SEO) dejan de dispararse.</p>
      </section>
    </div>
  );
}

function PestanaInstagram({ d, recargar }: { d: DetalleOrganizacion; recargar: () => void }) {
  const ig = d.instagram;
  const [graphApiUrl, setGraphApiUrl] = useState(ig.graph_api_url || "https://graph.facebook.com/v21.0");
  const [cuentaId, setCuentaId] = useState(ig.instagram_business_account_id || "");
  const [baseUrl, setBaseUrl] = useState(ig.public_base_url || "");
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setGraphApiUrl(ig.graph_api_url || "https://graph.facebook.com/v21.0");
    setCuentaId(ig.instagram_business_account_id || "");
    setBaseUrl(ig.public_base_url || "");
    setToken("");
    setSecret("");
  }, [ig.graph_api_url, ig.instagram_business_account_id, ig.public_base_url]);

  async function guardar() {
    if (!cuentaId.trim()) return toast.error("Indica el ID de la cuenta de Instagram de empresa");
    setGuardando(true);
    try {
      await enviarV2("PUT", `organizations/${d.organization.id}/instagram`, {
        graph_api_url: graphApiUrl.trim(),
        instagram_business_account_id: cuentaId.trim(),
        public_base_url: baseUrl.trim(),
        ...(token.trim() ? { token: token.trim() } : {}),
        ...(secret.trim() ? { secret: secret.trim() } : {}),
      });
      toast.success("Credenciales de Instagram guardadas");
      setToken("");
      setSecret("");
      recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className={cn("flex items-center gap-2 rounded-lg border p-3 text-sm", ig.configurado ? "border-green-500/30 bg-green-500/5 text-green-800" : "border-amber-500/30 bg-amber-500/5 text-amber-800")}>
        <Verify className="size-4 shrink-0" />
        {ig.configurado ? "Instagram configurado: esta organización puede publicar." : "Falta completar la cuenta, el token y el secreto para poder publicar."}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cuenta">ID de la cuenta de Instagram de empresa *</Label>
        <Input id="cuenta" value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} placeholder="17800000000000000" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="base-url">URL pública de esta organización</Label>
        <Input id="base-url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.ejemplo.com" />
        <p className="text-xs text-muted-foreground">Dónde puede leer Meta las imágenes/vídeos generados para publicarlos (la URL pública del backend, no la web de la marca).</p>
      </div>
      <CampoSecreto id="token" label="Token de acceso (Meta Graph API) *" valor={token} onChange={setToken} guardado={ig.token_guardado} ayuda="Generado en Meta Business Manager, con permiso sobre esta cuenta." />
      <CampoSecreto id="secret" label="Secreto de firmado de URLs *" valor={secret} onChange={setSecret} guardado={ig.secreto_guardado} conGenerar ayuda="Interno de Kelatos: pulsa «Generar» si es la primera vez, no hace falta traerlo de ningún sitio." />
      <div className="space-y-1.5">
        <Label htmlFor="graph-url">URL base de la API de Meta</Label>
        <Input id="graph-url" value={graphApiUrl} onChange={(e) => setGraphApiUrl(e.target.value)} />
      </div>
      <Button onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar credenciales"}</Button>
    </div>
  );
}

function PestanaSeo({ d, recargar }: { d: DetalleOrganizacion; recargar: () => void }) {
  const s = d.seo_site;
  const [url, setUrl] = useState(s.url || "");
  const [repository, setRepository] = useState(s.repository || "");
  const [branch, setBranch] = useState(s.branch);
  const [contentPath, setContentPath] = useState(s.content_path);
  const [imagePath, setImagePath] = useState(s.image_path);
  const [publishMode, setPublishMode] = useState(s.publish_mode);
  const [publishTarget, setPublishTarget] = useState(s.publish_target);
  const [maxPerDay, setMaxPerDay] = useState(String(s.max_per_day));
  const [maxPerWeek, setMaxPerWeek] = useState(String(s.max_per_week));
  const [githubToken, setGithubToken] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setUrl(s.url || ""); setRepository(s.repository || ""); setBranch(s.branch); setContentPath(s.content_path); setImagePath(s.image_path);
    setPublishMode(s.publish_mode); setPublishTarget(s.publish_target); setMaxPerDay(String(s.max_per_day)); setMaxPerWeek(String(s.max_per_week)); setGithubToken("");
  }, [s.url, s.repository, s.branch, s.content_path, s.image_path, s.publish_mode, s.publish_target, s.max_per_day, s.max_per_week]);

  async function guardar() {
    setGuardando(true);
    try {
      await enviarV2("PUT", `organizations/${d.organization.id}/seo-site`, {
        url: url.trim(), repository: repository.trim(), branch: branch.trim(), content_path: contentPath.trim(), image_path: imagePath.trim(),
        publish_mode: publishMode, publish_target: publishTarget, max_per_day: Number(maxPerDay) || 2, max_per_week: Number(maxPerWeek) || 5,
        ...(githubToken.trim() ? { github_token: githubToken.trim() } : {}),
      });
      toast.success("Sitio SEO guardado");
      setGithubToken("");
      recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className={cn("flex items-center gap-2 rounded-lg border p-3 text-sm", s.configurado ? "border-green-500/30 bg-green-500/5 text-green-800" : "border-amber-500/30 bg-amber-500/5 text-amber-800")}>
        <Global className="size-4 shrink-0" />
        {s.configurado ? "Sitio SEO configurado." : "El blog de esta organización todavía no tiene dominio y/o repositorio."}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="url">Dominio de la web</Label>
        <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://marca-ejemplo.com" />
        <p className="text-xs text-muted-foreground">Se usa para reconocer qué organización pide el blog público (por el dominio de la visita).</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="destino">Dónde se publican los artículos</Label>
          <Select value={publishTarget} onValueChange={(v) => setPublishTarget(v as typeof publishTarget)}>
            <SelectTrigger id="destino"><SelectValue>{() => (publishTarget === "db" ? "Base de datos de Kelatos" : "Repositorio de GitHub")}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="db">Base de datos de Kelatos</SelectItem>
              <SelectItem value="github">Repositorio de GitHub</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="modo">Aprobación</Label>
          <Select value={publishMode} onValueChange={(v) => setPublishMode(v as typeof publishMode)}>
            <SelectTrigger id="modo"><SelectValue>{() => (publishMode === "auto" ? "Automática" : "Manual (revisar antes)")}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual (revisar antes)</SelectItem>
              <SelectItem value="auto">Automática</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {publishTarget === "github" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="repo">Repositorio</Label>
            <Input id="repo" value={repository} onChange={(e) => setRepository(e.target.value)} placeholder="usuario/repositorio" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="branch">Rama</Label>
              <Input id="branch" value={branch} onChange={(e) => setBranch(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="content-path">Carpeta de artículos</Label>
              <Input id="content-path" value={contentPath} onChange={(e) => setContentPath(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="image-path">Carpeta de imágenes</Label>
              <Input id="image-path" value={imagePath} onChange={(e) => setImagePath(e.target.value)} />
            </div>
          </div>
          <CampoSecreto id="gh-token" label="Token de GitHub" valor={githubToken} onChange={setGithubToken} guardado={s.token_guardado} ayuda="Con permiso de escritura sobre ese repositorio." />
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="max-dia">Máximo de artículos al día</Label>
          <Input id="max-dia" type="number" min={1} max={10} value={maxPerDay} onChange={(e) => setMaxPerDay(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="max-semana">Máximo de artículos a la semana</Label>
          <Input id="max-semana" type="number" min={1} max={50} value={maxPerWeek} onChange={(e) => setMaxPerWeek(e.target.value)} />
        </div>
      </div>

      <Button onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar sitio SEO"}</Button>
    </div>
  );
}

export default function OrganizacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { datos, error, cargando, recargar } = useV2<DetalleOrganizacion>(`organizations/${id}`);

  return (
    <div>
      <Cabecera
        titulo={datos ? datos.organization.name : "Organización"}
        descripcion={datos ? `Clave: ${datos.organization.key}` : undefined}
        acciones={<Button variant="outline" size="icon" onClick={() => recargar()}><Refresh2 className="size-4" /></Button>}
      />
      {error && <ErrorCaja mensaje={error} />}
      {cargando && !datos ? (
        <CargandoFilas n={3} />
      ) : datos ? (
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general"><Building className="size-4" /> General</TabsTrigger>
            <TabsTrigger value="instagram"><Lock className="size-4" /> Instagram</TabsTrigger>
            <TabsTrigger value="seo"><Global className="size-4" /> Sitio SEO</TabsTrigger>
          </TabsList>
          <TabsContent value="general"><PestanaGeneral d={datos} recargar={recargar} /></TabsContent>
          <TabsContent value="instagram"><PestanaInstagram d={datos} recargar={recargar} /></TabsContent>
          <TabsContent value="seo"><PestanaSeo d={datos} recargar={recargar} /></TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
