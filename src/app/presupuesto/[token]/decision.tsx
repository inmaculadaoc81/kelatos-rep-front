"use client";

// Página del cliente para responder a su presupuesto: elegir → revisar el resumen → confirmar → margen para deshacer.
// Colores fijos (claros) a propósito: la ve el cliente, no sigue el tema del dashboard.
import { useCallback, useEffect, useState, type ReactNode } from "react";

interface Ppto { numero: string; importe: number; titulo: string; detalle: string; plazo: string }
interface Datos {
  prueba: boolean; estado: "abierto" | "pendiente" | "aplicando" | "aplicado" | "caducado";
  cliente: string; equipo: string; resguardo: string; presupuestos: Ppto[]; seleccion: "unico" | "varios" | null; necesitaRevision: boolean;
  totalConjunto: number | null; notaConjunto: string | null; caducaEn: string; eleccion: { accion: "aceptar" | "rechazar"; numeros: string[] } | null;
  aplicarDesde: string | null; resultado: string | null; minutosParaDeshacer: number; ahora: string;
}

const eur = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
const dia = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric" });

const BTN = "inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-[15px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto";
const PRINCIPAL = `${BTN} bg-blue-600 text-white hover:bg-blue-700`;
const VERDE = `${BTN} bg-emerald-600 text-white hover:bg-emerald-700`;
const ROJO = `${BTN} bg-rose-600 text-white hover:bg-rose-700`;
const SUAVE = `${BTN} border border-slate-300 bg-white text-slate-700 hover:bg-slate-100`;

function Marco({ prueba, children }: { prueba?: boolean; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900">
      <div className="mx-auto w-full max-w-xl space-y-3">
        {prueba && <p className="rounded-lg border border-amber-400 bg-amber-100 px-4 py-2.5 text-sm font-medium text-amber-900">PRUEBA con datos inventados. Nada de lo que hagas aquí cambia presupuestos reales ni envía correos.</p>}
        <p className="text-lg font-bold text-blue-700">Kelatos <span className="font-medium text-slate-500">· Servicio técnico</span></p>
        {children}
      </div>
    </main>
  );
}
const Caja = ({ children, className = "" }: { children: ReactNode; className?: string }) => <section className={`rounded-[10px] bg-white p-4 shadow-sm sm:p-5 ${className}`}>{children}</section>;

function Duda({ enviar }: { enviar: (texto: string) => Promise<string> }) {
  const [abierta, setAbierta] = useState(false);
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);
  if (!abierta) return <button className="w-full py-2 text-sm font-medium text-blue-700 underline" onClick={() => setAbierta(true)}>Tengo una duda</button>;
  return (
    <Caja className="space-y-2">
      <p className="text-sm font-semibold">¿Qué quieres preguntarnos?</p>
      <textarea className="min-h-24 w-full rounded-lg border border-slate-300 p-2.5 text-sm" maxLength={1500} value={texto} onChange={(e) => setTexto(e.target.value)} />
      {aviso && <p className="text-sm text-emerald-700">{aviso}</p>}
      <button className={PRINCIPAL} disabled={enviando || texto.trim().length < 3} onClick={async () => {
        setEnviando(true);
        const r = await enviar(texto);
        setEnviando(false);
        if (r) { setAviso(r); setTexto(""); }
      }}>{enviando ? "Enviando…" : "Enviar duda"}</button>
    </Caja>
  );
}

