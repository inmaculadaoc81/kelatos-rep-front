"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Filter } from "@/lib/icons"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/**
 * Filtros por cabecera AUTOMÁTICOS (2026-10-30): todas las tablas que usan este componente muestran un embudo en el encabezado de cada columna
 * con la lista de valores de esa columna (como en Excel); varias columnas se combinan. El filtro actúa sobre las FILAS QUE LA TABLA TIENE
 * PINTADAS (si la vista pagina, solo la página visible). Se salta solo:
 *   · tablas con `filtros={false}` y tablas dentro de un diálogo/panel,
 *   · columnas cuyo encabezado ya trae su propio filtro/botón/selector (las vistas que ya lo tenían siguen igual),
 *   · columnas sin título, de acciones/ver/opciones o con casilla de selección, y `<TableHead sinFiltro>`.
 */
type Filtros = Record<number, Set<string>>

interface CtxFiltros {
  habilitado: boolean
  filtros: Filtros
  nFilas: number
  tabla: React.RefObject<HTMLTableElement | null>
  setFiltro: (col: number, valores: Set<string> | null) => void
}
const FiltrosCtx = React.createContext<CtxFiltros | null>(null)

const VACIO = "(vacío)"
function valorDeCelda(td: Element): string {
  const el = td as HTMLElement
  const t = (el.innerText ?? el.textContent ?? "").split("\n").map((s) => s.trim()).find(Boolean) ?? ""
  const limpio = t.replace(/\s+/g, " ").slice(0, 80)
  return limpio || VACIO
}
function filasDatos(tabla: HTMLTableElement | null): HTMLTableRowElement[] {
  if (!tabla) return []
  const out: HTMLTableRowElement[] = []
  for (const tb of Array.from(tabla.tBodies)) {
    for (const tr of Array.from(tb.rows)) {
      if (Array.from(tr.cells).some((c) => c.colSpan > 1 && tr.cells.length === 1)) continue // fila de «sin resultados» / cargando
      out.push(tr)
    }
  }
  return out
}
function celda(tr: HTMLTableRowElement, col: number): Element | undefined {
  return tr.cells[col]
}

