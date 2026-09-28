"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Add } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CargandoFilas, ErrorCaja, Vacio } from "@/components/agentes-v2/componentes";
import { enviarV2 } from "@/components/agentes-v2/use-v2";
import { cn } from "@/lib/utils";
import { Campo, Selector, TipoBadge } from "./campos";
import { NOMBRE_TIPO, useAuto, useTemas, type EstadoTema, type Tema } from "./use-social";

const ESTADOS: { valor: EstadoTema | "todos"; texto: string }[] = [
  { valor: "todos", texto: "Todos" },
  { valor: "aprobado", texto: "Aprobados" },
  { valor: "propuesto", texto: "Propuestos" },
  { valor: "en_curso", texto: "En curso" },
  { valor: "hecho", texto: "Hechos" },
  { valor: "descartado", texto: "Descartados" },
];
const CLASE_ESTADO: Record<EstadoTema, string> = {
  propuesto: "bg-muted text-muted-foreground",
  aprobado: "bg-green-500/15 text-green-700 dark:text-green-300",
  en_curso: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  hecho: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  descartado: "bg-red-500/10 text-red-700 dark:text-red-300",
};
const TEXTO_ESTADO: Record<EstadoTema, string> = { propuesto: "Propuesto", aprobado: "Aprobado", en_curso: "Generándose", hecho: "Hecho", descartado: "Descartado" };
const OPCIONES_TIPO = Object.entries(NOMBRE_TIPO).map(([valor, texto]) => ({ valor, texto }));