/** Cómo se vería el correo. Los botones solo abren la página: no deciden nada por sí solos. */
function VistaCorreo({ d, token }: { d: Datos; token: string }) {
  return (
    <Marco prueba={d.prueba}>
      <p className="text-sm text-slate-600">Así quedaría el correo del presupuesto (no se ha enviado):</p>
      <Caja className="space-y-3 border border-slate-200">
        <p className="border-b border-slate-200 pb-2 text-sm"><strong>Asunto:</strong> [Kelatos] Presupuesto de reparación — {d.equipo}</p>
        <p className="text-sm">Hola, <strong>{d.cliente}</strong>:</p>
        <p className="text-sm">Ya tenemos el presupuesto para tu equipo <strong>{d.equipo}</strong>.</p>
        <ul className="space-y-1.5 text-sm">{d.presupuestos.map((p) => <li key={p.numero} className="rounded-lg bg-slate-100 px-3 py-2"><strong>{p.numero}</strong> · {p.titulo} — <strong>{eur(p.importe)}</strong></li>)}</ul>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a className={VERDE} href={`/presupuesto/${token}?accion=aceptar`}>Ver y aceptar</a>
          <a className={SUAVE} href={`/presupuesto/${token}?accion=rechazar`}>Rechazar</a>
        </div>
        <p className="text-xs text-slate-500">Al pulsar se abre una página donde podrás revisar y confirmar. No se decide nada hasta que confirmes. Si lo prefieres, también puedes responder a este correo.</p>
      </Caja>
      <a className="block py-2 text-center text-sm font-medium text-blue-700 underline" href={`/presupuesto/${token}`}>Ir a la página del cliente</a>
    </Marco>
  );
}

