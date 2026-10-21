import Link from "next/link";
import { ETAPAS } from "@/lib/crm";

// Explicación del CRM para el equipo (petición del usuario, 2026-10-21). Página estática.

const CANALES: { nombre: string; que: string; estado: "listo" | "conectado" | "pendiente" }[] = [
  { nombre: "Alta manual", que: "Botón «Nuevo lead» y anotar llamadas, mensajes y notas a mano en la ficha.", estado: "listo" },
  { nombre: "WhatsApp (Chatwoot)", que: "Cada persona que escribe al WhatsApp de Kelatos (o Kelatos NL) crea su lead solo, o actualiza el que ya tiene. La conversación queda en su línea de tiempo, una entrada por día. Si ya es cliente, no se crea lead. Los mensajes del bot se anotan pero no cuentan como contacto: cuando responde una persona, pasa a «Contactado».", estado: "conectado" },
  { nombre: "Llamadas (Retell)", que: "Al terminar cada llamada de un agente de voz se guarda el resumen, la transcripción y la duración.", estado: "pendiente" },
  { nombre: "Webs y formularios", que: "Cada formulario de contacto de las webs crea un lead con sus datos.", estado: "pendiente" },
];

const AUTOMATICO: { cuando: string; que: string; auto: boolean }[] = [
  { cuando: "Alguien escribe al WhatsApp y no es cliente", que: "se crea el lead en «Nuevo».", auto: true },
  { cuando: "Responde una persona (no el bot) o anotas un contacto tuyo", que: "pasa de «Nuevo» a «Contactado».", auto: true },
  { cuando: "Se crea un resguardo (o un alquiler) con su teléfono", que: "pasa a «Ganado» y se enlaza con su cliente, esté en la etapa que esté.", auto: true },
  { cuando: "Un lead «Perdido» vuelve a escribir", que: "se reabre en «Nuevo» y se quita el motivo.", auto: true },
  { cuando: "Le das un precio", que: "lo pasas a «Presupuesto» arrastrando la tarjeta.", auto: false },
  { cuando: "No sigue adelante", que: "lo pasas a «Perdido» (y anotas el motivo si quieres).", auto: false },
];

const PREGUNTAS: { p: string; r: string }[] = [
  { p: "¿Qué es un lead y qué es un cliente?", r: "Un lead es alguien que ha contactado pero todavía no nos ha comprado nada. Cuando acepta un presupuesto o trae un equipo pasa a «Ganado» y ya es cliente (con su resguardo en Reparaciones)." },
  { p: "¿Y si la misma persona escribe por WhatsApp y luego llama?", r: "Se reconoce por el teléfono: sigue siendo una sola ficha y la llamada se añade a la misma línea de tiempo. Si intentas crear a mano un lead con un teléfono que ya existe, el sistema te avisa y te abre la ficha." },
  { p: "¿Cómo muevo un lead de etapa?", r: "Arrastrando su tarjeta a otra columna del Tablero, o cambiando la etapa dentro de su ficha. Cada cambio queda anotado en la línea de tiempo." },
  { p: "¿Para qué sirve la «próxima acción»?", r: "Es lo siguiente que hay que hacer con ese lead y para qué día (por ejemplo «llamarle el viernes»). Si el día pasa y no se hizo, la ficha se marca en rojo y suma a «Acciones vencidas»." },
  { p: "¿Qué hago con un lead que ya no responde?", r: "Muévelo a «Perdido» y, si quieres, anota el motivo. No se borra: se queda en la Lista por si vuelve a escribir." },
];

