"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Copy } from "@/lib/icons";

export interface BorradorGoogle {
  descripcion: string;
  categoriaPrincipal: string;
  categoriasSecundarias: string[];
  servicios: { nombre: string; descripcion: string }[];
  publicaciones: { titulo: string; texto: string }[];
}
export interface BorradorArticulos {
  articulos: { titulo: string; plataforma: string; resumen: string; texto: string }[];
}

function copiar(texto: string) {
  navigator.clipboard.writeText(texto).then(() => toast.success("Copiado"), () => toast.error("No se pudo copiar"));
}

function Bloque({ titulo, texto, extra }: { titulo: string; texto: string; extra?: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{titulo}</p>
          {extra && <p className="text-xs text-muted-foreground">{extra}</p>}
        </div>
        <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => copiar(texto)}><Copy className="size-3.5" />Copiar</Button>
      </div>
      <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}

/** Textos listos para pegar: la ficha de Google Business Profile y artículos para LinkedIn, Medium o el blog propio. Los publica una persona (alta y verificación). */
export function PanelBorradores({ google, articulos }: { google?: BorradorGoogle; articulos?: BorradorArticulos }) {
  if (!google && !articulos) return null;
  return (
    <div className="space-y-4">
      {google && (
        <section className="overflow-hidden rounded-lg border bg-card">
          <div className="border-b bg-muted/30 px-4 py-2.5"><h3 className="text-sm font-semibold">Ficha de Google Business Profile (listo para pegar)</h3></div>
          <div className="space-y-2 p-4">
            <Bloque titulo="Descripción del negocio" extra={`${google.descripcion.length}/750 caracteres`} texto={google.descripcion} />
            <Bloque titulo="Categorías" extra="Principal y secundarias" texto={`Principal: ${google.categoriaPrincipal}\nSecundarias: ${google.categoriasSecundarias.join(", ")}`} />
            {google.servicios.map((s, i) => <Bloque key={i} titulo={`Servicio: ${s.nombre}`} texto={s.descripcion} />)}
            {google.publicaciones.map((pb, i) => <Bloque key={i} titulo={`Publicación semanal ${i + 1}: ${pb.titulo}`} extra={`${pb.texto.length} caracteres`} texto={pb.texto} />)}
          </div>
        </section>
      )}
      {articulos && (
        <section className="overflow-hidden rounded-lg border bg-card">
          <div className="border-b bg-muted/30 px-4 py-2.5"><h3 className="text-sm font-semibold">Artículos para publicar</h3></div>
          <div className="space-y-2 p-4">
            {articulos.articulos.map((a, i) => <Bloque key={i} titulo={a.titulo} extra={`${a.plataforma} · ${a.resumen}`} texto={a.texto} />)}
          </div>
        </section>
      )}
    </div>
  );
}
