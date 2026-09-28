"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CargandoFilas, ErrorCaja } from "@/components/agentes-v2/componentes";
import { enviarV2 } from "@/components/agentes-v2/use-v2";
import { cn } from "@/lib/utils";
import { Campo, Selector } from "./campos";
import { useAuto, type ConfigAuto, type TipoCarrusel } from "./use-social";

const lineas = (t: string) => t.split(/\n/).map((x) => x.trim()).filter(Boolean);

function Formulario({ inicial, tipos, alGuardar }: { inicial: ConfigAuto; tipos: TipoCarrusel[]; alGuardar: () => void }) {
  const [c, setC] = useState<ConfigAuto>(() => structuredClone(inicial));
  const [temas, setTemas] = useState(inicial.temas.join("\n"));
  const [guardando, setGuardando] = useState(false);
  const cambia = (p: Partial<ConfigAuto>) => setC({ ...c, ...p });
  const nTemas = lineas(temas).length;

  const alternar = (id: string) => cambia({ tipos: c.tipos.includes(id) ? c.tipos.filter((x) => x !== id) : [...c.tipos, id] });

  const guardar = async () => {
    if (!c.tipos.length) return toast.error("Activa al menos un tipo de carrusel");
    if (c.slidesMin > c.slidesMax) return toast.error("El mínimo de slides no puede superar al máximo");
    setGuardando(true);
    try {
      await enviarV2("PUT", "social/automation", { ...c, temas: lineas(temas) });
      toast.success("Estrategia guardada: se aplica desde el próximo carrusel");
      alGuardar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar la estrategia");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <section className="space-y-3 rounded-lg border p-4">
        <div>
          <h3 className="text-sm font-semibold">Instrucciones para la IA</h3>
          <p className="text-xs text-muted-foreground">Es el «prompt» del departamento: a quién le hablas, de qué y qué evitar. La IA lo lee al buscar temas y al escribir cada carrusel.</p>
        </div>
        <Textarea rows={9} value={c.prompt} onChange={(e) => cambia({ prompt: e.target.value })} className="min-h-0 text-sm" maxLength={4000} />
        <p className="text-right text-[10px] tabular-nums text-muted-foreground">{c.prompt.length}/4000</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Audiencia"><Input value={c.audiencia} maxLength={300} onChange={(e) => cambia({ audiencia: e.target.value })} className="h-8 text-sm" /></Campo>
          <Campo etiqueta="Tono"><Input value={c.tono} maxLength={120} onChange={(e) => cambia({ tono: e.target.value })} className="h-8 text-sm" /></Campo>
          <Campo etiqueta="Llamada a la acción del cierre" className="sm:col-span-2" ayuda="Lo que dice el botón o la última slide de cada carrusel."><Input value={c.cta} maxLength={120} onChange={(e) => cambia({ cta: e.target.value })} className="h-8 text-sm" /></Campo>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <div>
          <h3 className="text-sm font-semibold">Temas que buscará <span className="font-normal text-muted-foreground">({nTemas})</span></h3>
          <p className="text-xs text-muted-foreground">Automatizaciones y sectores de inspiración, uno por línea. La IA los combina de forma variada y también propone otros que no estén aquí.</p>
        </div>
        <Textarea rows={10} value={temas} onChange={(e) => setTemas(e.target.value)} className="min-h-0 font-mono text-xs" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.descubrir} onChange={(e) => cambia({ descubrir: e.target.checked })} className="accent-primary" />Buscar temas nuevos automáticamente (cada semana y cuando la cola se vacíe)</label>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <div>
          <h3 className="text-sm font-semibold">Tipos de carrusel</h3>
          <p className="text-xs text-muted-foreground">Cada carrusel sigue la estructura de un tipo. El sistema los va alternando para que dos seguidos no se parezcan: desactiva los que no quieras.</p>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {tipos.map((t) => {
            const on = c.tipos.includes(t.id);
            return (
              <button key={t.id} type="button" onClick={() => alternar(t.id)} className={cn("space-y-1 rounded-lg border p-3 text-left transition-colors", on ? "border-primary/60 bg-primary/5" : "opacity-60 hover:opacity-100")}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{t.nombre}</p>
                  <span className={cn("size-4 rounded border text-center text-[10px] leading-[14px]", on ? "border-primary bg-primary text-primary-foreground" : "")}>{on ? "✓" : ""}</span>
                </div>
                <p className="text-xs text-muted-foreground">Ej.: «{t.ejemplo}»</p>
                <p className="text-[11px] text-muted-foreground">{t.slides[0]}–{t.slides[1]} slides</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Producción</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Máximo por día"><Input type="number" min={1} max={10} value={c.maxPorDia} onChange={(e) => cambia({ maxPorDia: Number(e.target.value) || 1 })} className="h-8 text-sm" /></Campo>
          <Campo etiqueta="Máximo en 7 días"><Input type="number" min={1} max={50} value={c.maxPorSemana} onChange={(e) => cambia({ maxPorSemana: Number(e.target.value) || 1 })} className="h-8 text-sm" /></Campo>
          <Campo etiqueta="Slides mínimo"><Input type="number" min={3} max={12} value={c.slidesMin} onChange={(e) => cambia({ slidesMin: Number(e.target.value) || 3 })} className="h-8 text-sm" /></Campo>
          <Campo etiqueta="Slides máximo"><Input type="number" min={3} max={12} value={c.slidesMax} onChange={(e) => cambia({ slidesMax: Number(e.target.value) || 3 })} className="h-8 text-sm" /></Campo>
        </div>
        <p className="text-[11px] text-muted-foreground">Los carruseles que generes a mano no cuentan para estos máximos. Cuándo se lanza cada uno se ajusta en «Horario».</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Aprobación" ayuda={c.aprobacion === "manual" ? "Cada carrusel espera en Aprobaciones a que lo revises. Recomendado hasta que la publicación esté conectada." : "Quedan aprobados nada más generarse: tu workflow de n8n podrá cogerlos sin que hagas nada. Úsalo cuando confíes en el resultado."}>
            <Selector valor={c.aprobacion} onChange={(v) => cambia({ aprobacion: v })} opciones={[{ valor: "manual", texto: "Manual: pasa por revisión" }, { valor: "auto", texto: "Automática: aprobado al generarse" }]} />
          </Campo>
          <Campo etiqueta="Diseño" ayuda={c.estilo === "marca" ? "Todos los carruseles usan el estilo visual de la marca (se cambia en «Marca»)." : "Cada carrusel usa un estilo distinto (tecnológico, editorial y clásico) para que el perfil no se vea repetitivo."}>
            <Selector valor={c.estilo} onChange={(v) => cambia({ estilo: v })} opciones={[{ valor: "marca", texto: "El de la marca" }, { valor: "rotar", texto: "Ir rotando entre estilos" }]} />
          </Campo>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button disabled={guardando} onClick={guardar}>{guardando ? "Guardando…" : "Guardar estrategia"}</Button>
        <p className="text-xs text-muted-foreground">Los cambios se aplican a los carruseles nuevos; los ya generados no se tocan.</p>
      </div>
    </div>
  );
}

export function Estrategia() {
  const { datos, error, cargando, recargar } = useAuto();
  if (error && !datos) return <ErrorCaja mensaje={error} />;
  if (!datos) return cargando ? <CargandoFilas /> : null;
  return <Formulario key={JSON.stringify(datos.config)} inicial={datos.config} tipos={datos.tipos} alGuardar={() => void recargar()} />;
}
