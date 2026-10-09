"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Receipt, Ticket } from "@/lib/icons";
import type { StockPieza } from "@/lib/stock-piezas";
import { TicketManualDialog } from "./reparaciones/ticket-manual-dialog";
import { NuevaFacturaManualDialog } from "./reparaciones/nueva-factura-manual-dialog";

/** Entre teclas de una persona escribiendo a mano nunca baja de ~60-80ms;
    un lector de códigos de barras USB (emula teclado) los manda en
    ráfaga, casi siempre por debajo de 30ms entre caracteres. */
const INTERVALO_MAX_ESCANEO_MS = 30;
/** Si pasa más de esto desde la última tecla sin que llegue el Enter
    final, se descarta el búfer — no es un escaneo completo. */
const TIMEOUT_BUFER_MS = 300;

function elementoEsCampoDeTexto(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return (el as HTMLElement).isContentEditable === true;
}

interface CargadorEscaneado {
  referencia: string;
  nombre: string;
  precio: number;
}

/**
 * Atajo global: escanear un código de barras (lector USB tipo "teclado",
 * LENVII) en CUALQUIER pantalla del dashboard actúa según lo que sea:
 *  - El código de una ETIQUETA DE RESGUARDO → salta directo al detalle de
 *    esa reparación.
 *  - El código de una ETIQUETA DE CARGADOR (Stock de Piezas, categoría
 *    "CARGADOR") → pregunta Ticket o Factura y abre el formulario con esa
 *    pieza ya añadida como línea. Petición del usuario, 2026-10-09.
 *
 * Los cargadores se comprueban PRIMERO (por referencia exacta conocida) —
 * solo si no coincide con ningún cargador se interpreta como resguardo.
 * No interfiere con la escritura normal: se ignora por completo mientras
 * el foco esté en un campo de texto/textarea/select, y además exige que
 * las teclas lleguen a velocidad de escaneo (no de una persona tecleando).
 */
export function EscanerCodigoBarras() {
  const router = useRouter();
  const buferRef = useRef("");
  const ultimaTeclaRef = useRef(0);
  const cargadoresRef = useRef<Map<string, CargadorEscaneado>>(new Map());

  // cargadorEscaneado se queda con los datos del último escaneo incluso
  // después de cerrar el selector Ticket/Factura — es lo que precarga el
  // formulario elegido, así que no se puede limpiar en el mismo clic que
  // lo abre (se perdería antes de que el diálogo lo lea).
  const [cargadorEscaneado, setCargadorEscaneado] = useState<CargadorEscaneado | null>(null);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [ticketAbierto, setTicketAbierto] = useState(false);
  const [facturaAbierta, setFacturaAbierta] = useState(false);

  useEffect(() => {
    fetch("/api/stock-piezas")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) return;
        const mapa = new Map<string, CargadorEscaneado>();
        for (const p of d.piezas as StockPieza[]) {
          if (p.categoria === "CARGADOR" && p.activo) {
            mapa.set(p.referencia, { referencia: p.referencia, nombre: p.descripcion || p.nombre, precio: p.precioCliente });
          }
        }
        cargadoresRef.current = mapa;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function alPulsarTecla(e: KeyboardEvent) {
      if (elementoEsCampoDeTexto(document.activeElement)) return;

      const ahora = Date.now();
      const transcurrido = ahora - ultimaTeclaRef.current;
      ultimaTeclaRef.current = ahora;

      if (e.key === "Enter") {
        const codigo = buferRef.current;
        buferRef.current = "";
        if (!codigo) return;

        const cargador = cargadoresRef.current.get(codigo);
        if (cargador) {
          e.preventDefault();
          setCargadorEscaneado(cargador);
          setSelectorAbierto(true);
          return;
        }

        if (/^\d{3,8}$/.test(codigo)) {
          e.preventDefault();
          router.push(`/reparaciones?resguardo=${codigo}`);
        }
        return;
      }

      if (transcurrido > TIMEOUT_BUFER_MS) buferRef.current = "";

      if (/^\d$/.test(e.key)) {
        // Primer dígito: siempre se acepta (no hay tecla anterior con la
        // que medir el ritmo). A partir del segundo, debe cumplir la
        // velocidad de escaneo o se reinicia el búfer con este dígito.
        if (buferRef.current.length > 0 && transcurrido > INTERVALO_MAX_ESCANEO_MS) {
          buferRef.current = e.key;
        } else {
          buferRef.current += e.key;
        }
      } else {
        buferRef.current = "";
      }
    }

    window.addEventListener("keydown", alPulsarTecla);
    return () => window.removeEventListener("keydown", alPulsarTecla);
  }, [router]);

  const lineaInicial = cargadorEscaneado
    ? { referencia: cargadorEscaneado.referencia, descripcion: cargadorEscaneado.nombre, precio: cargadorEscaneado.precio }
    : undefined;

  return (
    <>
      <Dialog open={selectorAbierto} onOpenChange={(o) => !o && setSelectorAbierto(false)}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Cargador escaneado</DialogTitle>
          <DialogDescription>
            {cargadorEscaneado?.nombre} — {(cargadorEscaneado?.precio ?? 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}.
            ¿Con qué documento se cobra?
          </DialogDescription>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                setSelectorAbierto(false);
                setTicketAbierto(true);
              }}
            >
              <Ticket className="size-4" /> Ticket Manual
            </Button>
            <Button
              className="gap-1.5"
              onClick={() => {
                setSelectorAbierto(false);
                setFacturaAbierta(true);
              }}
            >
              <Receipt className="size-4" /> Factura Manual
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TicketManualDialog
        open={ticketAbierto}
        onOpenChange={(o) => {
          setTicketAbierto(o);
          if (!o) setCargadorEscaneado(null);
        }}
        lineaInicial={lineaInicial}
      />
      <NuevaFacturaManualDialog
        open={facturaAbierta}
        onOpenChange={(o) => {
          setFacturaAbierta(o);
          if (!o) setCargadorEscaneado(null);
        }}
        onGenerada={() => {}}
        lineaInicial={lineaInicial}
      />
    </>
  );
}
