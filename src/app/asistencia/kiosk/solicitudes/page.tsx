"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { TipoFichajePill } from "../../pills";
import { ArrowDown2 } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface Fichaje { id: number; check_in: string; check_out: string; tipo_fichaje: string; }

const CAMPO_LABEL: Record<string, string> = { check_in: "Hora de entrada", check_out: "Hora de salida" };

function etiquetaFichaje(f: Fichaje): string {
  const fecha = new Date(f.check_in).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = new Date(f.check_in).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return `${fecha} · ${hora}`;
}
interface Solicitud { id: number; state_label: string; motivo: string; [key: string]: unknown }

const ESTILO_ESTADO: Record<string, string> = {
  Pendiente: "text-amber-600",
  Aprobado: "text-emerald-600",
  Rechazado: "text-destructive",
};

function EstadoTexto({ label }: { label: string }) {
  return <span className={`text-xs font-medium ${ESTILO_ESTADO[label] || ""}`}>{label}</span>;
}

export default function SolicitudesPage() {
  const [fichajes, setFichajes] = useState<Fichaje[]>([]);
  const [enviando, setEnviando] = useState(false);

  // Vacaciones
  const [vacFechaInicio, setVacFechaInicio] = useState("");
  const [vacFechaFin, setVacFechaFin] = useState("");
  const [vacMotivo, setVacMotivo] = useState("");
  const [misVacaciones, setMisVacaciones] = useState<Solicitud[]>([]);

  // Corrección
  const [corFichajeId, setCorFichajeId] = useState("");
  const [corBuscadorAbierto, setCorBuscadorAbierto] = useState(false);
  const [corCampo, setCorCampo] = useState<"check_in" | "check_out">("check_in");
  const [corFecha, setCorFecha] = useState("");
  const [corHora, setCorHora] = useState("");
  const [corMotivo, setCorMotivo] = useState("");
  const [misCorrecciones, setMisCorrecciones] = useState<Solicitud[]>([]);

  // Marcación olvidada
  const [molFecha, setMolFecha] = useState("");
  const [molTipo, setMolTipo] = useState("entrada");
  const [molHora, setMolHora] = useState("");
  const [molMotivo, setMolMotivo] = useState("");
  const [misMarcaciones, setMisMarcaciones] = useState<Solicitud[]>([]);

  // Ausencia parcial
  const [ausFecha, setAusFecha] = useState("");
  const [ausTipo, setAusTipo] = useState("medico");
  const [ausDesde, setAusDesde] = useState("");
  const [ausHasta, setAusHasta] = useState("");
  const [ausMotivo, setAusMotivo] = useState("");
  const [misAusencias, setMisAusencias] = useState<Solicitud[]>([]);

  async function cargarTodo() {
    const [f, v, c, m, a] = await Promise.all([
      fetch("/api/asistencia/kiosk/mis-fichajes").then((r) => r.json()),
      fetch("/api/asistencia/kiosk/vacaciones").then((r) => r.json()),
      fetch("/api/asistencia/kiosk/correcciones").then((r) => r.json()),
      fetch("/api/asistencia/kiosk/marcaciones-olvidadas").then((r) => r.json()),
      fetch("/api/asistencia/kiosk/ausencias-parciales").then((r) => r.json()),
    ]);
    if (f.ok) setFichajes(f.items);
    if (v.ok) setMisVacaciones(v.items);
    if (c.ok) setMisCorrecciones(c.items);
    if (m.ok) setMisMarcaciones(m.items);
    if (a.ok) setMisAusencias(a.items);
  }

  useEffect(() => {
    cargarTodo();
  }, []);

  async function enviar(url: string, body: unknown, onOk: () => void) {
    setEnviando(true);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Solicitud enviada");
      onOk();
      await cargarTodo();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <Tabs defaultValue="vacaciones">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vacaciones">Vacaciones</TabsTrigger>
          <TabsTrigger value="correccion">Corrección</TabsTrigger>
          <TabsTrigger value="olvidada">Olvidé fichar</TabsTrigger>
          <TabsTrigger value="ausencia">Ausencia</TabsTrigger>
        </TabsList>

        <TabsContent value="vacaciones">
          <Card>
            <CardContent className="space-y-3 pt-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>Desde</Label><Input type="date" value={vacFechaInicio} onChange={(e) => setVacFechaInicio(e.target.value)} /></div>
                <div className="space-y-1"><Label>Hasta</Label><Input type="date" value={vacFechaFin} onChange={(e) => setVacFechaFin(e.target.value)} /></div>
              </div>
              <div className="space-y-1"><Label>Motivo</Label><Textarea rows={2} value={vacMotivo} onChange={(e) => setVacMotivo(e.target.value)} /></div>
              <Button
                className="w-full"
                disabled={enviando || !vacFechaInicio || !vacFechaFin}
                onClick={() =>
                  enviar("/api/asistencia/kiosk/vacaciones", { fechaInicio: vacFechaInicio, fechaFin: vacFechaFin, motivo: vacMotivo }, () => {
                    setVacFechaInicio(""); setVacFechaFin(""); setVacMotivo("");
                  })
                }
              >
                Solicitar vacaciones
              </Button>
              <div className="space-y-1.5 border-t pt-3">
                {misVacaciones.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{String(s.fecha_inicio).slice(0, 10)} – {String(s.fecha_fin).slice(0, 10)}</span>
                    <EstadoTexto label={s.state_label} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correccion">
          <Card>
            <CardContent className="space-y-3 pt-4">
              <div className="space-y-1">
                <Label>Fichaje a corregir</Label>
                <Popover open={corBuscadorAbierto} onOpenChange={setCorBuscadorAbierto}>
                  <PopoverTrigger
                    render={
                      <Button variant="outline" className="w-full justify-between font-normal">
                        {corFichajeId ? (
                          (() => {
                            const f = fichajes.find((x) => String(x.id) === corFichajeId);
                            return f ? (
                              <span className="inline-flex items-center gap-2">
                                {etiquetaFichaje(f)} <TipoFichajePill tipo={f.tipo_fichaje} />
                              </span>
                            ) : "Selecciona un fichaje";
                          })()
                        ) : (
                          <span className="text-muted-foreground">Selecciona un fichaje</span>
                        )}
                        <ArrowDown2 className="size-3.5 text-muted-foreground" />
                      </Button>
                    }
                  />
                  <PopoverContent align="start" className="w-(--anchor-width) min-w-64 p-0">
                    <Command>
                      <CommandInput placeholder="Busca por fecha (dd/mm)…" />
                      <CommandList>
                        <CommandEmpty>Sin fichajes en los últimos 7 días.</CommandEmpty>
                        <CommandGroup>
                          {fichajes.map((f) => (
                            <CommandItem
                              key={f.id}
                              value={`${etiquetaFichaje(f)} ${f.tipo_fichaje}`}
                              onSelect={() => { setCorFichajeId(String(f.id)); setCorBuscadorAbierto(false); }}
                            >
                              <span className={cn("flex-1", String(f.id) === corFichajeId && "font-medium")}>{etiquetaFichaje(f)}</span>
                              <TipoFichajePill tipo={f.tipo_fichaje} />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label>Campo</Label>
                <Select value={corCampo} onValueChange={(v) => setCorCampo((v as "check_in" | "check_out") || "check_in")}>
                  <SelectTrigger className="w-full"><SelectValue>{(v: string) => CAMPO_LABEL[v] || v}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="check_in">Hora de entrada</SelectItem>
                    <SelectItem value="check_out">Hora de salida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>Fecha correcta</Label><Input type="date" value={corFecha} onChange={(e) => setCorFecha(e.target.value)} /></div>
                <div className="space-y-1"><Label>Hora correcta</Label><Input type="time" value={corHora} onChange={(e) => setCorHora(e.target.value)} /></div>
              </div>
              <div className="space-y-1"><Label>Motivo</Label><Textarea rows={2} value={corMotivo} onChange={(e) => setCorMotivo(e.target.value)} /></div>
              <Button
                className="w-full"
                disabled={enviando || !corFichajeId || !corFecha || !corHora || !corMotivo}
                onClick={() =>
                  enviar(
                    "/api/asistencia/kiosk/correcciones",
                    { fichajeId: Number(corFichajeId), tipoCampo: corCampo, horaSolicitada: `${corFecha} ${corHora}:00`, motivo: corMotivo },
                    () => { setCorFichajeId(""); setCorFecha(""); setCorHora(""); setCorMotivo(""); }
                  )
                }
              >
                Solicitar corrección
              </Button>
              <div className="space-y-1.5 border-t pt-3">
                {misCorrecciones.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{String(s.tipo_campo)}</span>
                    <EstadoTexto label={s.state_label} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="olvidada">
          <Card>
            <CardContent className="space-y-3 pt-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>Fecha</Label><Input type="date" value={molFecha} onChange={(e) => setMolFecha(e.target.value)} /></div>
                <div className="space-y-1"><Label>Hora</Label><Input type="time" value={molHora} onChange={(e) => setMolHora(e.target.value)} /></div>
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={molTipo} onValueChange={(v) => setMolTipo(v || "entrada")}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="salida_comida">Salida comida</SelectItem>
                    <SelectItem value="vuelta_comida">Vuelta comida</SelectItem>
                    <SelectItem value="salida">Salida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Motivo</Label><Textarea rows={2} value={molMotivo} onChange={(e) => setMolMotivo(e.target.value)} /></div>
              <Button
                className="w-full"
                disabled={enviando || !molFecha || !molHora || !molMotivo}
                onClick={() =>
                  enviar("/api/asistencia/kiosk/marcaciones-olvidadas", { fecha: molFecha, tipoFichaje: molTipo, hora: molHora, motivo: molMotivo }, () => {
                    setMolFecha(""); setMolHora(""); setMolMotivo("");
                  })
                }
              >
                Solicitar
              </Button>
              <div className="space-y-1.5 border-t pt-3">
                {misMarcaciones.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{String(s.fecha_marcacion)} · {String(s.hora)}</span>
                    <EstadoTexto label={s.state_label} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ausencia">
          <Card>
            <CardContent className="space-y-3 pt-4">
              <div className="space-y-1"><Label>Fecha</Label><Input type="date" value={ausFecha} onChange={(e) => setAusFecha(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>Desde</Label><Input type="time" value={ausDesde} onChange={(e) => setAusDesde(e.target.value)} /></div>
                <div className="space-y-1"><Label>Hasta</Label><Input type="time" value={ausHasta} onChange={(e) => setAusHasta(e.target.value)} /></div>
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={ausTipo} onValueChange={(v) => setAusTipo(v || "medico")}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medico">Médico</SelectItem>
                    <SelectItem value="personal">Asunto personal</SelectItem>
                    <SelectItem value="familiar">Familiar</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Motivo</Label><Textarea rows={2} value={ausMotivo} onChange={(e) => setAusMotivo(e.target.value)} /></div>
              <Button
                className="w-full"
                disabled={enviando || !ausFecha || !ausDesde || !ausHasta || !ausMotivo}
                onClick={() =>
                  enviar(
                    "/api/asistencia/kiosk/ausencias-parciales",
                    { fecha: ausFecha, tipoPermiso: ausTipo, horaInicio: ausDesde, horaFin: ausHasta, motivo: ausMotivo },
                    () => { setAusFecha(""); setAusDesde(""); setAusHasta(""); setAusMotivo(""); }
                  )
                }
              >
                Solicitar
              </Button>
              <div className="space-y-1.5 border-t pt-3">
                {misAusencias.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{String(s.fecha_ausencia).slice(0, 10)} · {String(s.desde)}–{String(s.hasta)}</span>
                    <EstadoTexto label={s.state_label} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
