"use client";

// Página del cliente para responder a su presupuesto: elegir → revisar el resumen → confirmar → margen para deshacer.
// Usa los mismos componentes, fuente, bordes y colores del dashboard.
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Alert2, Info, Ok } from "./avisos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft2, Clock, DocumentText, MessageQuestion, Refresh2, TickCircle } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface Ppto { numero: string; importe: number; titulo: string; detalle: string; plazo: string }
interface Datos {
  prueba: boolean; estado: "abierto" | "pendiente" | "aplicando" | "aplicado" | "caducado";
  cliente: string; equipo: string; resguardo: string; presupuestos: Ppto[]; seleccion: "unico" | "varios" | null; necesitaRevision: boolean;
  totalConjunto: number | null; notaConjunto: string | null; caducaEn: string; eleccion: { accion: "aceptar" | "rechazar"; numeros: string[] } | null;
  aplicarDesde: string | null; resultado: string | null; minutosParaDeshacer: number; ahora: string;
}

const eur = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
const dia = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric" });
const GRANDE = "h-10 w-full px-4 sm:w-auto"; // botones cómodos de pulsar en el móvil

function Marco({ prueba, children }: { prueba?: boolean; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/40 text-foreground">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/kelatos.png" alt="Kelatos" className="h-8 w-auto" />
          <span className="text-xs text-muted-foreground">Servicio técnico</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl space-y-3 px-4 py-4">
        {prueba && <Info>Prueba con datos inventados. Nada de lo que hagas aquí cambia presupuestos reales ni envía correos.</Info>}
        {children}
      </main>
    </div>
  );
}

function Duda({ enviar }: { enviar: (texto: string) => Promise<string> }) {
  const [abierta, setAbierta] = useState(false);
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);
  if (!abierta) return <div className="flex justify-center"><Button variant="ghost" size="lg" onClick={() => setAbierta(true)}><MessageQuestion /> Tengo una duda</Button></div>;
  return (
    <Card>
      <CardHeader>
        <CardTitle>¿Qué quieres preguntarnos?</CardTitle>
        <CardDescription>Escríbenos y te contestaremos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea className="min-h-24" maxLength={1500} placeholder="Escribe tu duda…" value={texto} onChange={(e) => setTexto(e.target.value)} />
        {aviso && <Ok>{aviso}</Ok>}
        <Button className={GRANDE} disabled={enviando || texto.trim().length < 3} onClick={async () => {
          setEnviando(true);
          const r = await enviar(texto);
          setEnviando(false);
          if (r) { setAviso(r); setTexto(""); }
        }}>{enviando ? "Enviando…" : "Enviar duda"}</Button>
      </CardContent>
    </Card>
  );
}

/** Una opción del presupuesto; si se puede marcar, toda la tarjeta es pulsable. */
function Opcion({ p, activa, control }: { p: Ppto; activa: boolean; control: ReactNode }) {
  const Caja = control ? "label" : "div";
  return (
    <Caja className={cn("flex gap-3 rounded-lg border bg-card p-4 transition-colors", control && "cursor-pointer hover:bg-muted/50", activa && "border-primary bg-primary/5 hover:bg-primary/5")}>
      {control && <span className="pt-0.5">{control}</span>}
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="flex items-start justify-between gap-3">
          <span className="text-sm font-medium">{p.titulo}</span>
          <span className="text-sm font-semibold whitespace-nowrap tabular-nums">{eur(p.importe)}</span>
        </span>
        <span className="block text-sm text-muted-foreground">{p.detalle}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{p.numero}</Badge>
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3.5 shrink-0" /> {p.plazo}</span>
        </span>
      </span>
    </Caja>
  );
}

