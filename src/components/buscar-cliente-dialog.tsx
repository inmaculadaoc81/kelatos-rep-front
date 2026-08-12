"use client";

import { useEffect, useState } from "react";
import { SearchNormal1, UserAdd, Edit2, Call, Sms, Location } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Cliente } from "@/lib/clientes";
import { ClienteFormDialog } from "@/app/(app)/clientes/cliente-form-dialog";

function FilaEsqueleto() {
  return (
    <tr className="border-t">
      <td className="p-2"><div className="h-4 w-12 animate-pulse rounded bg-muted" /></td>
      <td className="p-2"><div className="h-4 w-32 animate-pulse rounded bg-muted" /></td>
      <td className="p-2"><div className="h-4 w-24 animate-pulse rounded bg-muted" /></td>
      <td className="p-2"><div className="h-4 w-24 animate-pulse rounded bg-muted" /></td>
      <td className="w-8 p-2" />
    </tr>
  );
}

/**
 * Reproduce el modal #modalBuscarCliente (abrirBuscarCliente/_bcFiltrar/
 * _bcSeleccionar/_bcAbrirEditar/_bcToggleNuevo) del original — reutilizado
 * por la Facturación de reparaciones y por Nuevo Alquiler (el original
 * comparte el mismo modal entre "vf" y "alq" vía _bcModo; aquí cada
 * llamador solo necesita pasar su propio onSeleccionar). Búsqueda en vivo
 * sobre el directorio de clientes, con edición inline (lápiz por fila) y
 * alta de cliente nuevo desde el pie, reutilizando el mismo
 * ClienteFormDialog ya construido para la pantalla de Clientes.
 */
export function BuscarClienteDialog({
  open,
  onOpenChange,
  onSeleccionar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSeleccionar: (cliente: Cliente) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(false);
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);

  useEffect(() => {
    if (!open) setBusqueda("");
  }, [open]);

  function buscar() {
    const q = busqueda.trim();
    setCargando(true);
    return fetch(`/api/clientes${q ? `?buscar=${encodeURIComponent(q)}` : ""}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setClientes(d.clientes); })
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(buscar, busqueda.trim() ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busqueda]);

  function seleccionar(c: Cliente) {
    onSeleccionar(c);
    onOpenChange(false);
  }

  function clienteCreado(c: Cliente) {
    seleccionar(c);
  }

  function clienteEditado(c: Cliente) {
    setClientes((prev) => prev.map((x) => (x.codigo === c.codigo ? c : x)));
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-3 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Buscar cliente
              {!cargando && <span className="text-xs font-normal text-muted-foreground">({clientes.length})</span>}
            </DialogTitle>
          </DialogHeader>

          <div className="relative">
            <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre, código, DNI, teléfono…" className="pl-8" autoFocus />
          </div>

          <div className="flex-1 overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/70 text-left text-xs text-muted-foreground backdrop-blur-sm">
                <tr>
                  <th className="w-16 p-2">Código</th>
                  <th className="p-2">Nombre</th>
                  <th className="p-2">DNI / CIF</th>
                  <th className="p-2">Contacto</th>
                  <th className="w-8 p-2" />
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <>
                    <FilaEsqueleto /><FilaEsqueleto /><FilaEsqueleto />
                  </>
                ) : clientes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                      Sin resultados{busqueda.trim() && <> para “{busqueda.trim()}”</>}.
                      <Button size="sm" variant="link" className="ml-1 h-auto p-0" onClick={() => setNuevoAbierto(true)}>
                        Crear cliente nuevo
                      </Button>
                    </td>
                  </tr>
                ) : (
                  clientes.map((c) => (
                    <tr key={c.codigo} className="group cursor-pointer border-t hover:bg-muted/50" onClick={() => seleccionar(c)}>
                      <td className="p-2 align-top"><span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">{c.codigo}</span></td>
                      <td className="p-2 align-top font-medium">{c.nombre || "-"}</td>
                      <td className="p-2 align-top text-muted-foreground">{c.dniCif || "-"}</td>
                      <td className="p-2 align-top text-xs text-muted-foreground">
                        {c.telefono && <p className="flex items-center gap-1"><Call className="size-3 shrink-0" /> {c.telefono}</p>}
                        {c.email && <p className="flex items-center gap-1 truncate"><Sms className="size-3 shrink-0" /> {c.email}</p>}
                        {c.direccion && <p className="flex items-center gap-1 truncate"><Location className="size-3 shrink-0" /> {c.direccion}</p>}
                      </td>
                      <td className="p-2 align-top text-right">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100"
                          title="Editar cliente"
                          onClick={(e) => { e.stopPropagation(); setEditando(c); }}
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <footer className="flex items-center justify-between border-t pt-3">
            <p className="text-xs text-muted-foreground">Haz clic en una fila para seleccionar el cliente.</p>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setNuevoAbierto(true)}>
              <UserAdd className="size-3.5" /> Nuevo cliente
            </Button>
          </footer>
        </DialogContent>
      </Dialog>

      <ClienteFormDialog clienteExistente={null} open={nuevoAbierto} onOpenChange={setNuevoAbierto} onGuardado={clienteCreado} />
      <ClienteFormDialog clienteExistente={editando} open={editando !== null} onOpenChange={(o) => !o && setEditando(null)} onGuardado={clienteEditado} />
    </>
  );
}
