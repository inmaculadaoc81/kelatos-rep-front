"use client";

import { useV2 } from "@/components/agentes-v2/use-v2";
import { Cabecera, CargandoFilas, ErrorCaja, Kpi } from "@/components/agentes-v2/componentes";

interface ConfigLlm {
  ok: boolean;
  provider: string;
  host: string;
  privateApi: boolean;
  models: { cheap: string | null; deep: string | null };
  hasApiKey: boolean;
}

/** Modelos de IA: muestra la configuración que YA usa el módulo de agentes (API privada compatible con OpenAI).
    Solo lectura y sin claves; cambiar de proveedor no afecta a los agentes. */
export default function ModelosIaPage() {
  const { datos, error, cargando } = useV2<ConfigLlm>("llm-config");
  return (
    <div>
      <Cabecera titulo="Modelos IA" descripcion="El modelo de lenguaje que usan los departamentos. Es la misma API que ya utiliza la plataforma de agentes: no hay una segunda configuración." />
      {error && <ErrorCaja mensaje={error} />}
      {cargando && !datos ? (
        <CargandoFilas n={2} />
      ) : datos ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi titulo="Servidor" valor={datos.host || "—"} sub={datos.privateApi ? "API privada / local" : "Proveedor en la nube"} />
            <Kpi titulo="Protocolo" valor="Compatible con OpenAI" sub="cambiable sin tocar los agentes" />
            <Kpi titulo="Modelo económico" valor={datos.models.cheap ?? "—"} sub="tareas simples" />
            <Kpi titulo="Modelo profundo" valor={datos.models.deep ?? "—"} sub="tareas complejas" />
          </div>
          <p className="text-sm text-muted-foreground">
            Clave de acceso: {datos.hasApiKey ? "configurada en el servidor" : "no configurada"}. El enrutado por etapa y el control de presupuesto que ya existen siguen aplicándose.
          </p>
        </>
      ) : null}
    </div>
  );
}
