import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CLASIFICACION, type Clasificacion } from "@/lib/n8nlabs";
import { cn } from "@/lib/utils";

const PUNTOS: { pregunta: string; filas: [string, number][] }[] = [
  { pregunta: "¿Cuánto factura al mes?", filas: [["Menos de 5.000 $", 0], ["5.000 – 20.000 $", 1], ["20.000 – 50.000 $", 2], ["Más de 50.000 $", 3]] },
  { pregunta: "¿Mensajes o leads por semana?", filas: [["Menos de 20", 0], ["20 – 100", 1], ["Más de 100", 2]] },
  { pregunta: "¿Para cuándo lo necesita?", filas: [["Solo explora", 0], ["En 1–3 meses", 2], ["Este mes", 3]] },
  { pregunta: "¿Qué inversión tiene prevista?", filas: [["Menos de 500 $", 0], ["500 – 1.500 $", 1], ["1.500 – 5.000 $", 3], ["Más de 5.000 $", 3]] },
  { pregunta: "¿Cuál es su papel en la decisión?", filas: [["Lo investiga para otro", 0], ["Decide con un socio", 2], ["Decide él/ella", 3]] },
];

const REGLAS: { c: Clasificacion; reglas: string[] }[] = [
  { c: "caliente", reglas: ["9 puntos o más (de 14).", "Y ninguna señal de freno: no está «solo explorando», tiene 500 $ o más previstos y decide él/ella o con un socio."] },
  { c: "no_encaja", reglas: ["3 puntos o menos, o", "«Solo explorando» con menos de 500 $, o", "Factura menos de 5.000 $ con menos de 500 $ de inversión."] },
  { c: "tibio", reglas: ["Todo lo que no es caliente ni «no encaja»: tiene potencial pero le falta urgencia, presupuesto o poder de decisión."] },
];

/** Explica al equipo, sin tecnicismos, cómo se clasifica cada lead del formulario. */
export default function Page() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Cómo se puntúa cada lead</h1>
        <p className="text-sm text-muted-foreground">
          Al enviar el formulario de automatizacionesn8n.com, el sistema suma puntos según 5 respuestas (máximo 14) y lo clasifica solo. Sin IA: son reglas fijas, así que el resultado siempre se puede explicar.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {REGLAS.map(({ c, reglas }) => (
          <Card key={c}>
            <CardHeader>
              <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium", CLASIFICACION[c].chip)}>
                <span className={cn("size-1.5 rounded-full", CLASIFICACION[c].punto)} />
                {CLASIFICACION[c].nombre}
              </span>
              <CardTitle className="text-base">{CLASIFICACION[c].ruta}</CardTitle>
              <CardDescription>{CLASIFICACION[c].descripcion}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">{reglas.map((r) => <li key={r}>{r}</li>)}</ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Puntos por respuesta</CardTitle>
          <CardDescription>Nombre, WhatsApp, sector, qué quiere automatizar y «qué ha intentado ya» no puntúan: sirven para preparar la conversación.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {PUNTOS.map((p) => (
            <div key={p.pregunta} className="rounded-xl border p-3">
              <p className="mb-2 text-sm font-medium">{p.pregunta}</p>
              <ul className="space-y-1 text-sm">
                {p.filas.map(([r, n]) => (
                  <li key={r} className="flex justify-between gap-2"><span className="text-muted-foreground">{r}</span><span className="font-medium tabular-nums">{n} pt</span></li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">Si quieres cambiar los umbrales (por ejemplo, que 8 puntos ya sea caliente), se ajusta en la API; este texto hay que actualizarlo a la vez.</p>
    </div>
  );
}