export function Decision({ token, vistaCorreo, accionInicial }: { token: string; vistaCorreo: boolean; accionInicial: "aceptar" | "rechazar" | null }) {
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

  if (!d) return <Marco><Caja><p className="text-sm text-slate-600">{error || "Abriendo tu presupuesto…"}</p></Caja></Marco>;
  if (vistaCorreo) return <VistaCorreo d={d} token={token} />;

  const elegidos = d.presupuestos.filter((p) => (d.eleccion ? d.eleccion.numeros : sel).includes(p.numero));
  const todos = elegidos.length === d.presupuestos.length && d.presupuestos.length > 1;
  const suma = elegidos.reduce((n, p) => n + p.importe, 0);
  const total = todos && d.totalConjunto !== null ? d.totalConjunto : suma;
  const alternar = (n: string) => setSel((s) => (d.seleccion === "unico" ? [n] : s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));

  const listaElegida = (
    <ul className="space-y-2">
      {elegidos.map((p) => <li key={p.numero} className="rounded-lg bg-slate-100 px-3 py-2.5 text-sm"><div className="flex justify-between gap-3"><strong>{p.titulo}</strong><strong>{eur(p.importe)}</strong></div><p className="text-slate-600">{p.numero} · {p.plazo}</p></li>)}
      {todos && d.notaConjunto && <li className="text-sm text-slate-600">{d.notaConjunto}</li>}
      <li className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><span>Total (IVA incluido)</span><span>{eur(total)}</span></li>
    </ul>
  );

  return (
    <Marco prueba={d.prueba}>
      <Caja>
        <h1 className="text-lg font-bold">Hola, {d.cliente}</h1>
        <p className="text-sm text-slate-600">{d.equipo} · resguardo {d.resguardo} · válido hasta el {dia(d.caducaEn)}</p>
      </Caja>

      {error && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">{error}</p>}

      {d.estado === "caducado" && <Caja><p className="text-sm">Este presupuesto ha caducado y ya no se puede responder desde aquí. Escríbenos y lo revisamos.</p></Caja>}

      {d.estado === "abierto" && !resumen && (
        <>
          <p className="px-1 text-sm font-semibold">
            {d.necesitaRevision ? "Estos son tus presupuestos" : d.presupuestos.length === 1 ? "Tu presupuesto" : d.seleccion === "unico" ? "Elige una opción (son alternativas)" : "Marca lo que quieres reparar (puedes elegir varios)"}
          </p>
          {d.presupuestos.map((p) => {
            const marcable = !d.necesitaRevision && d.presupuestos.length > 1;
            const activo = marcable && sel.includes(p.numero);
            return (
              <label key={p.numero} className={`flex gap-3 rounded-[10px] bg-white p-4 shadow-sm ring-2 ${activo ? "ring-blue-600" : "ring-transparent"} ${marcable ? "cursor-pointer" : ""}`}>
                {marcable && <input type={d.seleccion === "unico" ? "radio" : "checkbox"} name="ppto" className="mt-1 size-5 shrink-0 accent-blue-600" checked={activo} onChange={() => alternar(p.numero)} />}
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between gap-3"><strong>{p.titulo}</strong><strong className="whitespace-nowrap">{eur(p.importe)}</strong></span>
                  <span className="mt-1 block text-sm text-slate-600">{p.detalle}</span>
                  <span className="mt-1 block text-sm text-slate-500">{p.numero} · Plazo estimado: {p.plazo}</span>
                </span>
              </label>
            );
          })}
          {d.seleccion === "varios" && d.notaConjunto && <p className="px-1 text-sm text-slate-600">{d.notaConjunto}</p>}
          {d.necesitaRevision
            ? <Caja><p className="text-sm">Para aceptar este presupuesto necesitamos revisarlo contigo. Escríbenos desde «Tengo una duda» o responde al correo.</p></Caja>
            : <button className={`${PRINCIPAL} sm:!w-full`} disabled={!sel.length} onClick={() => setResumen("aceptar")}>Continuar para aceptar</button>}
          <button className={`${SUAVE} sm:!w-full`} onClick={() => setResumen("rechazar")}>No quiero repararlo</button>
        </>
      )}

      {d.estado === "abierto" && resumen && (
        <Caja className="space-y-3">
          <h2 className="text-base font-bold">{resumen === "aceptar" ? "Revisa antes de confirmar" : "¿Seguro que quieres rechazar?"}</h2>
          {resumen === "aceptar" ? listaElegida : <p className="text-sm">No haremos la reparación de tu equipo ({d.equipo}).</p>}
          <p className="text-sm text-slate-600">Después de confirmar tendrás {d.minutosParaDeshacer} minutos para deshacerlo.</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button className={SUAVE} disabled={ocupado} onClick={() => setResumen(null)}>Volver</button>
            <button className={resumen === "aceptar" ? VERDE : ROJO} disabled={ocupado} onClick={() => hacer("confirmar", { accion: resumen, numeros: sel })}>{ocupado ? "Un momento…" : resumen === "aceptar" ? "Sí, acepto el presupuesto" : "Sí, rechazo el presupuesto"}</button>
          </div>
        </Caja>
      )}

      {(d.estado === "pendiente" || d.estado === "aplicando") && d.eleccion && (
        <Caja className="space-y-3">
          <h2 className="text-base font-bold">{d.eleccion.accion === "aceptar" ? "Has aceptado el presupuesto" : "Has rechazado el presupuesto"}</h2>
          {d.eleccion.accion === "aceptar" && listaElegida}
          <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            {queda > 0 ? <>¿Te has equivocado? Puedes deshacerlo durante <strong className="tabular-nums">{Math.floor(queda / 60000)}:{String(Math.floor((queda % 60000) / 1000)).padStart(2, "0")}</strong>.</> : "Registrando tu respuesta…"}
          </p>
          {queda > 0 && <button className={SUAVE} disabled={ocupado} onClick={() => hacer("deshacer")}>Deshacer</button>}
        </Caja>
      )}

      {d.estado === "aplicado" && d.eleccion && (
        <Caja className="space-y-3">
          <h2 className="text-base font-bold text-emerald-700">Respuesta registrada: {d.eleccion.accion === "aceptar" ? "aceptado" : "rechazado"}</h2>
          {d.eleccion.accion === "aceptar" && listaElegida}
          <p className="text-sm text-slate-600">{d.eleccion.accion === "aceptar" ? "Te avisaremos cuando tu equipo esté reparado." : "Te escribiremos sobre la recogida de tu equipo."} Si necesitas cambiar algo, escríbenos.</p>
          {d.prueba && d.resultado && <p className="rounded-lg bg-amber-100 px-3 py-2.5 text-sm text-amber-900">{d.resultado}</p>}
        </Caja>
      )}

      <Duda enviar={duda} />

      {d.prueba && (
        <div className="flex justify-center gap-4 pb-4 text-xs text-slate-500">
          <a className="underline" href={`/presupuesto/${token}?vista=correo`}>Ver el correo</a>
          <button className="underline" disabled={ocupado} onClick={() => { setResumen(null); void hacer("reiniciar"); }}>Volver a empezar la prueba</button>
        </div>
      )}
    </Marco>
  );
}