function Table({ className, filtros: filtrosActivos = true, ...props }: React.ComponentProps<"table"> & { filtros?: boolean }) {
  const ref = React.useRef<HTMLTableElement>(null)
  const [filtros, setFiltros] = React.useState<Filtros>({})
  const [nFilas, setNFilas] = React.useState(0)
  const [habilitado, setHabilitado] = React.useState(false)

  // ¿tabla dentro de un diálogo/panel? entonces sin filtros
  React.useEffect(() => {
    const t = ref.current
    setHabilitado(filtrosActivos && !!t && !t.closest('[role="dialog"],[data-slot="dialog-content"],[data-slot="sheet-content"],[data-slot="drawer-content"]'))
  }, [filtrosActivos])

  const setFiltro = React.useCallback((col: number, valores: Set<string> | null) => {
    setFiltros((prev) => {
      const sig = { ...prev }
      if (!valores || valores.size === 0) delete sig[col]
      else sig[col] = valores
      return sig
    })
  }, [])

  // Aplica los filtros a las filas pintadas (se repite cuando React vuelve a pintar filas)
  const aplicar = React.useCallback(() => {
    const t = ref.current
    if (!t) return
    const filas = filasDatos(t)
    const cols = Object.keys(filtros).map(Number)
    for (const tr of filas) {
      let visible = true
      for (const c of cols) {
        const td = celda(tr, c)
        if (td && !filtros[c].has(valorDeCelda(td))) { visible = false; break }
      }
      if (!visible) { if (tr.style.display !== "none") { tr.style.display = "none"; tr.dataset.filtradoPorCabecera = "1" } }
      else if (tr.dataset.filtradoPorCabecera === "1") { tr.style.display = ""; delete tr.dataset.filtradoPorCabecera }
    }
    setNFilas((n) => (n === filas.length ? n : filas.length))
  }, [filtros])

  React.useLayoutEffect(() => { aplicar() })
  React.useEffect(() => {
    const t = ref.current
    if (!t) return
    const obs = new MutationObserver(() => aplicar())
    for (const tb of Array.from(t.tBodies)) obs.observe(tb, { childList: true, subtree: true, characterData: true })
    return () => obs.disconnect()
  }, [aplicar])

  const ctx = React.useMemo<CtxFiltros>(() => ({ habilitado, filtros, nFilas, tabla: ref, setFiltro }), [habilitado, filtros, nFilas, setFiltro])

  return (
    <FiltrosCtx.Provider value={ctx}>
      <div
        data-slot="table-container"
        className="relative w-full overflow-x-auto"
      >
        <table
          ref={ref}
          data-slot="table"
          className={cn("w-full caption-bottom text-sm", className)}
          {...props}
        />
      </div>
    </FiltrosCtx.Provider>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

const TITULOS_SIN_FILTRO = /^(acciones?|ver|opciones|editar|eliminar|detalle|#|\s*)$/i

/** Embudo + lista de valores de una columna (estilo Excel). */
function FiltroColumna({ col, titulo }: { col: number; titulo: string }) {
  const ctx = React.useContext(FiltrosCtx)!
  const [busca, setBusca] = React.useState("")
  const [abierto, setAbierto] = React.useState(false)
  const activo = !!ctx.filtros[col]

  // Valores de la columna entre las filas que cumplen los DEMÁS filtros (en cascada)
  const valores = React.useMemo(() => {
    if (!abierto) return [] as string[]
    const otras = Object.keys(ctx.filtros).map(Number).filter((c) => c !== col)
    const set = new Set<string>()
    for (const tr of filasDatos(ctx.tabla.current)) {
      if (otras.some((c) => { const td = celda(tr, c); return td && !ctx.filtros[c].has(valorDeCelda(td)) })) continue
      const td = celda(tr, col)
      if (td) set.add(valorDeCelda(td))
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es", { numeric: true }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, ctx.filtros, col, ctx.nFilas])

  const seleccion = ctx.filtros[col]
  const visibles = busca.trim() ? valores.filter((v) => v.toLowerCase().includes(busca.trim().toLowerCase())) : valores

  function alternar(v: string) {
    const base = new Set(seleccion ?? valores)
    if (base.has(v)) base.delete(v)
    else base.add(v)
    // si quedan todos marcados, equivale a «sin filtro»
    ctx.setFiltro(col, base.size === valores.length ? null : base.size === 0 ? new Set([""]) : base)
  }

  return (
    <span data-filtro-cabecera className="ml-1 inline-flex align-middle" onClick={(e) => e.stopPropagation()}>
      <Popover open={abierto} onOpenChange={(o) => { setAbierto(o); if (!o) setBusca("") }}>
        <PopoverTrigger render={<button type="button" className="inline-flex" />}>
          <span
            title={`Filtrar por ${titulo.toLowerCase()}`}
            className={`inline-flex size-5 items-center justify-center rounded ${activo ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
          >
            <Filter className="size-3" />
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 space-y-2 p-2">
          <p className="text-xs font-medium text-muted-foreground">{titulo}</p>
          {valores.length > 8 && <Input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar…" className="h-8" />}
          <div className="max-h-56 space-y-0.5 overflow-y-auto">
            {visibles.map((v) => (
              <label key={v} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent">
                <Checkbox checked={seleccion ? seleccion.has(v) : true} onCheckedChange={() => alternar(v)} />
                <span className="truncate" title={v}>{v}</span>
              </label>
            ))}
            {visibles.length === 0 && <p className="px-1 py-2 text-xs text-muted-foreground">Sin valores</p>}
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" className="h-7 px-2" disabled={!activo} onClick={() => ctx.setFiltro(col, null)}>Quitar filtro</Button>
            <span className="text-[10px] text-muted-foreground">Filtra las filas que se ven en la tabla</span>
          </div>
        </PopoverContent>
      </Popover>
    </span>
  )
}

function TableHead({ className, children, sinFiltro, ref: refExterno, ...props }: React.ComponentProps<"th"> & { sinFiltro?: boolean }) {
  const ctx = React.useContext(FiltrosCtx)
  const interno = React.useRef<HTMLTableCellElement | null>(null)
  const [info, setInfo] = React.useState<{ col: number; titulo: string } | null>(null)

  const fijarRef = React.useCallback((el: HTMLTableCellElement | null) => {
    interno.current = el
    if (typeof refExterno === "function") refExterno(el)
    else if (refExterno) (refExterno as React.RefObject<HTMLTableCellElement | null>).current = el
  }, [refExterno])

  // Decide si esta columna lleva filtro automático (mira el DOM ya pintado)
  React.useEffect(() => {
    const th = interno.current
    if (!th || !ctx?.habilitado || sinFiltro) { setInfo(null); return }
    const dentroDeThead = !!th.closest("thead")
    const titulo = (th.innerText ?? "").replace(/\s+/g, " ").trim()
    // ¿ya trae su propio filtro/botón/selector/icono? (se ignora el nuestro)
    const propios = Array.from(th.querySelectorAll("button,select,input,[role=combobox],[role=checkbox]")).filter((e) => !e.closest("[data-filtro-cabecera]"))
    const ultimaFila = th.parentElement === th.closest("thead")?.lastElementChild
    if (!dentroDeThead || !ultimaFila || !titulo || TITULOS_SIN_FILTRO.test(titulo) || propios.length > 0 || th.colSpan > 1) { setInfo(null); return }
    const col = th.cellIndex
    setInfo((prev) => (prev && prev.col === col && prev.titulo === titulo ? prev : { col, titulo }))
  })

  const mostrar = !!(ctx?.habilitado && info && ctx.nFilas >= 2)
  return (
    <th
      ref={fijarRef}
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    >
      {children}
      {mostrar && info && <FiltroColumna col={info.col} titulo={info.titulo} />}
    </th>
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
