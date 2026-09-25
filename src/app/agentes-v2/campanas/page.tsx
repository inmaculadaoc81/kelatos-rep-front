"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useV2 } from "@/components/agentes-v2/use-v2";
import { Cabecera, CargandoFilas, ErrorCaja, Vacio } from "@/components/agentes-v2/componentes";
import { fechaHora, usd } from "@/lib/agentes-v2";

interface Campana {
  id: string;
  slug: string;
  name: string;
  goal_text: string;
  status: string;
  target_leads: number | null;
  created_at: string;
  agent_budget_usd: number;
  agent_cost_usd: number;
  ad_spend: number;
}

/** Campañas existentes (agentes.campaigns). El coste de IA y la inversión en anuncios se muestran en columnas
    separadas: son conceptos distintos. */
export default function CampanasPage() {
  const { datos, error, cargando } = useV2<{ ok: boolean; campaigns: Campana[] }>("campaigns");
  return (
    <div>
      <Cabecera titulo="Campañas" descripcion="Las campañas de captación ya existentes. Aquí verás también las de los demás departamentos cuando existan." />
      {error && <ErrorCaja mensaje={error} />}
      {cargando && !datos ? (
        <CargandoFilas />
      ) : datos && datos.campaigns.length === 0 ? (
        <Vacio titulo="Sin campañas" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaña</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creada</TableHead>
                <TableHead className="text-right">Coste de IA</TableHead>
                <TableHead className="text-right">Inversión en anuncios</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datos?.campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="max-w-96">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.goal_text}</p>
                  </TableCell>
                  <TableCell className="text-sm">{c.status}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm tabular-nums">{fechaHora(c.created_at)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{usd(c.agent_cost_usd)} <span className="text-muted-foreground">/ {usd(c.agent_budget_usd)}</span></TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{c.ad_spend.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