export function Decision({ token, accionInicial }: { token: string; accionInicial: "aceptar" | "rechazar" | null }) {
  const [d, setD] = useState<Datos | null>(null);
  const [error, setError] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [resumen, setResumen] = useState<"aceptar" | "rechazar" | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [desfase, setDesfase] = useState(0); // reloj del servidor menos reloj del móvil
  const [reloj, setReloj] = useState(() => Date.now());

  const llamar = useCallback(async (op: string, extra: Record<string, unknown> = {}) => {
    const res = await fetch(`/api/presupuesto-cliente/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...extra }), cache: "no-store" });
    const j = await res.json().catch(() => null);
    if (!j?.ok) throw new Error(j?.error || "No se pudo completar. Inténtalo de nuevo.");
    return j;
  }, [token]);

  const recibir = useCallback((j: Datos) => {
    setDesfase(new Date(j.ahora).getTime() - Date.now());
    setD(j);
    if (j.presupuestos.length === 1) setSel([j.presupuestos[0].numero]);
  }, []);

  const cargar = useCallback(() => llamar("ver").then((j: Datos) => {
    recibir(j);
    if (accionInicial === "rechazar" && j.estado === "abierto") setResumen("rechazar");
  }).catch((e: Error) => setError(e.message)), [llamar, recibir, accionInicial]);
  useEffect(() => { void cargar(); }, [cargar]);

  const queda = d?.estado === "pendiente" && d.aplicarDesde ? Math.max(0, new Date(d.aplicarDesde).getTime() - (reloj + desfase)) : 0;
  useEffect(() => {
    if (d?.estado !== "pendiente") return;
    const t = setInterval(() => setReloj(Date.now()), 1000);
    return () => clearInterval(t);
  }, [d?.estado]);
  useEffect(() => {
    if (d?.estado !== "pendiente" || queda > 0) return;
    const t = setTimeout(() => { llamar("ver").then(recibir).catch((e: Error) => setError(e.message)); }, 1500);
    return () => clearTimeout(t);
  }, [d?.estado, queda, llamar, recibir]);

  async function hacer(op: string, extra: Record<string, unknown> = {}) {
    setOcupado(true); setError("");
    try {
      recibir(await llamar(op, extra));
      setResumen(null);
      if (op === "reiniciar") setSel([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar");
      llamar("ver").then(recibir).catch(() => {});
    } finally { setOcupado(false); }
  }
  const duda = async (texto: string) => {
    setError("");
    try { return (await llamar("duda", { texto })).aviso as string; } catch (e) { setError(e instanceof Error ? e.message : "No se pudo enviar"); return ""; }
  };

  if (!d) return <Marco><Card><CardContent className="text-muted-foreground">{error || "Abriendo tu presupuesto…"}</CardContent></Card></Marco>;

  const varios = d.presupuestos.length > 1;
  const marcable = varios && !d.necesitaRevision;
  const elegidos = d.presupuestos.filter((p) => (d.eleccion ? d.eleccion.numeros : sel).includes(p.numero));
  const todos = varios && elegidos.length === d.presupuestos.length;
  const total = todos && d.totalConjunto !== null ? d.totalConjunto : elegidos.reduce((n, p) => n + p.importe, 0);
  const alternar = (n: string, marcado: boolean) => setSel((s) => (marcado ? [...s.filter((x) => x !== n), n] : s.filter((x) => x !== n)));

  const listaElegida = (
    <div className="space-y-3">
      <div className="divide-y rounded-lg border">
        {elegidos.map((p) => (
          <div key={p.numero} className="space-y-1 p-3">
            <div className="flex justify-between gap-3 text-sm"><span className="font-medium">{p.titulo}</span><span className="font-semibold whitespace-nowrap tabular-nums">{eur(p.importe)}</span></div>
            <p className="text-xs text-muted-foreground">{p.numero} · {p.plazo}</p>
          </div>
        ))}
      </div>
      {todos && d.notaConjunto && <p className="text-sm text-muted-foreground">{d.notaConjunto}</p>}
      <Separator />
      <div className="flex justify-between text-base font-semibold"><span>Total (IVA incluido)</span><span className="tabular-nums">{eur(total)}</span></div>
    </div>
  );

  const opciones = d.presupuestos.map((p) => {
    const activa = marcable && sel.includes(p.numero);
    const control = !marcable ? null : d.seleccion === "unico"
      ? <RadioGroupItem value={p.numero} aria-label={p.titulo} />
      : <Checkbox checked={sel.includes(p.numero)} onCheckedChange={(v) => alternar(p.numero, v === true)} aria-label={p.titulo} />;
    return <Opcion key={p.numero} p={p} activa={activa} control={control} />;
  });

  return (
    <Marco prueba={d.prueba}>
      <div className="flex items-center gap-3 py-1">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><DocumentText className="size-5" /></span>
        <div className="min-w-0">
          <h1 className="text-lg leading-tight font-semibold">Hola, {d.cliente}</h1>
          <p className="text-sm text-muted-foreground">{d.equipo} · resguardo {d.resguardo} · válido hasta el {dia(d.caducaEn)}</p>
        </div>
      </div>

      {error && <Alert2>{error}</Alert2>}

      {d.estado === "caducado" && <Card><CardContent>Este presupuesto ha caducado y ya no se puede responder desde aquí. Escríbenos y lo revisamos.</CardContent></Card>}

      {d.estado === "abierto" && !resumen && (
        <Card>
          <CardHeader>
            <CardTitle>{varios ? "Tus presupuestos" : "Tu presupuesto"}</CardTitle>
            <CardDescription>
              {d.necesitaRevision ? "Necesitamos revisarlo contigo antes de aceptarlo." : !varios ? "Revísalo y dinos qué quieres hacer." : d.seleccion === "unico" ? "Son alternativas: elige solo una." : "Marca lo que quieres reparar. Puedes elegir varios."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {marcable && d.seleccion === "unico"
              ? <RadioGroup value={sel[0] ?? ""} onValueChange={(v) => setSel([String(v)])}>{opciones}</RadioGroup>
              : <div className="grid gap-2">{opciones}</div>}
            {d.seleccion === "varios" && d.notaConjunto && <Info>{d.notaConjunto}</Info>}
            {d.necesitaRevision && <Info>Para aceptar este presupuesto escríbenos desde «Tengo una duda» o responde al correo.</Info>}
          </CardContent>
          <CardFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button variant="outline" className={GRANDE} onClick={() => setResumen("rechazar")}>No quiero repararlo</Button>
            {!d.necesitaRevision && <Button className={GRANDE} disabled={!sel.length} onClick={() => setResumen("aceptar")}>Continuar para aceptar</Button>}
          </CardFooter>
        </Card>
      )}

      {d.estado === "abierto" && resumen && (
        <Card>
          <CardHeader>
            <CardTitle>{resumen === "aceptar" ? "Revisa antes de confirmar" : "¿Seguro que quieres rechazar?"}</CardTitle>
            <CardDescription>Después de confirmar tendrás {d.minutosParaDeshacer} minutos para deshacerlo.</CardDescription>
          </CardHeader>
          <CardContent>{resumen === "aceptar" ? listaElegida : <p>No haremos la reparación de tu equipo ({d.equipo}).</p>}</CardContent>
          <CardFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button variant="outline" className={GRANDE} disabled={ocupado} onClick={() => setResumen(null)}><ArrowLeft2 /> Volver</Button>
            <Button variant={resumen === "aceptar" ? "default" : "destructive"} className={GRANDE} disabled={ocupado} onClick={() => hacer("confirmar", { accion: resumen, numeros: sel })}>
              {ocupado ? "Un momento…" : resumen === "aceptar" ? "Sí, acepto el presupuesto" : "Sí, rechazo el presupuesto"}
            </Button>
          </CardFooter>
        </Card>
      )}

      {(d.estado === "pendiente" || d.estado === "aplicando") && d.eleccion && (
        <Card>
          <CardHeader><CardTitle>{d.eleccion.accion === "aceptar" ? "Has aceptado el presupuesto" : "Has rechazado el presupuesto"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {d.eleccion.accion === "aceptar" && listaElegida}
            <Info>{queda > 0 ? <>¿Te has equivocado? Puedes deshacerlo durante <strong className="tabular-nums">{Math.floor(queda / 60000)}:{String(Math.floor((queda % 60000) / 1000)).padStart(2, "0")}</strong>.</> : "Registrando tu respuesta…"}</Info>
          </CardContent>
          {queda > 0 && <CardFooter><Button variant="outline" className={GRANDE} disabled={ocupado} onClick={() => hacer("deshacer")}><Refresh2 /> Deshacer</Button></CardFooter>}
        </Card>
      )}

      {d.estado === "aplicado" && d.eleccion && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TickCircle className="size-5 text-emerald-600" /> Respuesta registrada: {d.eleccion.accion === "aceptar" ? "aceptado" : "rechazado"}</CardTitle>
            <CardDescription>{d.eleccion.accion === "aceptar" ? "Te avisaremos cuando tu equipo esté reparado." : "Te escribiremos sobre la recogida de tu equipo."} Si necesitas cambiar algo, escríbenos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.eleccion.accion === "aceptar" && listaElegida}
            {d.prueba && d.resultado && <Info>{d.resultado}</Info>}
          </CardContent>
        </Card>
      )}

      <Duda enviar={duda} />

      {d.prueba && (
        <div className="flex justify-center pb-4">
          <Button variant="link" size="sm" className="text-muted-foreground" disabled={ocupado} onClick={() => { setResumen(null); void hacer("reiniciar"); }}>Volver a empezar la prueba</Button>
        </div>
      )}
    </Marco>
  );
}
