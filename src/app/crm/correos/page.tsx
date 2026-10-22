"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabResumen } from "./tab-resumen";
import { TabContactos } from "./tab-contactos";
import { TabTipos } from "./tab-tipos";
import { TabCampanas } from "./tab-campanas";
import { TabMetricas } from "./tab-metricas";

/** CRM · Envío de correos (campañas). SOLO ESTRUCTURA: contactos, tipos, programación y métricas; los envíos están desactivados. */
export default function CorreosPage() {
  const [pestana, setPestana] = useState("resumen");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">CRM · Envío de correos</h1>
        <p className="text-sm text-muted-foreground">Prepara las campañas para enviar promociones y seguimientos a tus contactos: a quién, qué mensaje y cuándo.</p>
      </div>
      <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <span aria-hidden>⏸</span>
        <p><strong>Envíos desactivados.</strong> Esta pantalla es la estructura: puedes preparar tipos de correo y programar campañas, pero no se envía nada hasta que se active el envío automático.</p>
      </div>
      <Tabs value={pestana} onValueChange={(v) => setPestana(String(v))}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="contactos">Contactos</TabsTrigger>
          <TabsTrigger value="tipos">Tipos de correo</TabsTrigger>
          <TabsTrigger value="campanas">Programar envíos</TabsTrigger>
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
        </TabsList>
        <TabsContent value="resumen"><TabResumen irA={setPestana} /></TabsContent>
        <TabsContent value="contactos"><TabContactos /></TabsContent>
        <TabsContent value="tipos"><TabTipos /></TabsContent>
        <TabsContent value="campanas"><TabCampanas /></TabsContent>
        <TabsContent value="metricas"><TabMetricas /></TabsContent>
      </Tabs>
    </div>
  );
}
