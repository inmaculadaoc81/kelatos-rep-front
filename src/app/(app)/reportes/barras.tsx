"use client";

/**
 * Barras horizontales de una sola serie (magnitud). Sin leyenda: el título
 * de la tarjeta nombra la serie. Cada barra lleva su valor visible al lado
 * — es la "relief rule" que exige el verde de dinero, por debajo de 3:1
 * sobre la superficie clara.
 *
 * Marcas: pista recesiva, extremo de dato redondeado 4px anclado a la
 * base (izquierda), separación entre barras > 2px vía space-y.
 */

export interface FilaBarra {
  clave: string;
  etiqueta: string;
  valor: number;
  /** Texto mostrado a la derecha; si se omite, se usa el valor. */
  valorTexto?: string;
  /** Anotación secundaria opcional (p. ej. desglose R/V). */
  nota?: string;
  /** Resalta la fila (mes en curso). */
  destacada?: boolean;
}

export function Barras({
  filas,
  color,
  anchoEtiqueta = "w-20",
  anchoValor = "w-20",
  maxAltura = "max-h-72",
  vacio = "Sin datos",
  medallas = false,
}: {
  filas: FilaBarra[];
  /** 'count' (azul) o 'money' (verde) — el tono codifica qué mide la barra. */
  color: "count" | "money";
  anchoEtiqueta?: string;
  anchoValor?: string;
  maxAltura?: string;
  vacio?: string;
  medallas?: boolean;
}) {
  if (!filas.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{vacio}</p>;
  }

  const max = Math.max(...filas.map((f) => f.valor), 1);
  const tono = color === "money" ? "var(--chart-money)" : "var(--chart-count)";

  return (
    <div className={`${maxAltura} space-y-1.5 overflow-y-auto pr-1`}>
      {filas.map((f, i) => {
        const pct = Math.max(1, Math.round((f.valor / max) * 100));
        return (
          <div key={f.clave} className="flex items-center gap-2 text-xs">
            {medallas && (
              <span className="w-5 shrink-0 text-center text-[0.7rem] text-muted-foreground">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
              </span>
            )}
            <span
              className={`${anchoEtiqueta} shrink-0 truncate text-right ${f.destacada ? "font-semibold text-foreground" : "text-muted-foreground"}`}
              title={f.etiqueta}
            >
              {f.etiqueta}
            </span>
            <div className="h-3.5 flex-1 rounded-sm bg-muted">
              <div
                className="h-3.5 rounded-r-[4px]"
                style={{ width: `${pct}%`, backgroundColor: tono, opacity: f.destacada ? 1 : 0.75 }}
              />
            </div>
            {f.nota && <span className="shrink-0 text-[0.7rem] text-muted-foreground">{f.nota}</span>}
            <span className={`${anchoValor} shrink-0 text-right font-medium tabular-nums text-foreground`}>
              {f.valorTexto ?? f.valor}
            </span>
          </div>
        );
      })}
    </div>
  );
}