export default function ComoFuncionaPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-lg font-semibold">Cómo funciona el CRM</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Un CRM es un solo lugar donde se apunta a <strong>cada persona que contacta con nosotros</strong> y todo lo que pasa con ella, para que ninguna consulta se quede sin respuesta ni se pierda por falta de seguimiento.
        </p>
      </div>

      <Seccion titulo="1. El recorrido de un lead">
        <p className="mb-3 text-sm text-muted-foreground">Cada persona avanza por estas etapas, que son las columnas del Tablero:</p>
        <ol className="space-y-2">
          {ETAPAS.map((e, i) => (
            <li key={e.id} className="flex items-start gap-3 rounded-lg border bg-card p-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{i + 1}</span>
              <div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.chip}`}>{e.nombre}</span>
                <p className="mt-1 text-sm text-muted-foreground">{e.descripcion}</p>
              </div>
            </li>
          ))}
        </ol>
      </Seccion>

      <Seccion titulo="Qué se mueve solo y qué se mueve a mano">
        <div className="overflow-hidden rounded-lg border bg-card text-sm">
          {AUTOMATICO.map((x) => (
            <div key={x.cuando} className="flex flex-col gap-1 border-b p-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
              <span className={`w-fit shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${x.auto ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-700"}`}>{x.auto ? "Automático" : "A mano"}</span>
              <p className="min-w-0"><strong>{x.cuando}</strong> <span className="text-muted-foreground">→ {x.que}</span></p>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="2. La ficha de cada lead">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li><strong className="text-foreground">Datos:</strong> nombre, teléfono, correo, cómo contactó, quién lo lleva y cuánto podría valer.</li>
          <li><strong className="text-foreground">Próxima acción:</strong> qué hay que hacer y para qué día.</li>
          <li><strong className="text-foreground">Línea de tiempo:</strong> cada llamada, mensaje, correo, nota y cambio de etapa, de más reciente a más antiguo. Es el historial completo de esa persona.</li>
          <li>Si anotas un contacto tuyo en un lead que estaba en «Nuevo», pasa solo a «Contactado».</li>
          <li><strong className="text-foreground">Escribió a:</strong> el WhatsApp (y su número) al que escribió la primera vez. Sirve para saber qué línea genera más leads.</li>
          <li><strong className="text-foreground">Clasificación:</strong> de qué consulta (Dyson, Thermomix, ordenador, alquiler…). Se deduce sola de lo que escribe la persona, por palabras clave, y se puede corregir en la ficha. Si el primer mensaje es solo «Buenas», se clasifica cuando diga de qué trata.</li>
          <li>La vista <strong className="text-foreground">Métricas</strong> resume todo esto: leads por día, embudo, conversión, tiempo de primera respuesta, y desglose por WhatsApp, clasificación, origen y responsable.</li>
        </ul>
      </Seccion>

      <Seccion titulo="3. Cómo usarlo cada día">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>Abre el <strong className="text-foreground">Tablero</strong> y mira las tarjetas de arriba: <em>Nuevos hoy</em>, <em>Sin respuesta</em> (más de 24 h en «Nuevo») y <em>Acciones vencidas</em>.</li>
          <li>Responde primero a los de la columna <strong className="text-foreground">Nuevo</strong>. Anota lo que hablaste con «Anotar una actividad».</li>
          <li>Deja siempre una <strong className="text-foreground">próxima acción con fecha</strong>: así nadie se queda sin seguimiento.</li>
          <li>Cuando acepte o rechace, arrastra la tarjeta a <strong className="text-foreground">Ganado</strong> o <strong className="text-foreground">Perdido</strong>.</li>
        </ol>
      </Seccion>

      <Seccion titulo="4. De dónde llegan los leads">
        <div className="grid gap-3 sm:grid-cols-2">
          {CANALES.map((c) => (
            <div key={c.nombre} className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{c.nombre}</p>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${c.estado === "pendiente" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {c.estado === "listo" ? "Disponible" : c.estado === "conectado" ? "Conectado" : "Pendiente de conectar"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{c.que}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Los leads de WhatsApp aparecen solos en el Tablero con su origen marcado; el resto de canales se irán conectando. Mientras tanto, las llamadas y los formularios se anotan a mano.
        </p>
      </Seccion>

      <Seccion titulo="5. Preguntas frecuentes">
        <div className="space-y-2">
          {PREGUNTAS.map((q) => (
            <details key={q.p} className="rounded-lg border bg-card p-3 text-sm">
              <summary className="cursor-pointer font-medium">{q.p}</summary>
              <p className="mt-2 text-muted-foreground">{q.r}</p>
            </details>
          ))}
        </div>
      </Seccion>

      <p className="text-sm text-muted-foreground">
        ¿Listo? Ve al <Link href="/crm" className="font-medium text-primary underline">Tablero</Link> o a la <Link href="/crm/lista" className="font-medium text-primary underline">Lista</Link>.
      </p>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}
