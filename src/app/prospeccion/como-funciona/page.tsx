import Link from "next/link";

// Explicación del agente de prospección para el equipo. Página estática.

const PASOS: { t: string; d: string }[] = [
  { t: "Elige a quién escribir", d: "Toma empresas de Gestión MAILS → Leads con estado «Pendiente» y correo válido. Puedes limitarlo por grupo de envío o sector. Nunca escribe a «No contactar», «Inválido» ni a quien ya respondió, ni a direcciones que rebotaron." },
  { t: "La IA analiza y redacta", d: "La IA local lee los datos de la empresa y devuelve un análisis (qué hace, encaje alto/medio/bajo, puntuación, motivos y riesgos) y un correo corto con tu propuesta, tu tono, tu firma y el texto de baja. Tarda cerca de un minuto por mensaje." },
  { t: "Revisión", d: "En «Con aprobación» el mensaje queda como borrador: lo abres en «Mensajes», lo lees junto a su análisis, lo editas si quieres y lo apruebas o descartas. En «Automático» se aprueba solo; en «Simulación» nunca se envía." },
  { t: "Envío con freno", d: "Solo si el agente está activo: dentro del horario, respetando el límite diario y el tiempo mínimo entre envíos, desde el buzón elegido. Cada envío queda guardado también en la bandeja de Gestión MAILS." },
  { t: "Seguimiento", d: "El Resumen cuenta enviados, borradores, respuestas y rebotes. Si la empresa responde o el correo rebota, el estado del lead cambia solo (lo hace Gestión MAILS) y se refleja aquí." },
];

const PREGUNTAS: { p: string; r: string }[] = [
  { p: "¿Puede enviar algo sin que yo lo sepa?", r: "No mientras esté apagado (es como viene) ni en simulación. Para que envíe solo hay que activarlo, elegir buzón y poner el modo «Automático»." },
  { p: "¿Cómo lo pruebo sin riesgo?", r: "Déjalo en «Simulación» o «Con aprobación», pulsa «Redactar 3 de prueba» en Mensajes y revisa lo que escribe. No se envía nada hasta que apruebes y envíes." },
  { p: "¿Por qué dice que no hay empresas listas?", r: "Porque ninguna está en «Pendiente». Las que están en «No contactar» se respetan siempre. Importa o cambia a «Pendiente» las que quieras trabajar en Gestión MAILS → Leads." },
  { p: "¿Cómo se da de baja alguien?", r: "Cada correo lleva un texto de baja. Si responde «BAJA», márcalo «No contactar» en Gestión MAILS y el agente no volverá a escribirle." },
  { p: "¿Qué hago si un mensaje sale mal?", r: "Edítalo antes de aprobar o descártalo. Si pasa a menudo, mejora la «Propuesta» y el «Tono» en Agente." },
];

export default function ComoFuncionaProspeccionPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-lg font-semibold">Cómo funciona la Prospección</h1>
        <p className="mt-1 text-sm text-muted-foreground">Un agente que escribe a empresas de nuestra base con ayuda de la IA local, siempre con tu control: apagado por defecto, con aprobación y con límites.</p>
      </div>
      <ol className="space-y-2">
        {PASOS.map((p, i) => (
          <li key={p.t} className="flex items-start gap-3 rounded-lg border bg-card p-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{i + 1}</span>
            <div><p className="text-sm font-semibold">{p.t}</p><p className="mt-1 text-sm text-muted-foreground">{p.d}</p></div>
          </li>
        ))}
      </ol>
      <section>
        <h2 className="mb-3 text-base font-semibold">Preguntas frecuentes</h2>
        <div className="space-y-2">
          {PREGUNTAS.map((q) => (
            <details key={q.p} className="rounded-lg border bg-card p-3 text-sm">
              <summary className="cursor-pointer font-medium">{q.p}</summary>
              <p className="mt-2 text-muted-foreground">{q.r}</p>
            </details>
          ))}
        </div>
      </section>
      <p className="text-sm text-muted-foreground">
        ¿Listo? Ve al <Link href="/prospeccion" className="font-medium text-primary underline">Resumen</Link> o configura el <Link href="/prospeccion/agente" className="font-medium text-primary underline">Agente</Link>.
      </p>
    </div>
  );
}
