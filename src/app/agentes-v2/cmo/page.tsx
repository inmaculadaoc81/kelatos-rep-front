"use client";

import { Cpu } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useV2 } from "@/components/agentes-v2/use-v2";
import { Cabecera, EstadoDepartamentoBadge } from "@/components/agentes-v2/componentes";
import type { Panel } from "@/lib/agentes-v2";
import Link from "next/link";

const EJEMPLOS = [
  "Quiero que SEO cambie su enfoque a clínicas privadas y publique 5 artículos por semana.",
  "Pausa el departamento de Anuncios hasta nuevo aviso.",
  "Que Redes sociales publique por la mañana, de lunes a viernes.",
];

/** Centro de control estratégico. En esta fase solo existe el marco: el AI CMO (interpretar instrucciones,
    proponer cambios y pedir aprobación) se construye en la fase C. */
export default function CmoPage() {
  const { datos } = useV2<Panel>("overview");
  return (
    <div>
      <Cabecera titulo="AI CMO" descripcion="La cabeza estratégica del sistema: entiende lo que quieres cambiar, propone los ajustes a cada departamento y espera tu aprobación." />

      <div className="mb-6 rounded-lg border bg-muted/30 p-4 text-sm">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Cpu className="size-5" /></span>
          <div className="space-y-1">
            <p className="font-medium">Disponible en la siguiente fase</p>
            <p className="text-muted-foreground">
              Cuando esté activo podrás escribirle una instrucción y verás una propuesta con el antes y el después de cada cambio (audiencia, temas, frecuencia, horario…).
              Nada se aplicará sin que pulses «Aplicar cambios».
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Dile qué quieres cambiar</h2>
          <Textarea disabled rows={3} placeholder="Quiero que SEO cambie su enfoque a clínicas privadas…" />
          <Button disabled>Enviar al AI CMO</Button>
          <h3 className="pt-2 text-xs font-medium text-muted-foreground">Ejemplos de lo que podrás pedirle</h3>
          <ul className="space-y-1.5">
            {EJEMPLOS.map((e) => <li key={e} className="rounded-md border px-3 py-2 text-sm text-muted-foreground">«{e}»</li>)}
          </ul>
        </section>

        <aside>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Estado de los departamentos</h2>
          <ul className="divide-y rounded-lg border">
            {(datos?.departments ?? []).map((d) => (
              <li key={d.key} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <Link href={`/agentes-v2/departamentos/${d.key}`} className="truncate hover:underline">{d.name}</Link>
                <EstadoDepartamentoBadge estado={d.status} />
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
