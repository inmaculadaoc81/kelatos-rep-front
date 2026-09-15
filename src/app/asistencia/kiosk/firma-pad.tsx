"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

/**
 * Puerto de app/kiosk/components/SignaturePad.tsx (asistencia-app) — lógica
 * de dibujo en canvas idéntica, solo restilizada con los componentes de
 * Kelatos en vez de kiosk.module.css.
 */
export function FirmaPad({
  onCancelar,
  onConfirmar,
}: {
  onCancelar: () => void;
  onConfirmar: (dataUrl: string, resumenDia: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const dibujadaRef = useRef(false);
  const [confirmando, setConfirmando] = useState(false);
  const [resumenDia, setResumenDia] = useState("");

  function getCtx() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = "#09090b";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
    return ctx;
  }

  function startDraw(x: number, y: number) {
    const ctx = getCtx();
    if (!ctx) return;
    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function moveDraw(x: number, y: number) {
    if (!drawingRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
    dibujadaRef.current = true;
  }
  function endDraw() {
    drawingRef.current = false;
  }
  function limpiar() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    dibujadaRef.current = false;
  }
  function confirmar() {
    if (confirmando) return;
    if (!dibujadaRef.current) return toast.error("Debes firmar antes de confirmar la salida");
    setConfirmando(true);
    onConfirmar(canvasRef.current!.toDataURL("image/png"), resumenDia.trim());
  }

  return (
    <div className="space-y-3">
      {/* Opcional — no bloquea la salida si se deja en blanco. Petición
          del usuario, 2026-09-16: que el empleado pueda contar cómo le
          fue el día al fichar la salida, visible luego para el admin en
          el dashboard de Remote Work. */}
      <div className="space-y-1.5">
        <label htmlFor="resumenDia" className="text-sm font-medium">
          Resumen del día <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <Textarea
          id="resumenDia"
          rows={2}
          placeholder="¿Cómo te fue hoy? Algo que quieras contar…"
          value={resumenDia}
          onChange={(e) => setResumenDia(e.target.value)}
          disabled={confirmando}
        />
      </div>
      <p className="text-sm text-muted-foreground">Firma en el recuadro para confirmar tu salida</p>
      <canvas
        ref={canvasRef}
        width={400}
        height={150}
        className="w-full touch-none rounded-lg border bg-white"
        onMouseDown={(e) => startDraw(e.nativeEvent.offsetX, e.nativeEvent.offsetY)}
        onMouseMove={(e) => moveDraw(e.nativeEvent.offsetX, e.nativeEvent.offsetY)}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={(e) => {
          e.preventDefault();
          const r = canvasRef.current!.getBoundingClientRect();
          const t = e.touches[0];
          startDraw(t.clientX - r.left, t.clientY - r.top);
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          const r = canvasRef.current!.getBoundingClientRect();
          const t = e.touches[0];
          moveDraw(t.clientX - r.left, t.clientY - r.top);
        }}
        onTouchEnd={endDraw}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={limpiar}>Limpiar</Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancelar} disabled={confirmando}>Cancelar</Button>
        <Button type="button" size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={confirmar} disabled={confirmando}>
          Confirmar salida
        </Button>
      </div>
    </div>
  );
}
