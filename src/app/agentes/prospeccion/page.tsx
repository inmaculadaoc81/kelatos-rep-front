"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ResumenProspeccionPage from "@/app/prospeccion/page";
import ProspeccionLeadsPage from "@/app/prospeccion/leads/page";
import ProspeccionAgentePage from "@/app/prospeccion/agente/page";
import ProspeccionEnviosPage from "@/app/prospeccion/envios/page";
import ComoFuncionaProspeccionPage from "@/app/prospeccion/como-funciona/page";

/** Agente de prospección (2026-11-02): ocupa el lugar que tenía «Auditoría de seguridad» en Agentes. Busca negocios, analiza su web y a qué se dedican,
    y la IA local redacta un correo PERSONALIZADO con posibles automatizaciones o una web, con enlace de baja. Reutiliza las pantallas del módulo /prospeccion. */
export default function AgentesProspeccionPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Prospección de clientes</h1>
        <p className="text-sm text-muted-foreground">
          Encuentra negocios, analiza su web y a qué se dedican, y la IA local redacta un correo personalizado con las automatizaciones o la web que les encajan. Nada se envía sin tu aprobación; cada correo lleva su enlace de baja.
        </p>
      </div>
      <Tabs defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="prospectos">Prospectos</TabsTrigger>
          <TabsTrigger value="agente">Agente</TabsTrigger>
          <TabsTrigger value="mensajes">Correos</TabsTrigger>
          <TabsTrigger value="como">Cómo funciona</TabsTrigger>
        </TabsList>
        <TabsContent value="resumen" className="pt-4"><ResumenProspeccionPage /></TabsContent>
        <TabsContent value="prospectos" className="pt-4"><ProspeccionLeadsPage /></TabsContent>
        <TabsContent value="agente" className="pt-4"><ProspeccionAgentePage /></TabsContent>
        <TabsContent value="mensajes" className="pt-4"><ProspeccionEnviosPage /></TabsContent>
        <TabsContent value="como" className="pt-4"><ComoFuncionaProspeccionPage /></TabsContent>
      </Tabs>
    </div>
  );
}