function NuevoTema({ abierto, onCerrar, onCreado }: { abierto: boolean; onCerrar: () => void; onCreado: () => void }) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("errores");
  const [angulo, setAngulo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const crear = async () => {
    setEnviando(true);
    try {
      await enviarV2("POST", "social/topics", { title: titulo, tipo, angle: angulo || undefined });
      toast.success("Tema añadido: irá el primero de la cola");
      setTitulo("");
      setAngulo("");
      onCreado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo añadir el tema");
    } finally {
      setEnviando(false);
    }
  };
  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && !enviando && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Añadir un tema</DialogTitle>
          <DialogDescription>Los temas que añades tú entran aprobados y se generan antes que los propuestos por la IA.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Campo etiqueta="Tema" ayuda="Como lo leería un dueño de negocio. Ej.: «Cómo enviar recordatorios de cita por WhatsApp sin hacerlo a mano».">
            <Textarea rows={2} value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} className="min-h-0 text-sm" autoFocus />
          </Campo>
          <Campo etiqueta="Tipo de carrusel"><Selector valor={tipo} onChange={setTipo} opciones={OPCIONES_TIPO} /></Campo>
          <Campo etiqueta="Enfoque (opcional)" ayuda="Una frase con lo que quieres que se cuente."><Input value={angulo} onChange={(e) => setAngulo(e.target.value)} maxLength={400} className="h-8 text-sm" /></Campo>
        </div>
        <DialogFooter>
          <Button variant="ghost" disabled={enviando} onClick={onCerrar}>Cancelar</Button>
          <Button disabled={enviando || titulo.trim().length < 10} onClick={crear}>{enviando ? "Añadiendo…" : "Añadir tema"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Temas({ onAbrirCarrusel }: { onAbrirCarrusel: (id: number) => void }) {
  const auto = useAuto();
  const buscando = auto.datos?.jobs.descubrir?.state === "running";
  const { datos, error, cargando, recargar } = useTemas(!!buscando);
  const [filtro, setFiltro] = useState<EstadoTema | "todos">("todos");
  const [nuevo, setNuevo] = useState(false);
  const [trabajando, setTrabajando] = useState<string | null>(null);

  const cambiar = async (t: Tema, cambios: { status?: EstadoTema; tipo?: string }) => {
    setTrabajando(t.id);
    try {
      await enviarV2("PATCH", `social/topics/${t.id}`, cambios);
      await recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar el tema");
    } finally {
      setTrabajando(null);
    }
  };
  const buscar = async () => {
    try {
      await enviarV2("POST", "social/topics/discover", {});
      toast.success("Buscando temas nuevos (unos 2 minutos)…");
      await auto.recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo lanzar la búsqueda");
    }
  };

  const lista = (datos?.topics ?? []).filter((t) => filtro === "todos" || t.status === filtro);
  const counts = datos?.counts ?? {};

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {ESTADOS.map((e) => (
            <button key={e.valor} onClick={() => setFiltro(e.valor)} className={cn("h-7 rounded-full border px-3 text-xs transition-colors", filtro === e.valor ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
              {e.texto}{e.valor !== "todos" && counts[e.valor] ? ` · ${counts[e.valor]}` : ""}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" disabled={buscando} onClick={buscar}>{buscando ? "Buscando…" : "Buscar temas ahora"}</Button>
          <Button size="sm" onClick={() => setNuevo(true)}><Add className="size-4" />Añadir tema</Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Esta es la cola de la que el sistema coge el siguiente tema. Aprueba los que más te gusten (van primero), descarta los que no encajen y cambia el tipo de carrusel si quieres otro enfoque.</p>

      {error && <ErrorCaja mensaje={error} />}
      {!datos && cargando && <CargandoFilas />}
      {datos && lista.length === 0 && <Vacio titulo="No hay temas aquí" texto={filtro === "todos" ? "Pulsa «Buscar temas ahora» y la IA propondrá los primeros, o añade uno a mano." : undefined} />}

      <div className="space-y-2">
        {lista.map((t) => {
          const editable = t.status !== "hecho" && t.status !== "en_curso";
          return (
            <div key={t.id} className={cn("flex flex-wrap items-start gap-3 rounded-lg border p-3", t.status === "descartado" && "opacity-55")}>
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-sm leading-snug font-medium">{t.title}</p>
                {t.angle && <p className="text-xs text-muted-foreground">{t.angle}</p>}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium", CLASE_ESTADO[t.status])}>{TEXTO_ESTADO[t.status]}</span>
                  {editable ? (
                    <div className="w-40"><Selector valor={t.tipo} deshabilitado={trabajando === t.id} onChange={(v) => cambiar(t, { tipo: v })} opciones={OPCIONES_TIPO} /></div>
                  ) : <TipoBadge id={t.tipo} />}
                  {t.sector && <span className="text-[11px] text-muted-foreground">{t.sector}</span>}
                  <span className="text-[11px] text-muted-foreground">{t.origen === "manual" ? "Añadido por ti" : `IA · puntuación ${t.score}`}</span>
                  {t.intentos > 0 && t.status !== "hecho" && <span className="text-[11px] text-amber-700">{t.intentos} intento{t.intentos > 1 ? "s" : ""} fallido{t.intentos > 1 ? "s" : ""}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {t.status === "propuesto" && <Button size="sm" variant="outline" disabled={trabajando === t.id} onClick={() => cambiar(t, { status: "aprobado" })}>Aprobar</Button>}
                {t.status === "aprobado" && <Button size="sm" variant="ghost" disabled={trabajando === t.id} onClick={() => cambiar(t, { status: "propuesto" })}>Quitar aprobación</Button>}
                {(t.status === "propuesto" || t.status === "aprobado") && <Button size="sm" variant="ghost" className="text-red-600" disabled={trabajando === t.id} onClick={() => cambiar(t, { status: "descartado" })}>Descartar</Button>}
                {t.status === "descartado" && <Button size="sm" variant="outline" disabled={trabajando === t.id} onClick={() => cambiar(t, { status: "propuesto" })}>Recuperar</Button>}
                {t.status === "hecho" && t.carousel_id && <Button size="sm" variant="outline" onClick={() => onAbrirCarrusel(Number(t.carousel_id))}>Ver carrusel</Button>}
              </div>
            </div>
          );
        })}
      </div>
      <NuevoTema abierto={nuevo} onCerrar={() => setNuevo(false)} onCreado={() => { setNuevo(false); void recargar(); }} />
    </div>
  );
}
