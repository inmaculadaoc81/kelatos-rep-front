"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Segmento } from "@/lib/prospeccion";
import { ResumenVista } from "@/components/prospeccion/resumen-vista";
import { AgenteVista } from "@/components/prospeccion/agente-vista";
import { EnviosVista } from "@/components/prospeccion/envios-vista";
import { ClientesVista } from "@/components/prospeccion/clientes-vista";
import { BusquedaDiariaPanel } from "@/components/prospeccion/busqueda-diaria-panel";
import ProspeccionLeadsPage from "@/app/prospeccion/leads/page";
import ComoFuncionaProspeccionPage from "@/app/prospeccion/como-funciona/page";

/** Prospección de clientes (2026-11-02): ocupa el lugar de «Auditoría de seguridad» en Agentes. Dos partes SEPARADAS para que no se mezclen:
    · Clientes: clientes de Reparaciones que marcaron la casilla de promociones → correo cálido personalizado con su historial.
    · Empresas buscadas: negocios que encontramos con las APIs → análisis de su web y correo personalizado con automatizaciones o web. */
const PARTES: { id: Segmento; nombre: string; ayuda: string }[] = [
  { id: "clientes", nombre: "Clientes", ayuda: "Clientes de Reparaciones que aceptaron recibir promociones. Correo cálido, con su historial con nosotros." },
  { id: "empresas", nombre: "Empresas buscadas", ayuda: "Negocios que encontramos con las APIs. Se analiza su web y a qué se dedican para personalizar el correo." },
];

export default function AgentesProspeccionPage() {
  const [parte, setParte] = useState<Segmento>("clientes");
  const info = PARTES.find((p) => p.id === parte)!;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Prospección de clientes</h1>
        <p className="text-sm text-muted-foreground">La IA local redacta cada correo personalizado, con las automatizaciones o la web que encajan, y siempre con enlace de baja. Nada se envía sin tu aprobación.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border bg-card p-1">
          {PARTES.map((p) => (
            <button key={p.id} type="button" onClick={() => setParte(p.id)} className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${parte === p.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>
              {p.nombre}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{info.ayuda}</p>
      </div>

      <Tabs key={parte} defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="contactos">{parte === "clientes" ? "Clientes" : "Buscar empresas"}</TabsTrigger>
          <TabsTrigger value="agente">Agente</TabsTrigger>
          <TabsTrigger value="mensajes">Correos</TabsTrigger>
          {parte === "empresas" && <TabsTrigger value="como">Cómo funciona</TabsTrigger>}
        </TabsList>
        <TabsContent value="resumen" className="pt-4"><ResumenVista segmento={parte} /></TabsContent>
        <TabsContent value="contactos" className="pt-4">{parte === "clientes" ? <ClientesVista /> : <ProspeccionLeadsPage />}</TabsContent>
        <TabsContent value="agente" className="space-y-6 pt-4">{parte === "empresas" && <BusquedaDiariaPanel />}<AgenteVista segmento={parte} /></TabsContent>
        <TabsContent value="mensajes" className="pt-4"><EnviosVista segmento={parte} /></TabsContent>
        {parte === "empresas" && <TabsContent value="como" className="pt-4"><ComoFuncionaProspeccionPage /></TabsContent>}
      </Tabs>
    </div>
  );
}
