"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiComercial } from "@/lib/comercial";
import { useComercial } from "../contexto";

const EJEMPLO = `PRESENTACIÓN
Hola, buenos días, soy [nombre] de Kelatos. ¿Hablo con el responsable de [empresa]?

MOTIVO (30 segundos)
Ayudamos a empresas como la suya a ahorrar horas de trabajo automatizando tareas repetitivas: correos, facturas, agendas, mensajes…

PREGUNTAS PARA CALIFICAR
- ¿Cuántas personas trabajan en la empresa?
- ¿Qué tarea les quita más tiempo cada semana?
- ¿Quién decide sobre estas herramientas?

CIERRE
Le propongo una reunión gratuita de 30 minutos, sin compromiso, para verlo con un ejemplo de su negocio. ¿Le va mejor mañana por la mañana o por la tarde?

OBJECIONES
- «Ahora no tengo tiempo» → Lo entiendo; ¿le llamo mañana a las [hora]? Solo serán 2 minutos.
- «No me interesa» → Sin problema. ¿Es porque ya lo tienen resuelto o porque no es una prioridad ahora?
- «Envíeme información por correo» → Con gusto. ¿A qué correo? Y para que sea útil, ¿qué es lo que más le interesaría ver?`;

/** Guion de llamada: texto que el administrador mantiene (presentación, preguntas, objeciones) y que el agente consulta mientras llama. */
export default function GuionPage() {
  const { admin } = useComercial();
  const [texto, setTexto] = useState<string | null>(null);
  const [borrador, setBorrador] = useState("");
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    apiComercial<{ guion: string }>("guion").then((d) => { if (vivo) { setTexto(d.guion); setBorrador(d.guion); } }).catch(() => { if (vivo) setTexto(""); });
    return () => { vivo = false; };
  }, []);

  async function guardar() {
    setGuardando(true);
    try {
      await apiComercial("guion", { metodo: "PUT", cuerpo: { guion: borrador } });
      setTexto(borrador);
      setEditando(false);
      toast.success("Guion guardado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Guion de llamada</h1>
          <p className="text-sm text-muted-foreground">Qué decir, qué preguntar y cómo responder a las objeciones más comunes.</p>
        </div>
        {admin && !editando && texto !== null && <Button variant="outline" onClick={() => { setBorrador(texto || EJEMPLO); setEditando(true); }}>{texto ? "Editar guion" : "Crear guion"}</Button>}
      </div>

      {texto === null ? (
        <Skeleton className="h-64 w-full" />
      ) : editando ? (
        <div className="space-y-3">
          <Textarea value={borrador} onChange={(e) => setBorrador(e.target.value)} className="min-h-96 font-mono text-sm" />
          <div className="flex gap-2">
            <Button onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</Button>
            <Button variant="ghost" onClick={() => setEditando(false)} disabled={guardando}>Cancelar</Button>
          </div>
        </div>
      ) : texto ? (
        <article className="whitespace-pre-wrap rounded-2xl border bg-card p-5 text-sm leading-relaxed shadow-sm">{texto}</article>
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Todavía no hay un guion. {admin ? "Pulsa «Crear guion» para empezar con una plantilla." : "Tu responsable lo añadirá pronto."}
        </div>
      )}
    </div>
  );
}
